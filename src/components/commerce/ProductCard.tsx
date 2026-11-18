'use client';

import React from 'react';
import { Layers, Eye, ShoppingBag } from 'lucide-react';
import { SurfaceCard } from '@/components/ui/SurfaceCard';
import { Button } from '@/components/ui/Button';
import { AtelierProductDTO } from '@/services/atelierService';
import { formatNgnMinor } from '@/lib/atelier/serialize';

interface ProductCardProps {
  product?: AtelierProductDTO | null;
  onInspect?: (product: AtelierProductDTO) => void;
  onAddToBag?: (variantId: string, productName: string) => void;
  addingVariantId?: string | null;
}

/**
 * Reusable Soft Luxury Skincare Product Card connected to live Atelier catalogue.
 */
export function ProductCard({ product, onInspect, onAddToBag, addingVariantId }: ProductCardProps) {
  if (!product) {
    return (
      <SurfaceCard variant="default" padding="none" className="overflow-hidden flex flex-col justify-between animate-pulse">
        <div className="aspect-[4/5] w-full bg-[var(--surface-secondary)] border-b border-[var(--border)]" />
        <div className="p-3.5 space-y-2.5">
          <div className="h-3 w-20 rounded bg-[var(--surface-secondary)]" />
          <div className="h-4 w-3/4 rounded bg-[var(--surface-secondary)]" />
          <div className="h-3 w-full rounded bg-[var(--surface-secondary)]" />
        </div>
      </SurfaceCard>
    );
  }

  const primaryVariant = product.variants[0];
  const priceLabel = primaryVariant ? formatNgnMinor(Number(primaryVariant.priceMinor)) : '—';
  const inStock = Boolean(primaryVariant?.inStock);
  const isAdding = Boolean(primaryVariant && addingVariantId === primaryVariant.id);
  const primaryImage = (product.images?.find((i) => i.isPrimary) ?? product.images?.[0])?.objectKey;

  return (
    <SurfaceCard variant="default" padding="none" className="overflow-hidden flex flex-col justify-between group">
      {/* Full-bleed top visual slot */}
      <div
        onClick={() => onInspect?.(product)}
        className="relative aspect-[4/5] w-full bg-[var(--surface-secondary)] border-b border-[var(--border)] flex flex-col items-center justify-center overflow-hidden cursor-pointer"
      >
        <span className="absolute top-3 left-3 z-10 px-2.5 py-0.5 rounded-full bg-[var(--surface)] border border-[var(--border)] text-[10px] font-semibold text-[var(--foreground)] capitalize">
          {product.ritualStep.toLowerCase()}
        </span>
        {!inStock && (
          <span className="absolute top-3 right-3 z-10 px-2.5 py-0.5 rounded-full bg-[var(--status-danger-bg)] text-[var(--status-danger)] text-[10px] font-semibold">
            Out of stock
          </span>
        )}
        {primaryImage ? (
          <img
            src={primaryImage}
            alt={product.name}
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="p-4 text-center flex flex-col items-center justify-center">
            <Layers className="w-6 h-6 text-[var(--brand-plum)] mb-2 transition-transform duration-200 group-hover:scale-105" />
            <span className="text-[11px] font-medium text-[var(--foreground-muted)]">
              {primaryVariant?.sizeLabel || primaryVariant?.name || 'Standard'}
            </span>
          </div>
        )}
      </div>

      {/* Bottom details */}
      <div className="p-3.5 flex flex-col justify-between flex-1 space-y-3">
        <div className="space-y-1">
          <span className="text-[10px] font-semibold uppercase tracking-[0.1em] text-[var(--brand-plum)] block">
            {product.brand.name} · {product.category.name}
          </span>
          <h3
            onClick={() => onInspect?.(product)}
            className="text-base font-semibold text-[var(--foreground)] leading-snug cursor-pointer hover:text-[var(--brand-plum)] transition-colors"
          >
            {product.name}
          </h3>
          <p className="text-xs text-[var(--foreground-muted)] line-clamp-2">{product.subtitle || product.description}</p>
        </div>

        <div className="flex items-center justify-between pt-2 border-t border-[var(--border)] gap-2">
          <span className="text-sm font-bold text-[var(--foreground)] tabular-nums">
            {priceLabel}
          </span>
          <div className="flex items-center gap-1.5">
            {onInspect && (
              <Button variant="ghost" size="sm" onClick={() => onInspect(product)} aria-label={`Inspect ${product.name}`}>
                <Eye className="w-3.5 h-3.5" />
              </Button>
            )}
            <Button
              variant="primary"
              size="sm"
              disabled={!inStock || !primaryVariant || !onAddToBag}
              isLoading={isAdding}
              onClick={() => primaryVariant && onAddToBag?.(primaryVariant.id, product.name)}
            >
              <ShoppingBag className="w-3.5 h-3.5" />
              <span>{inStock ? 'Add' : 'Sold Out'}</span>
            </Button>
          </div>
        </div>
      </div>
    </SurfaceCard>
  );
}
