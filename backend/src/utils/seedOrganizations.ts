/**
 * seedOrganizations — called once at startup.
 * Creates the two academy organizations if they don't already exist.
 * Never overwrites existing orgs (safe to call on every boot).
 */
import { OrganizationModel } from '@/models/schema.ts'
import { logger } from '@/utils/logger.ts'

const ORGS = [
  {
    name:           'Dubai Academy',
    slug:           'dubai',
    currency:       'AED',
    paymentGateway: 'abzer',
    countryFilter:  null,      // catch-all — everyone except India
  },
  {
    name:           'Bangalore Academy',
    slug:           'bangalore',
    currency:       'INR',
    paymentGateway: 'razorpay',
    countryFilter:  'India',   // only residents of India
  },
] as const

export async function seedOrganizations(): Promise<void> {
  for (const org of ORGS) {
    const existing = await OrganizationModel.findOne({ slug: org.slug })
    if (!existing) {
      await OrganizationModel.create(org)
      logger.info(`✅  Created organization: ${org.name}`)
    }
  }
}
