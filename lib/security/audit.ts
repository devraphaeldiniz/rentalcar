import { adminGraphql } from '@/lib/auth/authorization'

// Módulo só de servidor, sem a diretiva de server action: não vira função
// chamável pelo navegador, e não há rota pública que grave logs.

type AuditAction =
  | 'user.login'
  | 'user.logout'
  | 'user.register'
  | 'user.password_reset'
  | 'profile.updated'
  | 'booking.created'
  | 'booking.updated'
  | 'booking.cancelled'
  | 'vehicle.created'
  | 'vehicle.updated'
  | 'vehicle.deleted'
  | 'admin.access'
  | 'pricing.updated'

type AuditLogInput = {
  userId?: string
  action: AuditAction
  resource?: string
  resourceId?: string
  ipAddress?: string
  userAgent?: string
  metadata?: Record<string, unknown>
}

/** Grava um registro de auditoria. Nunca lança: a ação principal não pode falhar por causa do log. */
export async function createAuditLog(input: AuditLogInput) {
  try {
    await adminGraphql('mutation InsertAuditLog($object: audit_logs_insert_input!) { insert_audit_logs_one(object: $object) { id } }', {
      object: {
        user_id: input.userId,
        action: input.action,
        resource: input.resource,
        resource_id: input.resourceId,
        ip_address: input.ipAddress,
        user_agent: input.userAgent,
        metadata: input.metadata,
      },
    })
  } catch (error) {
    console.error('[audit] não foi possível gravar o registro:', error)
  }
}
