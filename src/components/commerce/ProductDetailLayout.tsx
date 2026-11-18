'use client';

import React, { useState } from 'react';
import { Layers, Droplets, ShoppingBag } from 'lucide-react';
import { SurfaceCard } from '@/components/ui/SurfaceCard';
import { Button } from '@/components/ui/Button';
import { AtelierProductDTO } from '@/services/atelierService';
import { formatNgnMinor } from '@/lib/atelier/serialize';

interface ProductDetailLayoutProps {
  product?: AtelierProductDTO | null;
  onAddToBag?: (variantId: string, productName: string) => void;
  isAdding?: boolean;
}

/**
 * Product Detail Page (PDP) layout connected to live AtelierProductDTO.
 */
export function ProductDetailLayout({ product, onAddToBag, isAdding }: ProductDetailLayoutProps) {
  const [selectedVariantId, setSelectedVariantId] = useState<string | null>(null);

  if (!product) {
    return (
      <SurfaceCard variant="default" padding="lg" className="text-center space-y-2">
        <p className="text-sm font-semibold text-[var(--foreground)]">Select a formulation from the Catalogue</p>
        <p className="text-xs text-[var(--foreground-muted)]">
          Tap any product card or inspect button to view full ingredients, ritual guidance, and variant pricing.
        </p>
      </SurfaceCard>
    );
  }

  const selectedVariant =
    product.variants.find((v) => v.id === selectedVariantId) || product.variants[0] || null;

  const priceLabel = selectedVariant ? formatNgnMinor(Number(selectedVariant.priceMinor)) : 'Unavailable';
  const keyNotes = product.ingredients?.map((i) => i.ingredient.name) || product.benefits || [];

  const primaryImage = (product.images?.find((i) => i.isPrimary) ?? product.images?.[0])?.objectKey;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
      <SurfaceCard variant="warm" padding="none" className="aspect-[4/5] flex flex-col items-center justify-center overflow-hidden text-center">
        {primaryImage ? (
          <img
            src={primaryImage}
            alt={product.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="p-8 space-y-3 flex flex-col items-center justify-center">
            <div className="w-14 h-14 rounded-full bg-[var(--bg-surface)] border border-[var(--border-card)] flex items-center justify-center text-[var(--accent-brand)]">
              <Droplets className="w-6 h-6" />
            </div>
            <div className="space-y-1 max-w-xs">
              <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--accent-brand)] block">
                {product.brand.name} · {product.ritualStep}
              </span>
              <p className="text-xs text-[var(--text-muted)] leading-relaxed">
                {product.howToUse || product.description}
              </p>
            </div>
          </div>
        )}
      </SurfaceCard>

      <SurfaceCard variant="default" padding="lg" className="space-y-5">
        <div className="space-y-1.5">
          <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--accent-brand)]">
            {product.category.name} · {selectedVariant?.sizeLabel || selectedVariant?.name || 'Standard'}
          </span>
          <h2 className="font-display text-3xl font-semibold text-[var(--text-main)] leading-tight">
            {product.name}
          </h2>
          <p className="text-xs sm:text-sm text-[var(--text-secondary)] leading-relaxed">
            {product.subtitle || product.description}
          </p>
        </div>

        <div className="flex items-baseline justify-between py-3 border-y border-[var(--border-subtle)]">
          <span className="text-xs font-semibold uppercase tracking-[0.1em] text-[var(--text-muted)]">
            Retail Price
          </span>
          <span className="text-lg font-bold text-[var(--text-main)] tabular-nums">
            {priceLabel}
          </span>
        </div>

        {product.variants.length > 1 && (
          <div className="space-y-2">
            <h3 className="text-xs font-semibold uppercase tracking-[0.1em] text-[var(--text-muted)]">
              Select Size
            </h3>
            <div className="flex flex-wrap gap-2">
              {product.variants.map((v) => (
                <button
                  key={v.id}
                  type="button"
                  onClick={() => setSelectedVariantId(v.id)}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors cursor-pointer ${
                    selectedVariant?.id === v.id
                      ? 'bg-[var(--primary)] text-[var(--primary-foreground)] border-transparent'
                      : 'bg-[var(--surface-secondary)] text-[var(--foreground)] border-[var(--border)]'
                  }`}
                >
                  {v.sizeLabel || v.name}
                </button>
              ))}
            </div>
          </div>
        )}

        {keyNotes.length > 0 && (
          <div className="space-y-2.5">
            <h3 className="text-xs font-semibold uppercase tracking-[0.1em] text-[var(--text-muted)]">
              Key Botanical &amp; Active Notes
            </h3>
            <div className="flex flex-wrap gap-2">
              {keyNotes.map((note) => (
                <span
                  key={note}
                  className="px-3 py-1 rounded-full bg-[var(--bg-surface-warm)] border border-[var(--border-subtle)] text-xs font-medium text-[var(--text-main)]"
                >
                  {note}
                </span>
              ))}
            </div>
          </div>
        )}

        <div className="p-3.5 rounded-2xl bg-[var(--bg-surface-warm)] border border-[var(--border-subtle)] space-y-1">
          <span className="text-xs font-semibold text-[var(--text-main)] flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5 text-[var(--accent-brand)]" />
            <span>Formulation Overview</span>
          </span>
          <p className="text-xs text-[var(--text-muted)]">{product.description}</p>
        </div>

        <div className="space-y-2 pt-1">
          <Button
            variant="primary"
            size="lg"
            fullWidth
            isLoading={isAdding}
            disabled={!selectedVariant || !selectedVariant.inStock || !onAddToBag}
            onClick={() => selectedVariant && onAddToBag?.(selectedVariant.id, product.name)}
          >
            <ShoppingBag className="w-4 h-4" />
            <span>
              {selectedVariant?.inStock
                ? `Add to Bag · ${priceLabel}`
                : 'Currently Out of Stock'}
            </span>
          </Button>
          <p className="text-[11px] text-center text-[var(--text-muted)]">
            {selectedVariant
              ? `${selectedVariant.availableStock} unit(s) available in Lagos Flagship Hub`
              : 'Unavailable'}
          </p>
        </div>
      </SurfaceCard>
    </div>
  );
}
