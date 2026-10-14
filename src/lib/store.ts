import { Tier, Band, FaceCardData, CategoryBreakdown } from '@/types';
import { FundingLedgerItem, SpendLedgerItem } from '@/app/api/points/route';

export interface UserStore {
  id: string;
  email: string;
  displayName: string;
  handle: string;
  avatar: string;
  dob?: string;
  dobFormatted?: string;
  location?: string;
  bio?: string;
  memberSince?: string;
  tier: Tier;
  lifetimePoints: number;
  spendableBalance: number;
  streakDays: number;
  streakMultiplier: number;
  streakFreezesHeld: number;
  biometricVerified: boolean;
  score: number;
  band: Band;
  title: string;
  breakdown: CategoryBreakdown;
}

export interface InventoryStore {
  ownedItemIds: string[];
  equipped: {
    skin: string | null;
    title: string | null;
    frame: string | null;
  };
}

export interface DuelStoreItem {
  id: string;
  opponentName: string;
  handle: string;
  image: string;
  tier: string;
  score: number;
  stake: string;
  stakeAmount: number;
  mode: 'STAKED' | 'FRIENDLY';
  status: 'ACTIVE' | 'WAITING' | 'COMPLETED';
}

export interface FormulaItem {
  name: string;
  weight: string;
  score: number;
  tip: string;
}

interface AppState {
  user: UserStore;
  inventory: InventoryStore;
  fundingHistory: FundingLedgerItem[];
  spendsHistory: SpendLedgerItem[];
  duels: DuelStoreItem[];
}

// Global singleton to persist in memory across Next.js API route calls
const globalForStore = globalThis as unknown as { __fc_state__?: AppState };

function getInitialState(): AppState {
  return {
    user: {
      id: 'user-active-card',
      email: 'chidinma.okon@example.com',
      displayName: 'Chidinma Okon',
      handle: '@chidinma',
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&auto=format&fit=crop&q=80',
      dob: '1998-05-14',
      dobFormatted: '14 May 1998 (Age 27)',
      location: 'Lagos, Nigeria',
      bio: 'Chasing lethality 99. Studio portrait enthusiast & lighting purist.',
      memberSince: 'October 2025',
      tier: 'GOLD',
      lifetimePoints: 2350,
      spendableBalance: 850,
      streakDays: 7,
      streakMultiplier: 1.25,
      streakFreezesHeld: 1,
      biometricVerified: true,
      score: 84,
      band: 'DANGEROUS',
      title: 'Golden Standard',
      breakdown: {
        photoCraft: 94,
        harmony: 88,
        skinClarity: 91,
        expression: 95,
        aura: 98,
      },
    },
    inventory: {
      ownedItemIds: ['streak-freeze', 'title-lethal-weapon'],
      equipped: {
        skin: null,
        title: 'title-lethal-weapon',
        frame: null,
      },
    },
    fundingHistory: [
      {
        id: 'fund-1',
        scanNumber: 42,
        thumbnail: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300&auto=format&fit=crop&q=80',
        date: 'Today, 10:14 AM',
        score: 84,
        band: 'DANGEROUS',
        pointsEarned: 150,
        multiplier: 1.25,
        breakdown: 'Base 100 • 7D Streak +25 • Studio Lighting +25',
      },
      {
        id: 'fund-2',
        scanNumber: 41,
        thumbnail: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=300&auto=format&fit=crop&q=80',
        date: 'Yesterday, 6:45 PM',
        score: 82,
        band: 'DANGEROUS',
        pointsEarned: 120,
        multiplier: 1.25,
        breakdown: 'Base 100 • Harmony Bonus +20',
      },
      {
        id: 'fund-3',
        scanNumber: 40,
        thumbnail: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=300&auto=format&fit=crop&q=80',
        date: '10 Oct, 2:15 PM',
        score: 85,
        band: 'DANGEROUS',
        pointsEarned: 180,
        multiplier: 1.20,
        breakdown: 'Base 100 • High Score +50 • Streak +30',
      },
    ],
    spendsHistory: [
      {
        id: 'spend-1',
        title: 'Streak Freeze Consumable',
        category: 'Shop Perk',
        date: '11 Oct, 4:20 PM',
        pointsSpent: 150,
        iconType: 'Snowflake',
        iconBg: 'bg-cyan-50 dark:bg-cyan-950/40 text-cyan-600 dark:text-cyan-400',
        note: 'Added 1 safety shield against missed daily scans',
        status: 'Completed',
      },
      {
        id: 'spend-2',
        title: "'Apex Lethal' Custom Title",
        category: 'Shop Cosmetic',
        date: '9 Oct, 1:15 PM',
        pointsSpent: 300,
        iconType: 'Sparkles',
        iconBg: 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400',
        note: 'Equipped to Gold Face Card branding',
        status: 'Completed',
      },
    ],
    duels: [
      {
        id: 'duel-1',
        opponentName: 'Zainab Danjuma',
        handle: '@zainab',
        image: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=800&auto=format&fit=crop&q=80',
        tier: 'Black Card',
        score: 96,
        stake: '200 PTS',
        stakeAmount: 200,
        mode: 'STAKED',
        status: 'ACTIVE',
      },
      {
        id: 'duel-2',
        opponentName: 'Taiwo Bello',
        handle: '@taiwo',
        image: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=800&auto=format&fit=crop&q=80',
        tier: 'Platinum',
        score: 89,
        stake: 'Friendly Duel',
        stakeAmount: 0,
        mode: 'FRIENDLY',
        status: 'ACTIVE',
      },
      {
        id: 'duel-3',
        opponentName: 'Emma Okafor',
        handle: '@emma',
        image: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=800&auto=format&fit=crop&q=80',
        tier: 'Classic',
        score: 72,
        stake: '50 PTS',
        stakeAmount: 50,
        mode: 'STAKED',
        status: 'ACTIVE',
      },
    ],
  };
}

