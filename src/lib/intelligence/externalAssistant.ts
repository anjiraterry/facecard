export interface PublicProductContext {
  brand: string;
  productName: string;
  variantAndSize: string;
  ingredients: string;
  manufacturerInstructions: string;
  officialUrl: string;
  description: string;
}

export interface ExternalAssistantAdapter {
  providerId: 'chatgpt' | 'gemini' | 'claude' | 'perplexity';
  displayName: string;
  isEnabled: boolean;
  supportsPrefilledPrompt: boolean;
  buildLaunchUrl(prompt: string): string | null;
  getFallbackUrl(): string;
}

const MAX_URL_PROMPT_CHARS = 1800;

function sanitizeField(value: string | null | undefined, fallback: string, maxLen = 400): string {
  if (!value || typeof value !== 'string') return fallback;
  // Strip control characters and prompt-injection delimiters
  const cleaned = value
    .replace(/[\u0000-\u001F\u007F]/g, ' ')
    .replace(/```/g, '')
    .trim();
  return cleaned ? cleaned.slice(0, maxLen) : fallback;
}

/**
 * Builds sanitized public product context from the verified Atelier catalogue.
 * Never includes private supplier pricing, internal IDs, or user PII/photos/scores.
 */
export function buildProductContext(input: {
  brandName?: string | null;
  productName: string;
  variantLabel?: string | null;
  sizeLabel?: string | null;
  ingredients?: string | null;
  instructions?: string | null;
  officialUrl?: string | null;
  description?: string | null;
}): PublicProductContext {
  const variant = [input.variantLabel, input.sizeLabel].filter(Boolean).join(' · ');
  return {
    brand: sanitizeField(input.brandName, 'Unknown brand (not verified)', 100),
    productName: sanitizeField(input.productName, 'Skincare product', 140),
    variantAndSize: sanitizeField(variant, 'Standard size (not specified)', 100),
    ingredients: sanitizeField(
      input.ingredients,
      'Verified ingredient list not available in catalogue',
      800
    ),
    manufacturerInstructions: sanitizeField(
      input.instructions,
      'Manufacturer instructions not available in catalogue',
      500
    ),
    officialUrl: sanitizeField(input.officialUrl, 'Not provided', 200),
    description: sanitizeField(input.description, '', 400),
  };
}

/**
 * Generates the delimited external AI prompt template from Section 17.
 */
export function buildProductBreakdownPrompt(ctx: PublicProductContext): string {
  return [
    'Help me understand the following skincare product before deciding whether to purchase it.',
    '',
    '--- PRODUCT DATA (UNTRUSTED CATALOGUE FIELDS) ---',
    `Brand: ${ctx.brand}`,
    `Product: ${ctx.productName}`,
    `Variant and size: ${ctx.variantAndSize}`,
    `Ingredients: ${ctx.ingredients}`,
    `Manufacturer instructions: ${ctx.manufacturerInstructions}`,
    `Official product information: ${ctx.officialUrl}`,
    '--- END PRODUCT DATA ---',
    '',
    'Please explain:',
    '1. What the product is designed to do.',
    '2. The purpose of its important ingredients.',
    '3. Which skin types and skincare goals it may be suitable for.',
    '4. How it is typically incorporated into a morning or evening routine.',
    '5. Potential irritation, sensitivities and relevant precautions.',
    '6. Important ingredient combinations or interactions.',
    '7. Whether its marketing claims are supported by credible evidence.',
    '8. Questions I should consider before purchasing it.',
    '9. Whether the product is necessary or if a simpler routine may be sufficient.',
    '',
    'Do not invent missing ingredients or product details. Distinguish manufacturer claims from independent evidence. Ask me about my skin type, concerns, sensitivities and existing routine if needed. This is general skincare education, not a medical diagnosis.',
  ].join('\n');
}

export const EXTERNAL_ASSISTANT_ADAPTERS: Record<
  ExternalAssistantAdapter['providerId'],
  ExternalAssistantAdapter
> = {
  chatgpt: {
    providerId: 'chatgpt',
    displayName: 'ChatGPT',
    isEnabled: true,
    supportsPrefilledPrompt: true,
    buildLaunchUrl(prompt: string) {
      if (prompt.length > MAX_URL_PROMPT_CHARS) return null;
      const url = new URL('https://chatgpt.com/');
      url.searchParams.set('q', prompt);
      return url.toString();
    },
    getFallbackUrl: () => 'https://chatgpt.com/',
  },
  gemini: {
    providerId: 'gemini',
    displayName: 'Gemini',
    isEnabled: false,
    supportsPrefilledPrompt: false,
    buildLaunchUrl: () => null,
    getFallbackUrl: () => 'https://gemini.google.com/',
  },
  claude: {
    providerId: 'claude',
    displayName: 'Claude',
    isEnabled: false,
    supportsPrefilledPrompt: false,
    buildLaunchUrl: () => null,
    getFallbackUrl: () => 'https://claude.ai/',
  },
  perplexity: {
    providerId: 'perplexity',
    displayName: 'Perplexity',
    isEnabled: false,
    supportsPrefilledPrompt: false,
    buildLaunchUrl: () => null,
    getFallbackUrl: () => 'https://www.perplexity.ai/',
  },
};
