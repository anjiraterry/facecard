import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { jsonResponse } from '@/lib/atelier/serialize';

export const dynamic = 'force-dynamic';

interface ResearchResponse {
  summary: string;
  keyActivesAnalysis: string[];
  layeringGuidance: string;
  cautions: string;
  source: 'AI_MODEL' | 'FORMULATION_DATABASE';
}

function buildGroundedFallback(
  product: {
    name: string;
    ritualStep: string;
    howToUse: string | null;
    warnings: string | null;
    benefits: string[];
    ingredients: Array<{ isKeyActive: boolean; ingredient: { name: string; inciName: string | null; isPotentialIrritant: boolean } }>;
    concerns: Array<{ concern: { name: string } }>;
    skinTypes: Array<{ skinType: string }>;
  },
  question?: string
): ResearchResponse {
  const actives = product.ingredients.map((pi) => {
    const inci = pi.ingredient.inciName ? ` (INCI: ${pi.ingredient.inciName})` : '';
    const note = pi.ingredient.isPotentialIrritant
      ? ' — potent active; introduce gradually and patch test on sensitive skin.'
      : ' — barrier-supportive and well tolerated for daily use.';
    return `${pi.ingredient.name}${inci}${note}`;
  });

  const concernNames = product.concerns.map((c) => c.concern.name).join(', ') || 'daily skin balance';
  const suitableTypes = product.skinTypes.map((st) => st.skinType.toLowerCase()).join(', ') || 'most skin types';

  return {
    summary: question
      ? `Regarding "${question}": ${product.name} is formulated as a ${product.ritualStep.toLowerCase()} step targeting ${concernNames}, suitable for ${suitableTypes} skin.`
      : `${product.name} is a ${product.ritualStep.toLowerCase()} formulation targeting ${concernNames}, calibrated for ${suitableTypes} skin.`,
    keyActivesAnalysis: actives.length > 0 ? actives : product.benefits,
    layeringGuidance:
      product.howToUse ||
      `Apply during your ${product.ritualStep.toLowerCase()} step. Follow with broad-spectrum SPF 50+ in the morning.`,
    cautions:
      product.warnings ||
      'For external use only. Perform a 24-hour patch test on the jawline or inner forearm before full application if you have reactive skin.',
    source: 'FORMULATION_DATABASE',
  };
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const { question } = (await req.json().catch(() => ({}))) as { question?: string };

    const product = await db.atelierProduct.findFirst({
      where: { slug, status: 'PUBLISHED' },
      include: {
        brand: { select: { name: true } },
        category: { select: { name: true } },
        ingredients: { include: { ingredient: true } },
        concerns: { include: { concern: true } },
        skinTypes: true,
      },
    });

    if (!product) {
      return jsonResponse({ error: 'Product not found' }, 404);
    }

    const apiKey = process.env.AI_GATEWAY_API_KEY || process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
    if (!apiKey) {
      return jsonResponse({
        success: true,
        research: buildGroundedFallback(product, question?.trim()),
      });
    }

    const ingredientNames = product.ingredients
      .map((i) => `${i.ingredient.name} (${i.ingredient.inciName || 'N/A'})`)
      .join(', ');
    const concernNames = product.concerns.map((c) => c.concern.name).join(', ');
    const skinTypeNames = product.skinTypes.map((s) => s.skinType).join(', ');

    const prompt = `You are a cosmetic formulation researcher for Face Card Atelier.
Product: ${product.name} by ${product.brand.name} (${product.category.name}, ritual step: ${product.ritualStep})
Description: ${product.description}
Key ingredients: ${ingredientNames || 'Not listed'}
Target concerns: ${concernNames || 'General care'}
Suitable skin types: ${skinTypeNames || 'All'}
How to use: ${product.howToUse || 'Standard daily use'}
User question: ${question?.trim() || 'Provide a concise clinical/cosmetic formulation overview, how the actives work, layering advice, and cautions.'}

Return STRICT JSON with keys:
{
  "summary": "2-3 concise sentences answering the question accurately without medical diagnosis claims",
  "keyActivesAnalysis": ["bullet 1", "bullet 2"],
  "layeringGuidance": "practical AM/PM layering advice",
  "cautions": "patch test / compatibility cautions"
}`;

    try {
      const endpoint = process.env.AI_GATEWAY_BASE_URL
        ? `${process.env.AI_GATEWAY_BASE_URL.replace(/\/$/, '')}/chat/completions`
        : `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;

      let parsed: Partial<ResearchResponse> | null = null;

      if (process.env.AI_GATEWAY_BASE_URL) {
        const res = await fetch(endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            model: 'google/gemini-2.5-flash',
            messages: [{ role: 'user', content: prompt }],
            response_format: { type: 'json_object' },
          }),
        });
        if (res.ok) {
          const data = await res.json();
          const text = data.choices?.[0]?.message?.content;
          if (text) parsed = JSON.parse(text);
        }
      } else {
        const res = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { responseMimeType: 'application/json' },
          }),
        });
        if (res.ok) {
          const data = await res.json();
          const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
          if (text) parsed = JSON.parse(text);
        }
      }

      if (parsed && parsed.summary) {
        const fallback = buildGroundedFallback(product, question?.trim());
        return jsonResponse({
          success: true,
          research: {
            summary: parsed.summary,
            keyActivesAnalysis: Array.isArray(parsed.keyActivesAnalysis) ? parsed.keyActivesAnalysis : fallback.keyActivesAnalysis,
            layeringGuidance: parsed.layeringGuidance || fallback.layeringGuidance,
            cautions: parsed.cautions || fallback.cautions,
            source: 'AI_MODEL',
          } satisfies ResearchResponse,
        });
      }
    } catch (aiErr) {
      console.warn('AI skincare research fallback activated:', aiErr);
    }

    return jsonResponse({
      success: true,
      research: buildGroundedFallback(product, question?.trim()),
    });
  } catch (error) {
    return jsonResponse(
      { error: 'Failed to research product', message: error instanceof Error ? error.message : 'Error' },
      500
    );
  }
}
