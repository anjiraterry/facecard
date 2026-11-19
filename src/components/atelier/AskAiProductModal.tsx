'use client';

import React, { useState } from 'react';
import { Check, Copy, ExternalLink, X } from 'lucide-react';
import {
  buildProductBreakdownPrompt,
  buildProductContext,
  EXTERNAL_ASSISTANT_ADAPTERS,
} from '@/lib/intelligence/externalAssistant';

export interface AskAiProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: {
    brandName?: string | null;
    name: string;
    variantLabel?: string | null;
    sizeLabel?: string | null;
    ingredients?: string | null;
    instructions?: string | null;
    officialUrl?: string | null;
    description?: string | null;
  } | null;
}

export function AskAiProductModal({ isOpen, onClose, product }: AskAiProductModalProps) {
  const [copied, setCopied] = useState(false);

  if (!isOpen || !product) return null;

  const ctx = buildProductContext({
    brandName: product.brandName,
    productName: product.name,
    variantLabel: product.variantLabel,
    sizeLabel: product.sizeLabel,
    ingredients: product.ingredients,
    instructions: product.instructions,
    officialUrl: product.officialUrl,
    description: product.description,
  });

  const prompt = buildProductBreakdownPrompt(ctx);
  const chatgpt = EXTERNAL_ASSISTANT_ADAPTERS.chatgpt;
  const launchUrl = chatgpt.buildLaunchUrl(prompt) ?? chatgpt.getFallbackUrl();

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(prompt);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback: user can select from the visible textarea
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Understand this product"
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-[#251E24]/60 backdrop-blur-xs p-4"
    >
      <div className="w-full max-w-lg rounded-3xl bg-[#FAF7F4] text-[#251E24] border border-[#E5DCE1] shadow-2xl p-6 space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="font-display text-xl font-semibold">Understand this product.</h2>
            <p className="text-xs text-[#6E6069] mt-1">
              Get an independent AI-assisted explanation of this product&apos;s ingredients, usage and suitability.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cancel"
            className="w-8 h-8 rounded-full bg-[#F1E6ED] flex items-center justify-center text-[#251E24] cursor-pointer shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="rounded-2xl bg-[#F1E6ED] border border-[#E5DCE1] px-4 py-3 text-xs">
          <span className="font-semibold">{ctx.brand}</span> · {ctx.productName}
        </div>

        <textarea
          readOnly
          value={prompt}
          rows={6}
          className="w-full rounded-2xl border border-[#E5DCE1] bg-white p-3 text-[11px] text-[#251E24] leading-relaxed focus:outline-none"
        />

        <p className="text-[11px] text-[#6E6069] leading-relaxed">
          You are opening an external AI service. Its responses and usage limits are governed by that service. Face Card does not control or verify its answers.
        </p>

        <div className="flex flex-wrap items-center justify-end gap-2 pt-1">
          <button
            type="button"
            onClick={onClose}
            className="px-4 h-10 rounded-full border border-[#E5DCE1] text-xs font-semibold text-[#251E24] cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleCopy}
            className="inline-flex items-center gap-1.5 px-4 h-10 rounded-full bg-[#EBDCD5] text-[#251E24] text-xs font-semibold cursor-pointer"
          >
            {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? 'Copied' : 'Copy question'}</span>
          </button>
          <a
            href={launchUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={handleCopy}
            className="inline-flex items-center gap-1.5 px-5 h-10 rounded-full bg-[#251E24] text-[#FAF7F4] text-xs font-semibold"
          >
            <span>Ask ChatGPT</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      </div>
    </div>
  );
}
