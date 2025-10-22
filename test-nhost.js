const { NhostClient } = require('@nhost/nextjs')

const nhost = new NhostClient({
  subdomain: 'ljcgzewqehzubitfwhhi',
  region: 'sa-east-1',
})

async function test() {
  console.log('Testando login...')
  const result = await nhost.auth.signIn({
    email: 'admin@rental.com',
    password: 'Admin123!@#'
  })
  console.log('Resultado:', result)
}

test()