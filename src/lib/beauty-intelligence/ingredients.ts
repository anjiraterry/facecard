export const INGREDIENT_KB_VERSION = 'v2.1.0';

export type EvidenceStrength = 'STRONG' | 'MODERATE' | 'LIMITED';
export type CompatibilityStatus = 'COMPATIBLE' | 'CAUTION' | 'INCOMPATIBLE';

export interface IngredientRecord {
  slug: string;
  name: string;
  aliases: string[];
  inciName: string | null;
  supportedPurposes: string[];
  evidenceReferences: string[];
  typicalUsageContext: string;
  potentialIrritation: 'LOW' | 'MODERATE' | 'HIGH';
  precautions: string[];
  incompatibilities: string[];
  timeOfDay: 'AM' | 'PM' | 'BOTH';
  verifiedConcentration: string | null;
  reviewStatus: 'PUBLISHED' | 'DRAFT';
  publicationVersion: number;
}

export interface IngredientCompatibilityRule {
  ingredientASlug: string;
  ingredientBSlug: string;
  status: CompatibilityStatus;
  rationale: string;
  guidance: string;
}

export interface ConcernIngredientMappingRecord {
  concernSlug: string;
  concernLabel: string;
  ingredientSlug: string;
  suitabilityRationale: string;
  evidenceStrength: EvidenceStrength;
  restrictions: string[];
  exclusionCriteria: string[];
  compatibilityRequirements: string[];
  reviewStatus: 'PUBLISHED' | 'DRAFT';
}

export interface RoutineTemplateStep {
  timeOfDay: 'AM' | 'PM';
  stepNumber: number;
  stage: 'CLEANSE' | 'TREAT' | 'MOISTURISE' | 'PROTECT';
  stepTitle: string;
  guidance: string;
  optional?: boolean;
}

export interface RoutineTemplateRecord {
  slug: string;
  name: string;
  complexity: 'MINIMAL' | 'BALANCED' | 'TARGETED';
  description: string;
  steps: RoutineTemplateStep[];
}

