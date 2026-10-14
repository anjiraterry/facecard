export type Tier = 'CLASSIC' | 'GOLD' | 'PLATINUM' | 'BLACK';

export type Band = 'HARMLESS' | 'SUSPICIOUS' | 'DANGEROUS' | 'LETHAL';

export type ToneMode = 'HYPE' | 'SMOOTH' | 'ROAST' | 'STRAIGHT';

export type FaceOffMode = 'STAKED' | 'FRIENDLY';

export type FaceOffStatus = 
  | 'WAITING' 
  | 'ACTIVE' 
  | 'TIE_REMATCH' 
  | 'COMPLETED' 
  | 'EXPIRED' 
  | 'CANCELLED';

export interface DetailedBreakdown {
  photoCraft: {
    lighting: number;
    sharpness: number;
    framing: number;
  };
  face: {
    harmony: number;
    skinClarity: number;
    featureDefinition: number;
    symmetry: number;
  };
  expression: number;
  aura: number;
}

export interface CategoryBreakdown {
  photoCraft: number;
  harmony: number;
  skinClarity: number;
  featureDefinition?: number;
  symmetry?: number;
  expression: number;
  aura: number;
}

export interface LethalityResult {
  score: number; // 0 - 100
  band: Band;
  verdictLine: string;
  categoryBreakdown: CategoryBreakdown;
  tips: string[];
  pointsEarned: number;
  multiplier: number;
  newStreak: number;
  tier: Tier;
  unlockedNewTier?: boolean;
}

export interface FaceCardData {
  id?: string;
  tier: Tier;
  score?: number;
  band?: Band;
  cardNumber?: string; // Optional legacy card number
  cardholderName: string;
  title?: string; // e.g. "Island Boy", "Certified Pressure"
  skinId?: string;
  frameId?: string;
  avatarUrl?: string;
  streakDays?: number;
  multiplier?: number;
}
