export type RecommendationCategory =
  | 'SKINCARE'
  | 'LIFESTYLE'
  | 'GROOMING'
  | 'PRESENTATION'
  | 'PROFESSIONAL_GUIDANCE';

export type EvidenceLevel = 'STRONG' | 'MODERATE' | 'LIMITED' | 'INSUFFICIENT';

export interface EvidenceSource {
  title: string;
  url?: string;
}

export interface ImprovementRecommendation {
  id: string;
  category: RecommendationCategory;
  observationIds: string[];
  title: string;
  explanation: string;
  actionableSteps: string[];
  evidenceLevel: EvidenceLevel;
  limitations: string[];
  precautions: string[];
  sources: EvidenceSource[];
  relatedProductCategories: string[];
  requiresProfessionalAdvice: boolean;
  contentVersion: string;
}

export const IMPROVEMENT_CONTENT_VERSION = '1.0.0';

export const IMPROVEMENT_CATALOGUE: ImprovementRecommendation[] = [
  {
    id: 'rec-portrait-lighting',
    category: 'PRESENTATION',
    observationIds: ['lighting_low', 'shadow_imbalance'],
    title: 'Improve Your Portrait Lighting',
    explanation: 'Soft, even front-facing light reduces harsh shadows and improves facial detail capture.',
    actionableSteps: [
      'Face a window or diffused light source rather than standing with bright light behind you.',
      'Hold the phone at eye level to minimize overhead shadows.',
    ],
    evidenceLevel: 'STRONG',
    limitations: ['Affects photographic capture quality only, not skin health.'],
    precautions: [],
    sources: [{ title: 'Portrait Lighting & Photographic Exposure Principles' }],
    relatedProductCategories: [],
    requiresProfessionalAdvice: false,
    contentVersion: IMPROVEMENT_CONTENT_VERSION,
  },
  {
    id: 'rec-skincare-foundation',
    category: 'SKINCARE',
    observationIds: ['skincare_routine_interest', 'daily_spf'],
    title: 'Build a Gentle, Consistent Routine',
    explanation: 'A simple cleanser, barrier-supportive moisturizer, and broad-spectrum SPF 30+ covers the highest-evidence daily fundamentals.',
    actionableSteps: [
      'Use a gentle, non-stripping cleanser morning and evening.',
      'Apply broad-spectrum SPF 30+ every morning as your final step.',
      'Complete your voluntary Skin Profile for ingredient-matched Atelier guidance.',
    ],
    evidenceLevel: 'STRONG',
    limitations: ['General skincare education only; individual skin responses vary.'],
    precautions: ['Patch test new actives on your jawline or inner forearm for 24 hours.'],
    sources: [{ title: 'American Academy of Dermatology — Basic Skin Care & Sunscreen Guidance' }],
    relatedProductCategories: ['Cleansers', 'Moisturisers', 'Sunscreen'],
    requiresProfessionalAdvice: false,
    contentVersion: IMPROVEMENT_CONTENT_VERSION,
  },
  {
    id: 'rec-lifestyle-basics',
    category: 'LIFESTYLE',
    observationIds: ['general_wellbeing'],
    title: 'Consistent Sleep & Balanced Hydration',
    explanation: 'Regular sleep and overall nutrition support general wellbeing and rested appearance.',
    actionableSteps: [
      'Aim for a consistent sleep schedule.',
      'Avoid restrictive dieting or intentional dehydration for appearance.',
    ],
    evidenceLevel: 'MODERATE',
    limitations: ['Does not alter bone structure or replace medical care.'],
    precautions: [],
    sources: [{ title: 'General Sleep & Skin Barrier Literature' }],
    relatedProductCategories: [],
    requiresProfessionalAdvice: false,
    contentVersion: IMPROVEMENT_CONTENT_VERSION,
  },
  {
    id: 'rec-dermatologist-guidance',
    category: 'PROFESSIONAL_GUIDANCE',
    observationIds: ['persistent_concern'],
    title: 'Consult a Licensed Dermatologist for Persistent Concerns',
    explanation: 'Selfie analysis cannot diagnose acne, eczema, rosacea, or pigmentation conditions.',
    actionableSteps: [
      'Book an in-person or teledermatology consultation for persistent irritation, painful breakouts, or sudden skin changes.',
    ],
    evidenceLevel: 'STRONG',
    limitations: ['Face Card is not a medical device or diagnostic service.'],
    precautions: ['Do not delay professional care based on entertainment scan scores.'],
    sources: [{ title: 'Clinical Dermatology Standard of Care' }],
    relatedProductCategories: [],
    requiresProfessionalAdvice: true,
    contentVersion: IMPROVEMENT_CONTENT_VERSION,
  },
];

export function generateImprovementPlan(input: {
  lightingScore: number;
  sharpnessScore: number;
  hasSkinProfile?: boolean;
}): ImprovementRecommendation[] {
  const plan: ImprovementRecommendation[] = [];
  if (input.lightingScore < 80 || input.sharpnessScore < 80) {
    plan.push(IMPROVEMENT_CATALOGUE[0]);
  }
  plan.push(IMPROVEMENT_CATALOGUE[1]);
  plan.push(IMPROVEMENT_CATALOGUE[2]);
  if (!input.hasSkinProfile) {
    plan.push(IMPROVEMENT_CATALOGUE[3]);
  }
  return plan;
}