export const INGREDIENT_LIBRARY: IngredientRecord[] = [
  {
    slug: 'niacinamide',
    name: 'Niacinamide',
    aliases: ['Vitamin B3', 'Nicotinamide'],
    inciName: 'Niacinamide',
    supportedPurposes: ['Uneven-looking tone', 'Excess shine balance', 'Skin barrier support'],
    evidenceReferences: [
      'Bissett et al., Dermatologic Surgery (topical niacinamide tone & barrier support)',
      'Draelos et al., Journal of Cosmetic and Laser Therapy (surface sebum appearance)',
    ],
    typicalUsageContext: 'Daily leave-on serum or moisturiser step.',
    potentialIrritation: 'LOW',
    precautions: ['Concentrations above 10% may feel tingling on sensitive skin.'],
    incompatibilities: [],
    timeOfDay: 'BOTH',
    verifiedConcentration: '2%–5% typical cosmetic leave-on range (only display exact % when verified on product label)',
    reviewStatus: 'PUBLISHED',
    publicationVersion: 1,
  },
  {
    slug: 'salicylic-acid',
    name: 'Salicylic Acid',
    aliases: ['BHA', 'Beta Hydroxy Acid'],
    inciName: 'Salicylic Acid',
    supportedPurposes: ['Clogged pores', 'Breakout-prone skin appearance'],
    evidenceReferences: [
      'American Academy of Dermatology (AAD) — Non-prescription acne & BHA exfoliant guidance',
    ],
    typicalUsageContext: 'Targeted leave-on or wash-off exfoliant 2–3 evenings per week initially.',
    potentialIrritation: 'MODERATE',
    precautions: [
      'Avoid layering on the same night with retinoids or strong AHAs unless guided.',
      'Use broad-spectrum SPF daily.',
    ],
    incompatibilities: ['retinol'],
    timeOfDay: 'PM',
    verifiedConcentration: '0.5%–2% typical OTC cosmetic range',
    reviewStatus: 'PUBLISHED',
    publicationVersion: 1,
  },
  {
    slug: 'hyaluronic-acid',
    name: 'Hyaluronic Acid',
    aliases: ['Sodium Hyaluronate', 'HA'],
    inciName: 'Sodium Hyaluronate',
    supportedPurposes: ['User-reported dryness', 'Surface hydration comfort'],
    evidenceReferences: [
      'Papakonstantinou et al., Dermato-Endocrinology (humectant water-binding properties)',
    ],
    typicalUsageContext: 'Apply to slightly damp skin before sealing with a moisturiser.',
    potentialIrritation: 'LOW',
    precautions: ['Always follow with an occlusive/emollient moisturiser in dry climates.'],
    incompatibilities: [],
    timeOfDay: 'BOTH',
    verifiedConcentration: null,
    reviewStatus: 'PUBLISHED',
    publicationVersion: 1,
  },
  {
    slug: 'ceramides',
    name: 'Ceramides',
    aliases: ['Ceramide NP', 'Ceramide AP', 'Ceramide EOP'],
    inciName: 'Ceramide NP',
    supportedPurposes: ['Moisturising', 'Skin barrier comfort & support'],
    evidenceReferences: [
      'Coderch et al., American Journal of Clinical Dermatology (stratum corneum lipid support)',
    ],
    typicalUsageContext: 'Daily AM/PM moisturiser step, especially alongside active treatments.',
    potentialIrritation: 'LOW',
    precautions: [],
    incompatibilities: [],
    timeOfDay: 'BOTH',
    verifiedConcentration: null,
    reviewStatus: 'PUBLISHED',
    publicationVersion: 1,
  },
  {
    slug: 'broad-spectrum-spf',
    name: 'Sunscreen (Broad-Spectrum UV Filters)',
    aliases: ['SPF 30+', 'SPF 50', 'Sunscreen'],
    inciName: null,
    supportedPurposes: ['Daily sun protection', 'Supporting routines addressing uneven pigmentation'],
    evidenceReferences: [
      'American Academy of Dermatology (AAD) — Daily broad-spectrum SPF 30+ guidance across all skin tones',
    ],
    typicalUsageContext: 'Final morning step, reapplied during prolonged outdoor sun exposure.',
    potentialIrritation: 'LOW',
    precautions: ['Check specific UV filter sensitivities if eyes sting easily.'],
    incompatibilities: [],
    timeOfDay: 'AM',
    verifiedConcentration: null,
    reviewStatus: 'PUBLISHED',
    publicationVersion: 1,
  },
  {
    slug: 'vitamin-c',
    name: 'Vitamin C',
    aliases: ['L-Ascorbic Acid', '3-O-Ethyl Ascorbic Acid'],
    inciName: 'Ascorbic Acid',
    supportedPurposes: ['Radiance goals', 'Uneven-looking tone support'],
    evidenceReferences: [
      'Pullar et al., Nutrients (role of topical vitamin C in skin photo-protection & tone)',
    ],
    typicalUsageContext: 'Morning antioxidant serum step paired with broad-spectrum sunscreen.',
    potentialIrritation: 'MODERATE',
    precautions: ['Low-pH L-ascorbic acid can sting compromised or highly sensitive skin.'],
    incompatibilities: ['retinol', 'salicylic-acid'],
    timeOfDay: 'AM',
    verifiedConcentration: null,
    reviewStatus: 'PUBLISHED',
    publicationVersion: 1,
  },
  {
    slug: 'azelaic-acid',
    name: 'Azelaic Acid',
    aliases: ['Azelaic'],
    inciName: 'Azelaic Acid',
    supportedPurposes: ['Redness-like appearance comfort', 'Uneven-looking tone & blemish support'],
    evidenceReferences: [
      'Searle et al., Journal of Cosmetic Dermatology (azelaic acid for tone & redness-prone skin)',
    ],
    typicalUsageContext: 'Once daily or alternate evenings.',
    potentialIrritation: 'LOW',
    precautions: ['Introduce gradually if prone to mild tingling.'],
    incompatibilities: [],
    timeOfDay: 'PM',
    verifiedConcentration: null,
    reviewStatus: 'PUBLISHED',
    publicationVersion: 1,
  },
  {
    slug: 'panthenol',
    name: 'Panthenol (Vitamin B5)',
    aliases: ['Pro-Vitamin B5', 'D-Panthenol'],
    inciName: 'Panthenol',
    supportedPurposes: ['Soothing comfort', 'Humectant hydration'],
    evidenceReferences: ['Ebner et al., American Journal of Clinical Dermatology'],
    typicalUsageContext: 'Anytime soothing serum or barrier cream.',
    potentialIrritation: 'LOW',
    precautions: [],
    incompatibilities: [],
    timeOfDay: 'BOTH',
    verifiedConcentration: null,
    reviewStatus: 'PUBLISHED',
    publicationVersion: 1,
  },
  {
    slug: 'retinol',
    name: 'Retinol',
    aliases: ['Retinoid', 'Vitamin A'],
    inciName: 'Retinol',
    supportedPurposes: ['Visible fine lines', 'Uneven texture renewal'],
    evidenceReferences: ['Zasada & Budzisz, Advances in Dermatology and Allergology'],
    typicalUsageContext: 'Evening only; start 1–2 nights per week with moisturiser buffering.',
    potentialIrritation: 'HIGH',
    precautions: [
      'Not recommended during pregnancy or breastfeeding without clinician guidance.',
      'Requires strict daily broad-spectrum sunscreen.',
      'Avoid combining in the same evening with salicylic acid or low-pH vitamin C.',
    ],
    incompatibilities: ['salicylic-acid', 'vitamin-c'],
    timeOfDay: 'PM',
    verifiedConcentration: null,
    reviewStatus: 'PUBLISHED',
    publicationVersion: 1,
  },
];

