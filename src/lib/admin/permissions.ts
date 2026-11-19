export const STAFF_PERMISSIONS = [
  'users.read',
  'users.read_contact_information',
  'users.read_scan_metadata',
  'users.read_skin_profile',
  'users.revoke_sessions',
  'users.request_suspension',
  'users.approve_suspension',
  'economy.read',
  'economy.reconcile',
  'economy.adjust',
  'moderation.read',
  'moderation.resolve',
  'atelier.read',
  'atelier.write',
  'atelier.orders_write',
  'atelier.inventory_write',
  'support.read',
  'support.reply',
  'support.close',
  'staff.read',
  'staff.manage',
  'audit.read',
  'boutique.items.read',
  'boutique.items.create',
  'boutique.items.edit',
  'boutique.items.publish',
  'boutique.items.pause',
  'boutique.items.retire',
  'boutique.prices.manage',
  'boutique.assets.manage',
  'boutique.collections.manage',
  'boutique.entitlements.read',
  'boutique.entitlements.grant',
  'boutique.entitlements.revoke',
  'boutique.refunds.request',
  'boutique.refunds.approve',
  'boutique.effects.inspect',
  'boutique.effects.disable',
  'boutique.analytics.read',
] as const;

export type StaffPermission = (typeof STAFF_PERMISSIONS)[number];

export const DEFAULT_ROLE_DEFINITIONS: Array<{
  slug: string;
  name: string;
  description: string;
  permissions: StaffPermission[];
}> = [
  {
    slug: 'super_admin',
    name: 'Super Administrator',
    description: 'Full Control Centre access across all domains and staff governance.',
    permissions: [...STAFF_PERMISSIONS],
  },
  {
    slug: 'support_agent',
    name: 'Support Agent',
    description: 'Tier-1 customer support, order lookup, and session revocation without destructive account or financial powers.',
    permissions: [
      'users.read',
      'users.revoke_sessions',
      'users.request_suspension',
      'atelier.read',
      'support.read',
      'support.reply',
    ],
  },
  {
    slug: 'moderator',
    name: 'Trust & Safety Moderator',
    description: 'Abuse flag triage, Arena dispute review, and suspension approval.',
    permissions: [
      'users.read',
      'users.read_scan_metadata',
      'users.revoke_sessions',
      'users.approve_suspension',
      'moderation.read',
      'moderation.resolve',
      'audit.read',
    ],
  },
  {
    slug: 'finance_ops',
    name: 'Finance & Economy Ops',
    description: 'Ledger reconciliation, points economy monitoring, and payment/order oversight.',
    permissions: [
      'users.read',
      'economy.read',
      'economy.reconcile',
      'economy.adjust',
      'atelier.read',
      'audit.read',
    ],
  },
  {
    slug: 'atelier_ops',
    name: 'Atelier Merchandising & Fulfilment',
    description: 'Catalogue management, inventory stock adjustments, and order fulfilment.',
    permissions: [
      'atelier.read',
      'atelier.write',
      'atelier.orders_write',
      'atelier.inventory_write',
      'support.read',
    ],
  },
];

export function hasPermission(permissions: readonly string[], required: StaffPermission): boolean {
  return permissions.includes(required);
}
