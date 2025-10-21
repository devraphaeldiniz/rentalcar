'use server'

type AuditAction = 
  | 'user.login'
  | 'user.logout'
  | 'user.register'
  | 'user.password_reset'
  | 'user.2fa_enabled'
  | 'user.2fa_disabled'
  | 'booking.created'
  | 'booking.updated'
  | 'booking.cancelled'
  | 'vehicle.created'
  | 'vehicle.updated'
  | 'vehicle.deleted'
  | 'admin.access'

type AuditLogInput = {
  userId?: string
  action: AuditAction
  resource?: string
  resourceId?: string
  ipAddress?: string
  userAgent?: string
  metadata?: Record<string, any>
}

export async function createAuditLog(input: AuditLogInput) {
  try {
    const url = `https://${process.env.NEXT_PUBLIC_NHOST_SUBDOMAIN}.graphql.${process.env.NEXT_PUBLIC_NHOST_REGION}.nhost.run/v1`

    await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-hasura-admin-secret': process.env.NHOST_ADMIN_SECRET!,
      },
      body: JSON.stringify({
        query: `
          mutation InsertAuditLog($object: audit_logs_insert_input!) {
            insert_audit_logs_one(object: $object) {
              id
            }
          }
        `,
        variables: {
          object: {
            user_id: input.userId,
            action: input.action,
            resource: input.resource,
            resource_id: input.resourceId,
            ip_address: input.ipAddress,
            user_agent: input.userAgent,
            metadata: input.metadata,
          }
        }
      }),
    })
  } catch (error) {
    console.error('Failed to create audit log:', error)
  }
}

export async function getAuditLogs(userId?: string, limit = 50) {
  const url = `https://${process.env.NEXT_PUBLIC_NHOST_SUBDOMAIN}.graphql.${process.env.NEXT_PUBLIC_NHOST_REGION}.nhost.run/v1`

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-hasura-admin-secret': process.env.NHOST_ADMIN_SECRET!,
    },
    body: JSON.stringify({
      query: `
        query GetAuditLogs($userId: uuid, $limit: Int!) {
          audit_logs(
            where: { user_id: { _eq: $userId } }
            order_by: { created_at: desc }
            limit: $limit
          ) {
            id
            action
            resource
            resource_id
            ip_address
            user_agent
            metadata
            created_at
          }
        }
      `,
      variables: { userId, limit }
    }),
  })

  const result = await response.json()
  return result.data?.audit_logs || []
}