export const state: AppState = globalForStore.__fc_state__ ?? getInitialState();
if (process.env.NODE_ENV !== 'production') {
  globalForStore.__fc_state__ = state;
}

// ----------------- Selectors & Mutations -----------------

export function getUser(): UserStore {
  return state.user;
}

export function updateUser(updates: Partial<UserStore>): UserStore {
  state.user = { ...state.user, ...updates };
  return state.user;
}

export function getActiveCard(): FaceCardData {
  const u = state.user;
  return {
    id: u.id,
    tier: u.tier,
    cardholderName: u.displayName.toUpperCase(),
    title: u.title,
    score: u.score,
    band: u.band,
    streakDays: u.streakDays,
    multiplier: u.streakMultiplier,
    avatarUrl: u.avatar,
    skinId: state.inventory.equipped.skin ?? undefined,
    frameId: state.inventory.equipped.frame ?? undefined,
  };
}

export function getLethalFormula(): FormulaItem[] {
  const b = state.user.breakdown;
  return [
    {
      name: 'Photo Craft',
      weight: '30%',
      score: b.photoCraft || 90,
      tip: 'Balanced studio lighting & sharp focal alignment',
    },
    {
      name: 'Harmony & Proportion',
      weight: '25%',
      score: b.harmony || 85,
      tip: 'Facial balance & geometric structure',
    },
    {
      name: 'Skin Clarity & Glow',
      weight: '20%',
      score: b.skinClarity || 88,
      tip: 'Natural radiance & even illumination',
    },
    {
      name: 'Expression & Eyes',
      weight: '15%',
      score: b.expression || 92,
      tip: 'Engaged gaze & confident micro-expression',
    },
    {
      name: 'Aura & Presence',
      weight: '10%',
      score: b.aura || 95,
      tip: 'Charismatic framing & distinct silhouette impact',
    },
  ];
}

