import type { Request } from 'express'
import { Types } from 'mongoose'

/** Returns a MongoDB `{ organizationId }` filter for the current admin caller.
 *  super_admin with no X-Organization-Id header → {} (sees all orgs)
 *  super_admin with header / any other role → filters to their org.
 */
export function orgFilter(req: Request): Record<string, unknown> {
  const orgId = req.user?.organizationId
  if (!orgId || !Types.ObjectId.isValid(orgId)) return {}
  return { organizationId: new Types.ObjectId(orgId) }
}

/** Returns the organizationId string from req.user, or undefined. */
export function getOrgId(req: Request): string | undefined {
  return req.user?.organizationId
}