export const INGREDIENT_COMPATIBILITIES: IngredientCompatibilityRule[] = [
  {
    ingredientASlug: 'retinol',
    ingredientBSlug: 'salicylic-acid',
    status: 'CAUTION',
    rationale: 'Combining leave-on BHA and retinol in the same evening increases barrier irritation and peeling risk.',
    guidance: 'Use on alternate evenings rather than layering together.',
  },
  {
    ingredientASlug: 'retinol',
    ingredientBSlug: 'vitamin-c',
    status: 'CAUTION',
    rationale: 'Low-pH vitamin C and retinol layered together can irritate sensitive skin.',
    guidance: 'Keep Vitamin C in your AM routine and Retinol in your PM routine.',
  },
  {
    ingredientASlug: 'salicylic-acid',
    ingredientBSlug: 'vitamin-c',
    status: 'CAUTION',
    rationale: 'Multiple acidic actives in one step can over-exfoliate and cause stinging.',
    guidance: 'Separate AM (Vitamin C) and PM (Salicylic Acid), or alternate days.',
  },
  {
    ingredientASlug: 'niacinamide',
    ingredientBSlug: 'ceramides',
    status: 'COMPATIBLE',
    rationale: 'Complementary barrier-supportive ingredients suitable for AM and PM use.',
    guidance: 'Can be layered together safely.',
  },
  {
    ingredientASlug: 'hyaluronic-acid',
    ingredientBSlug: 'ceramides',
    status: 'COMPATIBLE',
    rationale: 'Humectant hydration paired with ceramides helps lock in surface moisture.',
    guidance: 'Apply Hyaluronic Acid first on damp skin, then seal with Ceramides.',
  },
];

