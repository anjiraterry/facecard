'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { Search, ArrowLeft, ArrowRight } from 'lucide-react';
import { SurfaceCard } from '@/components/ui/SurfaceCard';
import { Button } from '@/components/ui/Button';
import { ProductCard } from '@/components/commerce/ProductCard';
import { ProductDetailLayout } from '@/components/commerce/ProductDetailLayout';
import { useAuth } from '@/hooks/useAuth';
import { atelierService, AtelierProductDTO } from '@/services/atelierService';

const CATEGORIES = [
  { id: 'ALL', label: 'All' },
  { id: 'cleansers', label: 'Cleansers' },
  { id: 'serums', label: 'Serums' },
  { id: 'moisturizers', label: 'Moisturisers' },
  { id: 'sun-care', label: 'SPF' },
  { id: 'ritual-sets', label: 'Ritual Sets' },
];

export default function PublicAtelierPage() {
  const { user } = useAuth();
  const [activeCategory, setActiveCategory] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [products, setProducts] = useState<AtelierProductDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedProduct, setSelectedProduct] = useState<AtelierProductDTO | null>(null);

  const loadProducts = useCallback(async () => {
    setLoading(true);
    try {
      const res = await atelierService.getProducts({
        q: searchQuery.trim() || undefined,
        category: activeCategory,
      });
      setProducts(res.products || []);
    } catch {
      setProducts([]);
    } finally {
      setLoading(false);
    }
  }, [activeCategory, searchQuery]);

  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  const handleInspect = async (product: AtelierProductDTO) => {
    try {
      const res = await atelierService.getProductBySlug(product.slug);
      setSelectedProduct(res.product);
    } catch {
      setSelectedProduct(product);
    }
  };

  return (
    <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)] font-sans antialiased">
      {/* Public Top Navigation (No Sidebar) */}
      <header className="sticky top-0 z-30 border-b border-[var(--border)] bg-[var(--background)]/90 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-5 sm:px-8 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Link href="/" className="font-display text-xl font-semibold tracking-tight">
              facecard<span className="text-[var(--brand-plum)]">.</span>
            </Link>
            <span className="text-xs font-medium text-[var(--foreground-muted)] hidden sm:inline">
              / Atelier
            </span>
          </div>
          <div className="flex items-center gap-2.5">
            {user ? (
              <Link href="/skincare">
                <Button variant="primary" size="sm">Open My Atelier</Button>
              </Link>
            ) : (
              <>
                <Link href="/sign-in">
                  <Button variant="ghost" size="sm">Sign In</Button>
                </Link>
                <Link href="/onboarding">
                  <Button variant="primary" size="sm">Claim Face Card</Button>
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-5 sm:px-8 py-8 space-y-6">
        {selectedProduct ? (
          <div className="space-y-4">
            <Button variant="ghost" size="sm" onClick={() => setSelectedProduct(null)}>
              <ArrowLeft className="w-3.5 h-3.5" /> Back to Catalogue
            </Button>
            <ProductDetailLayout
              product={selectedProduct}
              onAddToBag={() => {
                window.location.href = user ? '/skincare' : '/sign-in';
              }}
            />
          </div>
        ) : (
          <>
            <SurfaceCard variant="warm" padding="lg" className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="space-y-1 max-w-2xl">
                <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--brand-plum)]">
                  The Atelier
                </span>
                <h1 className="font-display text-2xl sm:text-3xl font-semibold">
                  Barrier-First Formulations
                </h1>
                <p className="text-xs sm:text-sm text-[var(--foreground-secondary)]">
                  Browse our curated skincare collection. Sign in to build a personalised AM/PM routine, save your skin profile, and check out in NGN.
                </p>
              </div>
              <Link href={user ? '/skincare' : '/sign-in'}>
                <Button variant="secondary" size="sm">
                  {user ? 'Go to Personalised Atelier' : 'Sign In to Personalise'}
                  <ArrowRight className="w-3.5 h-3.5" />
                </Button>
              </Link>
            </SurfaceCard>

            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-[var(--foreground-muted)] absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search cleansers, niacinamide, SPF..."
                  className="w-full h-11 pl-10 pr-4 rounded-full bg-[var(--surface)] border border-[var(--border)] text-xs text-[var(--foreground)] placeholder:text-[var(--foreground-muted)] focus:outline-none focus:border-[var(--brand-plum)]"
                />
              </div>
              <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
                {CATEGORIES.map((cat) => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setActiveCategory(cat.id)}
                    className={`px-3.5 h-10 rounded-full text-xs font-semibold shrink-0 transition-colors cursor-pointer ${
                      activeCategory === cat.id
                        ? 'bg-[var(--primary)] text-[var(--primary-foreground)]'
                        : 'bg-[var(--surface)] border border-[var(--border)] text-[var(--foreground-muted)]'
                    }`}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {loading
                ? Array.from({ length: 6 }).map((_, idx) => <ProductCard key={idx} product={null} />)
                : products.map((product) => (
                    <ProductCard
                      key={product.id}
                      product={product}
                      onInspect={handleInspect}
                      onAddToBag={() => {
                        window.location.href = user ? '/skincare' : '/sign-in';
                      }}
                    />
                  ))}
            </div>
          </>
        )}
      </main>
    </div>
  );
}
