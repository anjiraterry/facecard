'use client';

import React, { useState, useEffect } from 'react';
import { Droplets, ShoppingBag, Star, FlaskConical, Send, CheckCircle2 } from 'lucide-react';
import { SurfaceCard } from '@/components/ui/SurfaceCard';
import { Button } from '@/components/ui/Button';
import {
  atelierService,
  AtelierProductDTO,
  AtelierResearchDTO,
  AtelierReviewDTO,
} from '@/services/atelierService';
import { formatNgnMinor } from '@/lib/atelier/serialize';

interface ProductDetailLayoutProps {
  product: AtelierProductDTO | null;
  onAddToBag?: (variantId: string, productName: string) => void;
  isAdding?: boolean;
}

const RESEARCH_PROMPTS = [
  'How do these active ingredients work together?',
  'Can I layer this with retinol or exfoliating acids?',
  'Is this suitable for sensitive or acne-prone skin?',
];

/**
 * Product Detail Page (PDP) layout with multi-image gallery, ratings & reviews,
 * and AI Skincare Researcher connected to live backend endpoints.
 */
export function ProductDetailLayout({ product, onAddToBag, isAdding }: ProductDetailLayoutProps) {
  const [selectedVariantId, setSelectedVariantId] = useState<string>(
    product?.variants[0]?.id || ''
  );
  const [activeImageIdx, setActiveImageIdx] = useState(0);

  // Reviews state
  const [reviews, setReviews] = useState<AtelierReviewDTO[]>(product?.reviews || []);
  const [avgRating, setAvgRating] = useState<number | null>(product?.averageRating ?? null);
  const [reviewCount, setReviewCount] = useState<number>(product?.reviewCount ?? (product?.reviews?.length || 0));
  const [ratingInput, setRatingInput] = useState(5);
  const [reviewTitle, setReviewTitle] = useState('');
  const [reviewBody, setReviewBody] = useState('');
  const [reviewStatus, setReviewStatus] = useState<string | null>(null);
  const [submittingReview, setSubmittingReview] = useState(false);

  // AI Research state
  const [researchQuestion, setResearchQuestion] = useState('');
  const [researchResult, setResearchResult] = useState<AtelierResearchDTO | null>(null);
  const [researchLoading, setResearchLoading] = useState(false);

  useEffect(() => {
    setSelectedVariantId(product?.variants[0]?.id || '');
    setActiveImageIdx(0);
    setReviews(product?.reviews || []);
    setAvgRating(product?.averageRating ?? null);
    setReviewCount(product?.reviewCount ?? (product?.reviews?.length || 0));
    setResearchResult(null);
    setReviewStatus(null);
  }, [product]);

  if (!product) {
    return (
      <SurfaceCard variant="default" padding="lg" className="text-center text-xs text-[var(--text-muted)]">
        Select any product from the catalogue to inspect formulation details, reviews, and AI research.
      </SurfaceCard>
    );
  }

  const images = product.images || [];
  const activeImage = images[activeImageIdx] ?? images[0];
  const selectedVariant =
    product.variants.find((v) => v.id === selectedVariantId) ?? product.variants[0];
  const priceLabel = selectedVariant ? formatNgnMinor(Number(selectedVariant.priceMinor)) : '—';

  const handleResearch = async (promptOverride?: string) => {
    const q = (promptOverride ?? researchQuestion).trim();
    setResearchLoading(true);
    try {
      const res = await atelierService.researchProduct(product.slug, q || undefined);
      setResearchResult(res.research);
      if (promptOverride) setResearchQuestion(promptOverride);
    } catch {
      setResearchResult(null);
    } finally {
      setResearchLoading(false);
    }
  };

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    setReviewStatus(null);
    setSubmittingReview(true);
    try {
      const res = await atelierService.submitProductReview(product.slug, {
        rating: ratingInput,
        title: reviewTitle.trim() || undefined,
        body: reviewBody.trim(),
      });
      const updated = [res.review, ...reviews.filter((r) => r.id !== res.review.id)];
      setReviews(updated);
      setReviewCount(updated.length);
      setAvgRating(
        Number((updated.reduce((sum, r) => sum + r.rating, 0) / updated.length).toFixed(1))
      );
      setReviewTitle('');
      setReviewBody('');
      setReviewStatus('Review published.');
    } catch (err) {
      setReviewStatus(
        err instanceof Error && err.message.toLowerCase().includes('unauth')
          ? 'Please sign in to post a review.'
          : err instanceof Error
          ? err.message
          : 'Sign in required to submit a review.'
      );
    } finally {
      setSubmittingReview(false);
    }
  };

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        {/* Multi-Image Gallery */}
        <div className="space-y-3">
          <SurfaceCard variant="warm" padding="none" className="aspect-[4/5] flex flex-col items-center justify-center overflow-hidden text-center">
            {activeImage ? (
              <img
                src={activeImage.objectKey}
                alt={activeImage.altText || product.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="p-8 space-y-3 flex flex-col items-center justify-center">
                <div className="w-14 h-14 rounded-full bg-[var(--bg-surface)] border border-[var(--border-card)] flex items-center justify-center text-[var(--accent-brand)]">
                  <Droplets className="w-6 h-6" />
                </div>
                <p className="text-xs text-[var(--text-muted)] max-w-xs">{product.description}</p>
              </div>
            )}
          </SurfaceCard>

          {images.length > 1 && (
            <div className="grid grid-cols-4 sm:grid-cols-5 gap-2.5">
              {images.map((img, idx) => (
                <button
                  key={img.id}
                  type="button"
                  onClick={() => setActiveImageIdx(idx)}
                  className={`aspect-square rounded-xl overflow-hidden border-2 transition-all cursor-pointer ${
                    idx === activeImageIdx
                      ? 'border-[var(--brand-plum)] ring-2 ring-[var(--brand-plum)]/20'
                      : 'border-[var(--border)] opacity-75 hover:opacity-100'
                  }`}
                >
                  <img
                    src={img.objectKey}
                    alt={img.altText || `${product.name} view ${idx + 1}`}
                    className="w-full h-full object-cover"
                  />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Core Product Details */}
        <SurfaceCard variant="default" padding="lg" className="space-y-5">
          <div className="space-y-1.5">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--accent-brand)]">
                {product.category.name} · {selectedVariant?.sizeLabel || selectedVariant?.name || 'Standard'}
              </span>
              {avgRating ? (
                <span className="inline-flex items-center gap-1 text-xs font-semibold text-[var(--foreground)] tabular-nums">
                  <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                  {avgRating} · {reviewCount} {reviewCount === 1 ? 'review' : 'reviews'}
                </span>
              ) : (
                <span className="text-[11px] text-[var(--text-muted)]">No reviews yet</span>
              )}
            </div>
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
                      v.id === selectedVariant?.id
                        ? 'bg-[var(--primary)] text-[var(--primary-foreground)] border-transparent'
                        : 'bg-[var(--surface)] border-[var(--border)] text-[var(--foreground)]'
                    }`}
                  >
                    {v.sizeLabel || v.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          {product.benefits.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-xs font-semibold uppercase tracking-[0.1em] text-[var(--text-muted)]">
                Key Benefits
              </h3>
              <ul className="space-y-1.5 text-xs text-[var(--text-secondary)]">
                {product.benefits.map((b) => (
                  <li key={b} className="flex items-start gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent-brand)] mt-1.5 shrink-0" />
                    <span>{b}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {product.ingredients && product.ingredients.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-xs font-semibold uppercase tracking-[0.1em] text-[var(--text-muted)]">
                Key Actives
              </h3>
              <div className="flex flex-wrap gap-1.5">
                {product.ingredients.map((item) => (
                  <span
                    key={item.ingredient.id}
                    className="px-2.5 py-1 rounded-full bg-[var(--surface-secondary)] border border-[var(--border)] text-[11px] font-medium text-[var(--foreground)]"
                  >
                    {item.ingredient.name}
                  </span>
                ))}
              </div>
            </div>
          )}

          {product.howToUse && (
            <div className="space-y-1 text-xs text-[var(--text-secondary)] bg-[var(--surface-secondary)] p-3 rounded-xl">
              <span className="font-semibold text-[var(--foreground)] block">How to Use</span>
              <p className="leading-relaxed">{product.howToUse}</p>
            </div>
          )}

          <div className="space-y-2 pt-1">
            <Button
              variant="primary"
              size="lg"
              fullWidth
              disabled={!selectedVariant?.inStock || isAdding}
              isLoading={isAdding}
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

      {/* AI Skincare Researcher */}
      <SurfaceCard variant="warm" padding="lg" className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-[var(--brand-plum)]">
              <FlaskConical className="w-4 h-4" />
              <span className="text-[10px] font-semibold uppercase tracking-[0.16em]">
                AI Formulation Research
              </span>
            </div>
            <h3 className="font-display text-2xl font-semibold text-[var(--foreground)]">
              Ask About This Formula
            </h3>
            <p className="text-xs text-[var(--foreground-secondary)]">
              Get deeper ingredient breakdowns, routine layering advice, and skin-type compatibility insights.
            </p>
          </div>
          <Button
            variant="secondary"
            size="sm"
            isLoading={researchLoading}
            onClick={() => handleResearch()}
          >
            Generate Full Breakdown
          </Button>
        </div>

        <div className="flex flex-wrap gap-2">
          {RESEARCH_PROMPTS.map((prompt) => (
            <button
              key={prompt}
              type="button"
              onClick={() => handleResearch(prompt)}
              className="px-3 py-1.5 rounded-full bg-[var(--surface)] border border-[var(--border)] text-[11px] font-medium text-[var(--foreground-secondary)] hover:text-[var(--foreground)] hover:border-[var(--brand-plum)] transition-colors cursor-pointer"
            >
              {prompt}
            </button>
          ))}
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleResearch();
          }}
          className="flex gap-2"
        >
          <input
            type="text"
            value={researchQuestion}
            onChange={(e) => setResearchQuestion(e.target.value)}
            placeholder="Ask a specific question about ingredients, layering, or skin sensitivity..."
            className="flex-1 h-10 px-4 rounded-full bg-[var(--surface)] border border-[var(--border)] text-xs text-[var(--foreground)] placeholder:text-[var(--foreground-muted)] focus:outline-none focus:border-[var(--brand-plum)]"
          />
          <Button type="submit" variant="primary" size="sm" isLoading={researchLoading}>
            <Send className="w-3.5 h-3.5" />
            Ask
          </Button>
        </form>

        {researchResult && (
          <div className="rounded-2xl bg-[var(--surface)] border border-[var(--border)] p-4 space-y-3 text-xs">
            <div className="flex items-center justify-between gap-2">
              <span className="font-semibold text-[var(--foreground)]">Research Summary</span>
              <span className="text-[10px] uppercase tracking-wider text-[var(--foreground-muted)]">
                {researchResult.source === 'AI_MODEL' ? 'AI Model Analysis' : 'Formulation Database'}
              </span>
            </div>
            <p className="text-[var(--foreground-secondary)] leading-relaxed">{researchResult.summary}</p>
            {researchResult.keyActivesAnalysis.length > 0 && (
              <div className="space-y-1">
                <span className="font-semibold text-[var(--foreground)] block">Active Ingredients</span>
                <ul className="space-y-1 text-[var(--foreground-secondary)]">
                  {researchResult.keyActivesAnalysis.map((line) => (
                    <li key={line}>• {line}</li>
                  ))}
                </ul>
              </div>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <div className="p-3 rounded-xl bg-[var(--surface-secondary)] space-y-1">
                <span className="font-semibold text-[var(--foreground)] block">Layering Guidance</span>
                <p className="text-[var(--foreground-secondary)] leading-relaxed">{researchResult.layeringGuidance}</p>
              </div>
              <div className="p-3 rounded-xl bg-[var(--surface-secondary)] space-y-1">
                <span className="font-semibold text-[var(--foreground)] block">Cautions</span>
                <p className="text-[var(--foreground-secondary)] leading-relaxed">{researchResult.cautions}</p>
              </div>
            </div>
          </div>
        )}
      </SurfaceCard>

      {/* Ratings & Customer Reviews */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <SurfaceCard variant="default" padding="lg" className="lg:col-span-7 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-display text-xl font-semibold text-[var(--foreground)]">
                Customer Reviews ({reviewCount})
              </h3>
              <p className="text-xs text-[var(--text-muted)]">
                {avgRating ? `Average rating ${avgRating} out of 5` : 'Be the first to review this formulation.'}
              </p>
            </div>
            {avgRating && (
              <div className="flex items-center gap-1 text-sm font-bold">
                <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                <span>{avgRating}</span>
              </div>
            )}
          </div>

          <div className="divide-y divide-[var(--border)]">
            {reviews.length === 0 ? (
              <p className="text-xs text-[var(--text-muted)] py-4">No reviews yet.</p>
            ) : (
              reviews.map((rev) => (
                <div key={rev.id} className="py-3.5 space-y-1.5 text-xs">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5">
                      <div className="flex items-center">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <Star
                            key={i}
                            className={`w-3.5 h-3.5 ${
                              i < rev.rating ? 'fill-amber-400 text-amber-400' : 'text-[var(--border-strong)]'
                            }`}
                          />
                        ))}
                      </div>
                      {rev.title && <span className="font-semibold text-[var(--foreground)]">{rev.title}</span>}
                    </div>
                    {rev.verifiedPurchase && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-600">
                        <CheckCircle2 className="w-3 h-3" /> Verified Buyer
                      </span>
                    )}
                  </div>
                  <p className="text-[var(--foreground-secondary)] leading-relaxed">{rev.body}</p>
                  <p className="text-[11px] text-[var(--text-muted)]">
                    {rev.user.displayName}
                    {rev.skinType ? ` · ${rev.skinType.toLowerCase()} skin` : ''} ·{' '}
                    {new Date(rev.createdAt).toLocaleDateString()}
                  </p>
                </div>
              ))
            )}
          </div>
        </SurfaceCard>

        <SurfaceCard variant="default" padding="lg" className="lg:col-span-5 space-y-4">
          <h3 className="font-display text-xl font-semibold text-[var(--foreground)]">
            Write a Review
          </h3>
          <form onSubmit={handleSubmitReview} className="space-y-3 text-xs">
            <div className="space-y-1">
              <span className="font-semibold text-[var(--foreground)] block">Rating</span>
              <div className="flex items-center gap-1.5">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setRatingInput(star)}
                    className="p-1 cursor-pointer"
                    aria-label={`Rate ${star} stars`}
                  >
                    <Star
                      className={`w-5 h-5 ${
                        star <= ratingInput ? 'fill-amber-400 text-amber-400' : 'text-[var(--border-strong)]'
                      }`}
                    />
                  </button>
                ))}
              </div>
            </div>
            <input
              type="text"
              value={reviewTitle}
              onChange={(e) => setReviewTitle(e.target.value)}
              placeholder="Headline (optional)"
              className="w-full h-10 px-3 rounded-xl bg-[var(--surface-secondary)] border border-[var(--border)] text-xs text-[var(--foreground)]"
            />
            <textarea
              required
              minLength={5}
              rows={3}
              value={reviewBody}
              onChange={(e) => setReviewBody(e.target.value)}
              placeholder="Share how this formulation felt on your skin..."
              className="w-full p-3 rounded-xl bg-[var(--surface-secondary)] border border-[var(--border)] text-xs text-[var(--foreground)]"
            />
            {reviewStatus && (
              <p className="text-[11px] text-[var(--brand-plum)] font-medium">{reviewStatus}</p>
            )}
            <Button type="submit" variant="primary" size="md" fullWidth isLoading={submittingReview}>
              Submit Review
            </Button>
          </form>
        </SurfaceCard>
      </div>
    </div>
  );
}