export function getTiersData() {
  const u = state.user;
  const activeCard = getActiveCard();

  const isClassicSurpassed = u.tier !== 'CLASSIC';
  const isGoldActive = u.tier === 'GOLD';
  const isPlatinumActive = u.tier === 'PLATINUM';
  const isBlackActive = u.tier === 'BLACK';

  return [
    {
      id: 'tier-classic',
      tier: 'CLASSIC' as Tier,
      name: 'Classic Lilac',
      status: isClassicSurpassed ? ('SURPASSED' as const) : ('ACTIVE' as const),
      statusBadge: isClassicSurpassed ? 'Surpassed Tier' : '★ Your Current Card',
      badgeStyle: isClassicSurpassed
        ? 'bg-purple-100 dark:bg-purple-900/60 text-purple-700 dark:text-purple-200 border-purple-300/40'
        : 'bg-amber-100 dark:bg-amber-900/60 text-amber-800 dark:text-amber-200 border-amber-300/40 ring-2 ring-amber-400/30',
      card: {
        id: 'card-classic',
        tier: 'CLASSIC' as Tier,
        cardholderName: u.displayName.toUpperCase(),
        title: 'Certified Classic',
        score: Math.min(u.score, 72),
        band: 'DANGEROUS' as Band,
        streakDays: Math.min(u.streakDays, 3),
        multiplier: 1.0,
      },
      prerequisites: {
        pointsTarget: 0,
        pointsCurrent: u.lifetimePoints,
        scoreTarget: 60,
        streakTarget: 1,
        summary: 'Base tier unlocked upon sign-up. Permanently archived.',
      },
    },
    {
      id: 'tier-gold',
      tier: 'GOLD' as Tier,
      name: 'Gold Standard',
      status: isGoldActive ? ('ACTIVE' as const) : isClassicSurpassed ? ('SURPASSED' as const) : ('IN_PROGRESS' as const),
      statusBadge: isGoldActive ? '★ Your Current Card' : isClassicSurpassed ? 'Surpassed Tier' : 'In Progress',
      badgeStyle: isGoldActive
        ? 'bg-amber-100 dark:bg-amber-900/60 text-amber-800 dark:text-amber-200 border-amber-300/40 shadow-xs ring-2 ring-amber-400/30'
        : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border-zinc-300/40',
      card: activeCard,
      prerequisites: {
        pointsTarget: 1000,
        pointsCurrent: u.lifetimePoints,
        scoreTarget: 75,
        streakTarget: 5,
        summary: `Current active tier. Multiplier ×${u.streakMultiplier} active in duels.`,
      },
    },
    {
      id: 'tier-platinum',
      tier: 'PLATINUM' as Tier,
      name: 'Platinum Elite',
      status: isPlatinumActive ? ('ACTIVE' as const) : ('IN_PROGRESS' as const),
      statusBadge: isPlatinumActive ? '★ Your Current Card' : 'In Progress (Target: 5,000 PTS)',
      badgeStyle: isPlatinumActive
        ? 'bg-cyan-100 dark:bg-cyan-900/60 text-cyan-800 dark:text-cyan-200 border-cyan-300/40 ring-2 ring-cyan-400/30'
        : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400 border-zinc-300/40',
      card: {
        id: 'card-platinum',
        tier: 'PLATINUM' as Tier,
        cardholderName: u.displayName.toUpperCase(),
        title: 'Platinum Prestige',
        score: 88,
        band: 'LETHAL' as Band,
        streakDays: 14,
        multiplier: 1.5,
      },
      prerequisites: {
        pointsTarget: 5000,
        pointsCurrent: u.lifetimePoints,
        scoreTarget: 85,
        streakTarget: 14,
        summary: 'Requires 5,000 lifetime points, score 85+ and 14-day streak to unlock.',
      },
    },
    {
      id: 'tier-black',
      tier: 'BLACK' as Tier,
      name: 'Black Card Obsidian',
      status: isBlackActive ? ('ACTIVE' as const) : ('LOCKED' as const),
      statusBadge: isBlackActive ? '★ Your Current Card' : 'Locked (Target: 10,000 PTS)',
      badgeStyle: isBlackActive
        ? 'bg-zinc-900 text-white border-zinc-700 ring-2 ring-purple-500/30'
        : 'bg-zinc-200/80 dark:bg-zinc-800/80 text-zinc-400 dark:text-zinc-500 border-zinc-300/30',
      card: {
        id: 'card-black',
        tier: 'BLACK' as Tier,
        cardholderName: u.displayName.toUpperCase(),
        title: 'Lethal Weapon Obsidian',
        score: 96,
        band: 'LETHAL' as Band,
        streakDays: 30,
        multiplier: 2.0,
      },
      prerequisites: {
        pointsTarget: 10000,
        pointsCurrent: u.lifetimePoints,
        scoreTarget: 95,
        streakTarget: 30,
        summary: 'Apex status: 10,000 lifetime points, score 95+ and 30-day streak.',
      },
    },
  ];
}

