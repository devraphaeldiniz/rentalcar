'use server'

type RateLimitResult = {
  allowed: boolean
  remaining: number
  resetAt: Date
}

export async function checkRateLimit(
  identifier: string,
  maxAttempts: number = 5,
  windowMinutes: number = 15
): Promise<RateLimitResult> {
  try {
    const url = `https://${process.env.NEXT_PUBLIC_NHOST_SUBDOMAIN}.graphql.${process.env.NEXT_PUBLIC_NHOST_REGION}.nhost.run/v1`

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-hasura-admin-secret': process.env.NHOST_ADMIN_SECRET!,
      },
      body: JSON.stringify({
        query: `
          query CheckRateLimit($email: String!, $timeWindow: timestamptz!) {
            login_attempts_aggregate(
              where: {
                email: { _eq: $email }
                success: { _eq: false }
                created_at: { _gte: $timeWindow }
              }
            ) {
              aggregate {
                count
              }
            }
          }
        `,
        variables: {
          email: identifier,
          timeWindow: new Date(Date.now() - windowMinutes * 60 * 1000).toISOString()
        }
      }),
    })

    const result = await response.json()
    const attempts = result.data?.login_attempts_aggregate?.aggregate?.count || 0
    const remaining = Math.max(0, maxAttempts - attempts)
    const resetAt = new Date(Date.now() + windowMinutes * 60 * 1000)

    return {
      allowed: attempts < maxAttempts,
      remaining,
      resetAt
    }
  } catch (error) {
    console.error('Rate limit check failed:', error)
    return { allowed: true, remaining: maxAttempts, resetAt: new Date() }
  }
}

export async function recordLoginAttempt(
  email: string,
  ipAddress: string,
  success: boolean,
  failureReason?: string
) {
  const url = `https://${process.env.NEXT_PUBLIC_NHOST_SUBDOMAIN}.graphql.${process.env.NEXT_PUBLIC_NHOST_REGION}.nhost.run/v1`

  await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-hasura-admin-secret': process.env.NHOST_ADMIN_SECRET!,
    },
    body: JSON.stringify({
      query: `
        mutation RecordLoginAttempt($object: login_attempts_insert_input!) {
          insert_login_attempts_one(object: $object) {
            id
          }
        }
      `,
      variables: {
        object: {
          email,
          ip_address: ipAddress,
          success,
          failure_reason: failureReason
        }
      }
    }),
  })
}