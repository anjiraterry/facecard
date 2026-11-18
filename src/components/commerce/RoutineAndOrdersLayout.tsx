'use client';

import React from 'react';
import { Package, Sun, Moon, Layers, ArrowRight, Droplet } from 'lucide-react';
import { SurfaceCard } from '@/components/ui/SurfaceCard';
import { EmptyState } from '@/components/ui/StateViews';
import { Button } from '@/components/ui/Button';
import { AtelierOrderDTO, AtelierRecommendationDTO } from '@/services/atelierService';
import { formatNgnMinor } from '@/lib/atelier/serialize';

export function OrderHistoryLayout({ orders = [] }: { orders?: AtelierOrderDTO[] }) {
  if (orders.length === 0) {
    return (
      <EmptyState
        icon={<Package className="w-5 h-5" />}
        title="No Skincare Orders Yet"
        description="Your Atelier orders will appear here once you complete checkout."
      />
    );
  }

  return (
    <div className="space-y-3">
      {orders.map((order) => (
        <SurfaceCard key={order.id} variant="default" padding="sm" className="space-y-2">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-xs font-semibold text-[var(--text-main)] block">Order #{order.orderNumber}</span>
              <span className="text-[11px] text-[var(--text-muted)]">
                {new Date(order.placedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })} · {order.items.length} item(s)
              </span>
            </div>
            <div className="text-right tabular-nums">
              <span className="text-xs font-bold text-[var(--text-main)] block">
                {formatNgnMinor(Number(order.totalMinor))}
              </span>
              <span className="text-[10px] font-semibold text-[var(--accent-brand)]">
                {order.orderStatus} · {order.paymentStatus}
              </span>
            </div>
          </div>
          <div className="text-[11px] text-[var(--text-muted)] border-t border-[var(--border-subtle)] pt-1.5">
            {order.items.map((i) => `${i.quantity}× ${i.productNameSnapshot}`).join(', ')}
          </div>
        </SurfaceCard>
      ))}
    </div>
  );
}

export function PersonalRoutineLayout({
  recommendations = [],
  routines = [],
  onCreateRoutine,
  onSelectProductSlug,
}: {
  recommendations?: AtelierRecommendationDTO[];
  routines?: Array<{
    id: string;
    name: string;
    steps: Array<{
      id: string;
      timeOfDay: 'AM' | 'PM';
      stepNumber: number;
      stepTitle: string;
      guidance: string | null;
    }>;
  }>;
  onCreateRoutine?: () => void;
  onSelectProductSlug?: (slug: string) => void;
}) {
  const activeRoutine = routines[0];
  const amSteps = activeRoutine?.steps.filter((s) => s.timeOfDay === 'AM') || [];
  const pmSteps = activeRoutine?.steps.filter((s) => s.timeOfDay === 'PM') || [];

  return (
    <div className="space-y-6">
      <SurfaceCard variant="warm" padding="md" className="space-y-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Droplet className="w-4 h-4 text-[var(--accent-brand)]" />
            <h3 className="font-display text-xl font-semibold text-[var(--text-main)]">
              Personalised Formulations
            </h3>
          </div>
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-[0.08em] bg-[var(--bg-surface)] text-[var(--text-muted)] border border-[var(--border-card)]">
            Profile Match
          </span>
        </div>

        {recommendations.length === 0 ? (
          <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
            Complete the voluntary <strong>Skin Profile</strong> tab to receive deterministic formulation recommendations tailored to your skin type and goals.
          </p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {recommendations.slice(0, 4).map((rec) => (
              <button
                key={rec.productId}
                type="button"
                onClick={() => onSelectProductSlug?.(rec.slug)}
                className="p-3 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] text-left hover:border-[var(--accent-brand)] transition-colors cursor-pointer space-y-1"
              >
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-[var(--text-main)] truncate">{rec.name}</span>
                  <span className="font-bold text-[var(--accent-brand)] tabular-nums shrink-0">
                    {formatNgnMinor(Number(rec.minPriceMinor))}
                  </span>
                </div>
                <span className="text-[11px] text-[var(--text-muted)] block truncate">
                  {rec.reasons[0] || rec.brandName}
                </span>
              </button>
            ))}
          </div>
        )}
      </SurfaceCard>

      {!activeRoutine ? (
        <SurfaceCard variant="default" padding="md" className="text-center space-y-3">
          <Layers className="w-6 h-6 text-[var(--accent-brand)] mx-auto" />
          <p className="text-xs text-[var(--text-muted)]">
            Create your AM/PM daily ritual tracker to organise your skincare steps.
          </p>
          {onCreateRoutine && (
            <Button variant="primary" size="sm" onClick={onCreateRoutine}>
              Create Daily Ritual
            </Button>
          )}
        </SurfaceCard>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <SurfaceCard variant="default" padding="md" className="space-y-3">
            <div className="flex items-center gap-2 pb-2 border-b border-[var(--border-subtle)]">
              <Sun className="w-4 h-4 text-[var(--accent-brand)]" />
              <h4 className="font-display text-lg font-semibold text-[var(--text-main)]">Morning Ritual (AM)</h4>
            </div>
            <div className="space-y-2.5">
              {amSteps.map((step) => (
                <div
                  key={step.id}
                  className="p-3 rounded-2xl bg-[var(--bg-surface-warm)] border border-[var(--border-subtle)] flex items-center justify-between gap-3"
                >
                  <div className="min-w-0">
                    <span className="text-[10px] font-semibold uppercase tracking-[0.1em] text-[var(--accent-brand)] block">
                      Step 0{step.stepNumber}
                    </span>
                    <span className="text-xs font-semibold text-[var(--text-main)] block">{step.stepTitle}</span>
                    {step.guidance && (
                      <span className="text-[11px] text-[var(--text-muted)] block truncate">{step.guidance}</span>
                    )}
                  </div>
                  <ArrowRight className="w-3.5 h-3.5 text-[var(--text-muted)] shrink-0" />
                </div>
              ))}
            </div>
          </SurfaceCard>

          <SurfaceCard variant="default" padding="md" className="space-y-3">
            <div className="flex items-center gap-2 pb-2 border-b border-[var(--border-subtle)]">
              <Moon className="w-4 h-4 text-[var(--accent-brand)]" />
              <h4 className="font-display text-lg font-semibold text-[var(--text-main)]">Evening Ritual (PM)</h4>
            </div>
            <div className="space-y-2.5">
              {pmSteps.map((step) => (
                <div
                  key={step.id}
                  className="p-3 rounded-2xl bg-[var(--bg-surface-warm)] border border-[var(--border-subtle)] flex items-center justify-between gap-3"
                >
                  <div className="min-w-0">
                    <span className="text-[10px] font-semibold uppercase tracking-[0.1em] text-[var(--accent-brand)] block">
                      Step 0{step.stepNumber}
                    </span>
                    <span className="text-xs font-semibold text-[var(--text-main)] block">{step.stepTitle}</span>
                    {step.guidance && (
                      <span className="text-[11px] text-[var(--text-muted)] block truncate">{step.guidance}</span>
                    )}
                  </div>
                  <ArrowRight className="w-3.5 h-3.5 text-[var(--text-muted)] shrink-0" />
                </div>
              ))}
            </div>
          </SurfaceCard>
        </div>
      )}
    </div>
  );
}