export function recordScanResult(params: {
  score: number;
  band: Band;
  breakdown: CategoryBreakdown;
  pointsEarned: number;
  multiplier: number;
  newStreak: number;
  tier: Tier;
  verdictLine: string;
  tips: string[];
  thumbnail?: string;
}) {
  const u = state.user;
  u.score = params.score;
  u.band = params.band;
  u.breakdown = params.breakdown;
  u.lifetimePoints += params.pointsEarned;
  u.spendableBalance += params.pointsEarned;
  u.streakDays = params.newStreak;
  u.streakMultiplier = params.multiplier;
  u.tier = params.tier;
  if (params.score >= 90) u.title = 'Lethal Weapon';
  else if (params.score >= 80) u.title = 'Golden Standard';
  else u.title = 'Certified Classic';

  // Prepend to funding history
  state.fundingHistory.unshift({
    id: `fund-${Date.now()}`,
    scanNumber: state.fundingHistory.length + 43,
    thumbnail: params.thumbnail || u.avatar,
    date: 'Just now',
    score: params.score,
    band: params.band,
    pointsEarned: params.pointsEarned,
    multiplier: params.multiplier,
    breakdown: `Verified Score ${params.score}/100 • Credited +${params.pointsEarned} PTS`,
  });
}

export function recordPurchase(itemId: string, price: number, itemName: string): boolean {
  if (state.user.spendableBalance < price) return false;
  state.user.spendableBalance -= price;
  if (!state.inventory.ownedItemIds.includes(itemId)) {
    state.inventory.ownedItemIds.push(itemId);
  }

  state.spendsHistory.unshift({
    id: `spend-${Date.now()}`,
    title: itemName,
    category: itemId.includes('freeze') ? 'Shop Perk' : itemId.includes('title') ? 'Shop Title' : 'Shop Skin',
    date: 'Just now',
    pointsSpent: price,
    iconType: itemId.includes('freeze') ? 'Snowflake' : itemId.includes('title') ? 'Cannon' : 'Sparkles',
    iconBg: 'bg-purple-50 dark:bg-purple-950/40 text-[#140826] dark:text-purple-300',
    note: `Purchased ${itemName} for ${price} PTS`,
    status: 'Completed',
  });

  return true;
}

export function recordEquip(itemId: string, kind?: string) {
  if (kind === 'SKIN' || itemId.includes('skin')) {
    state.inventory.equipped.skin = itemId;
  } else if (kind === 'TITLE' || itemId.includes('title')) {
    state.inventory.equipped.title = itemId;
  } else if (kind === 'FRAME' || itemId.includes('frame')) {
    state.inventory.equipped.frame = itemId;
  }
}

export function addDuel(params: {
  opponentName: string;
  handle: string;
  image: string;
  tier: string;
  score: number;
  stakeAmount: number;
  mode: 'STAKED' | 'FRIENDLY';
}): DuelStoreItem {
  const newDuel: DuelStoreItem = {
    id: `duel-${Date.now()}`,
    opponentName: params.opponentName,
    handle: params.handle,
    image: params.image,
    tier: params.tier,
    score: params.score,
    stake: params.mode === 'STAKED' ? `${params.stakeAmount} PTS` : 'Friendly Duel',
    stakeAmount: params.stakeAmount,
    mode: params.mode,
    status: 'WAITING',
  };

  if (params.stakeAmount > 0) {
    state.user.spendableBalance = Math.max(0, state.user.spendableBalance - params.stakeAmount);
    state.spendsHistory.unshift({
      id: `spend-${Date.now()}`,
      title: `Arena Duel Escrow vs ${params.opponentName}`,
      category: 'Arena Duel',
      date: 'Just now',
      pointsSpent: params.stakeAmount,
      iconType: 'Swords',
      iconBg: 'bg-purple-50 dark:bg-purple-950/40 text-[#140826] dark:text-purple-300',
      note: `Escrow hold for duel #${newDuel.id}`,
      status: 'Active',
    });
  }

  state.duels.unshift(newDuel);
  return newDuel;
}