export const CONCERN_INGREDIENT_MAPPINGS: ConcernIngredientMappingRecord[] = [
  {
    concernSlug: 'uneven-tone',
    concernLabel: 'Uneven-looking tone & dark marks',
    ingredientSlug: 'niacinamide',
    suitabilityRationale: 'Helps support more even-looking tone while remaining gentle across melanin-rich skin.',
    evidenceStrength: 'STRONG',
    restrictions: [],
    exclusionCriteria: ['Known niacinamide sensitivity'],
    compatibilityRequirements: ['Pair with daily broad-spectrum SPF'],
    reviewStatus: 'PUBLISHED',
  },
  {
    concernSlug: 'uneven-tone',
    concernLabel: 'Uneven-looking tone & dark marks',
    ingredientSlug: 'broad-spectrum-spf',
    suitabilityRationale: 'UV exposure deepens post-blemish marks; daily SPF is foundational.',
    evidenceStrength: 'STRONG',
    restrictions: [],
    exclusionCriteria: ['Specific UV filter allergy'],
    compatibilityRequirements: [],
    reviewStatus: 'PUBLISHED',
  },
  {
    concernSlug: 'uneven-tone',
    concernLabel: 'Uneven-looking tone & dark marks',
    ingredientSlug: 'vitamin-c',
    suitabilityRationale: 'Antioxidant support for dullness and uneven-looking tone.',
    evidenceStrength: 'MODERATE',
    restrictions: ['Avoid if frequent irritation reported'],
    exclusionCriteria: ['High sensitivity', 'Vitamin C allergy'],
    compatibilityRequirements: ['Use in AM under SPF'],
    reviewStatus: 'PUBLISHED',
  },
  {
    concernSlug: 'breakouts-blemishes',
    concernLabel: 'Clogged pores & breakouts',
    ingredientSlug: 'salicylic-acid',
    suitabilityRationale: 'Oil-soluble BHA helps clear pore congestion when confirmed through user-reported concerns.',
    evidenceStrength: 'STRONG',
    restrictions: ['Introduce 2–3x/week; avoid pregnancy restriction conflicts'],
    exclusionCriteria: ['Salicylate/aspirin allergy', 'Severely compromised barrier'],
    compatibilityRequirements: ['Avoid layering with retinol in the same PM step'],
    reviewStatus: 'PUBLISHED',
  },
  {
    concernSlug: 'dryness-hydration',
    concernLabel: 'Dryness & dehydration goals',
    ingredientSlug: 'hyaluronic-acid',
    suitabilityRationale: 'Humectant ingredient that supports surface hydration comfort.',
    evidenceStrength: 'STRONG',
    restrictions: [],
    exclusionCriteria: [],
    compatibilityRequirements: ['Seal with moisturiser'],
    reviewStatus: 'PUBLISHED',
  },
  {
    concernSlug: 'dryness-hydration',
    concernLabel: 'Dryness & dehydration goals',
    ingredientSlug: 'ceramides',
    suitabilityRationale: 'Supports moisture retention and skin barrier comfort.',
    evidenceStrength: 'STRONG',
    restrictions: [],
    exclusionCriteria: [],
    compatibilityRequirements: [],
    reviewStatus: 'PUBLISHED',
  },
  {
    concernSlug: 'excess-shine',
    concernLabel: 'Excess oil & surface shine',
    ingredientSlug: 'niacinamide',
    suitabilityRationale: 'Lightweight oil-balancing support without stripping the skin barrier.',
    evidenceStrength: 'MODERATE',
    restrictions: [],
    exclusionCriteria: ['Known niacinamide sensitivity'],
    compatibilityRequirements: [],
    reviewStatus: 'PUBLISHED',
  },
  {
    concernSlug: 'sensitivity-barrier',
    concernLabel: 'Sensitivity & barrier comfort',
    ingredientSlug: 'ceramides',
    suitabilityRationale: 'Fragrance-free barrier lipids support sensitive, easily reactive skin.',
    evidenceStrength: 'STRONG',
    restrictions: [],
    exclusionCriteria: [],
    compatibilityRequirements: [],
    reviewStatus: 'PUBLISHED',
  },
  {
    concernSlug: 'sensitivity-barrier',
    concernLabel: 'Sensitivity & barrier comfort',
    ingredientSlug: 'panthenol',
    suitabilityRationale: 'Calming humectant that supports comfort in reactive routines.',
    evidenceStrength: 'MODERATE',
    restrictions: [],
    exclusionCriteria: [],
    compatibilityRequirements: [],
    reviewStatus: 'PUBLISHED',
  },
  {
    concernSlug: 'sun-protection',
    concernLabel: 'Daily UV protection',
    ingredientSlug: 'broad-spectrum-spf',
    suitabilityRationale: 'Essential daily protection across all skin tones to prevent photo-ageing and uneven marks.',
    evidenceStrength: 'STRONG',
    restrictions: [],
    exclusionCriteria: [],
    compatibilityRequirements: [],
    reviewStatus: 'PUBLISHED',
  },
  {
    concernSlug: 'fine-lines-firmness',
    concernLabel: 'Visible fine lines & renewal',
    ingredientSlug: 'retinol',
    suitabilityRationale: 'Supports evening surface renewal when tolerated and paired with daily SPF.',
    evidenceStrength: 'STRONG',
    restrictions: ['PM only', 'Avoid in pregnancy', 'Avoid with frequent sensitivity'],
    exclusionCriteria: ['Pregnancy/nursing', 'Frequent sensitivity', 'Active barrier irritation'],
    compatibilityRequirements: ['Mandatory AM SPF'],
    reviewStatus: 'PUBLISHED',
  },
];

export const ROUTINE_TEMPLATES: RoutineTemplateRecord[] = [
  {
    slug: 'minimal-3-step',
    name: 'Minimal Foundation (3 Essentials)',
    complexity: 'MINIMAL',
    description: 'Cleanse, moisturise, and protect — no unnecessary actives.',
    steps: [
      { timeOfDay: 'AM', stepNumber: 1, stage: 'CLEANSE', stepTitle: 'Gentle Cleanse', guidance: 'Non-stripping lukewarm rinse or mild cleanser.' },
      { timeOfDay: 'AM', stepNumber: 2, stage: 'MOISTURISE', stepTitle: 'Barrier Moisturiser', guidance: 'Lightweight ceramide/humectant hydration.' },
      { timeOfDay: 'AM', stepNumber: 3, stage: 'PROTECT', stepTitle: 'Broad-Spectrum SPF 30+', guidance: 'Daily sun protection as final morning step.' },
      { timeOfDay: 'PM', stepNumber: 1, stage: 'CLEANSE', stepTitle: 'Evening Cleanse', guidance: 'Gently remove sunscreen and daily buildup.' },
      { timeOfDay: 'PM', stepNumber: 2, stage: 'MOISTURISE', stepTitle: 'Barrier Recovery Cream', guidance: 'Seal moisture overnight.' },
    ],
  },
  {
    slug: 'balanced-4-step',
    name: 'Balanced Tone & Clarity Ritual',
    complexity: 'BALANCED',
    description: 'Adds one targeted treatment step matched to confirmed goals without over-exfoliating.',
    steps: [
      { timeOfDay: 'AM', stepNumber: 1, stage: 'CLEANSE', stepTitle: 'Gentle Cleanse', guidance: 'Non-stripping morning wash.' },
      { timeOfDay: 'AM', stepNumber: 2, stage: 'TREAT', stepTitle: 'Tone & Barrier Serum', guidance: 'Niacinamide or antioxidant serum (skip if sensitive).' },
      { timeOfDay: 'AM', stepNumber: 3, stage: 'MOISTURISE', stepTitle: 'Hydrating Lotion', guidance: 'Light moisture if needed before SPF.' },
      { timeOfDay: 'AM', stepNumber: 4, stage: 'PROTECT', stepTitle: 'Broad-Spectrum SPF 30–50', guidance: 'Essential final morning step.' },
      { timeOfDay: 'PM', stepNumber: 1, stage: 'CLEANSE', stepTitle: 'Evening Cleanse', guidance: 'Cleanse thoroughly without harsh scrubbing.' },
      { timeOfDay: 'PM', stepNumber: 2, stage: 'TREAT', stepTitle: 'Targeted PM Step (2–3x/wk)', guidance: 'Introduce one active slowly; avoid stacking irritants.' },
      { timeOfDay: 'PM', stepNumber: 3, stage: 'MOISTURISE', stepTitle: 'Ceramide Barrier Cream', guidance: 'Support overnight barrier comfort.' },
    ],
  },
];

export function checkIngredientCompatibility(slugs: string[]): IngredientCompatibilityRule[] {
  const unique = Array.from(new Set(slugs.map((s) => s.toLowerCase())));
  const warnings: IngredientCompatibilityRule[] = [];

  for (const rule of INGREDIENT_COMPATIBILITIES) {
    if (
      rule.status !== 'COMPATIBLE' &&
      unique.includes(rule.ingredientASlug) &&
      unique.includes(rule.ingredientBSlug)
    ) {
      warnings.push(rule);
    }
  }
  return warnings;
}
