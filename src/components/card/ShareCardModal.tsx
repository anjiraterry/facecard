'use client';

import React, { useRef, useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { FaceCardData } from '@/types';
import { Button } from '@/components/ui/Button';
import { TIER_MATERIALS } from './materials';
import { drawEngravingOnCanvas, generateContourEngraving } from './engraving';

interface ShareCardModalProps {
  isOpen: boolean;
  onClose: () => void;
  card: FaceCardData;
}

export function ShareCardModal({ isOpen, onClose, card }: ShareCardModalProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [shareUrl, setShareUrl] = useState<string>('');
  const [isCopied, setIsCopied] = useState(false);
  const [previewDataUrl, setPreviewDataUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;

    async function renderCanvas() {
      if (typeof document !== 'undefined' && document.fonts?.ready) {
        await document.fonts.ready;
      }
      if (!isMounted) return;
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const width = 1080;
      const height = 1920;
      canvas.width = width;
      canvas.height = height;

      // Soft Luxury Black Plum Backdrop
      const bgGrad = ctx.createLinearGradient(0, 0, 0, height);
      bgGrad.addColorStop(0, '#251E24');
      bgGrad.addColorStop(0.5, '#1D171C');
      bgGrad.addColorStop(1, '#141013');
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, width, height);

      // Subtle Dusty Mauve Ambient Glow
      const radGrad = ctx.createRadialGradient(width / 2, 420, 40, width / 2, 420, 680);
      radGrad.addColorStop(0, 'rgba(210, 184, 201, 0.18)');
      radGrad.addColorStop(1, 'rgba(210, 184, 201, 0)');
      ctx.fillStyle = radGrad;
      ctx.fillRect(0, 0, width, height);

      // Header Branding
      ctx.font = '700 40px "Plus Jakarta Sans", "Manrope", sans-serif';
      ctx.fillStyle = '#FAF7F4';
      ctx.textAlign = 'center';
      ctx.fillText('FACE CARD', width / 2, 220);

      ctx.font = '600 20px "Manrope", sans-serif';
      ctx.fillStyle = '#D2B8C9';
      ctx.fillText('OFFICIAL COLLECTIBLE EDITION', width / 2, 268);

      const cardW = 856;
      const cardH = 540;
      const cardX = (width - cardW) / 2;
      const cardY = 360;
      const cardRadius = Math.round(cardW * 0.045);

      const mat = TIER_MATERIALS[card.tier] || TIER_MATERIALS.CLASSIC;
      const cardGrad = ctx.createLinearGradient(cardX, cardY, cardX + cardW, cardY + cardH);
      cardGrad.addColorStop(0, mat.highlight);
      cardGrad.addColorStop(0.5, mat.midtone);
      cardGrad.addColorStop(1, mat.shadow);

      ctx.save();
      ctx.beginPath();
      ctx.roundRect(cardX, cardY, cardW, cardH, cardRadius);
      ctx.fillStyle = cardGrad;
      ctx.shadowColor = 'rgba(0, 0, 0, 0.45)';
      ctx.shadowBlur = 48;
      ctx.shadowOffsetY = 20;
      ctx.fill();
      ctx.restore();

      // Clip and render deterministic Contour Engraving inside the card
      const engravingSeed =
        card.id || card.cardNumber || card.handle || card.cardholderName || 'facecard';
      const pattern = generateContourEngraving(engravingSeed);
      ctx.save();
      ctx.beginPath();
      ctx.roundRect(cardX, cardY, cardW, cardH, cardRadius);
      ctx.clip();
      drawEngravingOnCanvas(
        ctx,
        pattern,
        cardX,
        cardY,
        cardW,
        cardH,
        mat.engravingDarkColor,
        mat.engravingDarkOpacity,
        mat.engravingLightColor,
        mat.engravingLightOpacity
      );
      ctx.restore();

      ctx.save();
      ctx.beginPath();
      ctx.roundRect(cardX, cardY, cardW, cardH, cardRadius);
      ctx.strokeStyle = mat.edgeHighlight;
      ctx.globalAlpha = 0.55;
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.restore();

      const textColor = mat.typography;
      const subColor = mat.mutedTypography;

      ctx.font = '700 28px "Plus Jakarta Sans", "Manrope", sans-serif';
      ctx.fillStyle = textColor;
      ctx.textAlign = 'left';
      ctx.fillText('FACE CARD', cardX + 52, cardY + 74);

      ctx.font = '600 20px "Manrope", sans-serif';
      ctx.textAlign = 'right';
      ctx.fillStyle = subColor;
      ctx.fillText(`${card.tier} EDITION`, cardX + cardW - 52, cardY + 74);

      ctx.font = '600 18px "Manrope", sans-serif';
      ctx.textAlign = 'left';
      ctx.fillStyle = subColor;
      ctx.fillText('CARDHOLDER', cardX + 52, cardY + 382);

      const displayName = card.cardholderName.trim().split(/\s+/).slice(0, 2).join(' ');
      ctx.font = '700 42px "Plus Jakarta Sans", "Manrope", sans-serif';
      ctx.fillStyle = textColor;
      ctx.fillText(displayName, cardX + 52, cardY + 446);

      ctx.font = '600 18px "Manrope", sans-serif';
      ctx.textAlign = 'right';
      ctx.fillStyle = subColor;
      ctx.fillText('HARMONY INDEX', cardX + cardW - 52, cardY + 368);

      ctx.font = '600 72px "Plus Jakarta Sans", "Manrope", sans-serif';
      ctx.fillStyle = textColor;
      ctx.fillText(`${card.score ?? 84}`, cardX + cardW - 130, cardY + 446);

      ctx.font = '600 26px "Manrope", sans-serif';
      ctx.fillStyle = subColor;
      ctx.fillText('/100', cardX + cardW - 52, cardY + 446);

      const statsY = 980;
      ctx.textAlign = 'center';
      ctx.font = '600 26px sans-serif';
      ctx.fillStyle = '#EBDCD5';
      ctx.fillText(`EDITION: ${card.band || 'MAGNETIC'}`, width / 2, statsY);

      if (card.streakDays) {
        ctx.font = '500 24px sans-serif';
        ctx.fillStyle = '#D2B8C9';
        ctx.fillText(`${card.streakDays}-Day Ritual Streak · ×${card.multiplier ?? 1.0}`, width / 2, statsY + 54);
      }

      const boxY = 1140;
      ctx.save();
      ctx.beginPath();
      ctx.roundRect(160, boxY, 760, 190, 28);
      ctx.fillStyle = 'rgba(235, 220, 213, 0.06)';
      ctx.strokeStyle = 'rgba(235, 220, 213, 0.16)';
      ctx.lineWidth = 2;
      ctx.fill();
      ctx.stroke();
      ctx.restore();

      ctx.font = '700 32px "Plus Jakarta Sans", "Manrope", sans-serif';
      ctx.fillStyle = '#FAF7F4';
      ctx.textAlign = 'center';
      ctx.fillText('Face card never declines.', width / 2, boxY + 78);

      ctx.font = '500 22px sans-serif';
      ctx.fillStyle = '#D2B8C9';
      ctx.fillText('Editorial photo craft & facial harmony.', width / 2, boxY + 128);

      ctx.font = '500 18px sans-serif';
      ctx.fillStyle = '#EBDCD5';
      ctx.fillText('Zero raw selfie storage · On-device privacy first', width / 2, 1720);

      ctx.font = '700 22px "Plus Jakarta Sans", "Manrope", sans-serif';
      ctx.fillStyle = '#FAF7F4';
      ctx.fillText('facecard.app', width / 2, 1780);

      try {
        setPreviewDataUrl(canvas.toDataURL('image/png'));
      } catch {}
    }

    async function initShare() {
      try {
        const res = await fetch('/api/share-cards', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            cardId: card.id,
            format: '1080x1920',
            score: card.score ?? 84,
            tier: card.tier,
          }),
        });
        const data = await res.json();
        if (isMounted && data.shareUrl) {
          setShareUrl(data.shareUrl);
        } else if (isMounted) {
          setShareUrl(`${window.location.origin}/s/${data.publicId || 'preview'}`);
        }
      } catch {
        if (isMounted) {
          setShareUrl(`${window.location.origin}/card`);
        }
      }

      setTimeout(() => {
        if (!isMounted) return;
        renderCanvas();
      }, 80);
    }

    initShare();

    return () => {
      isMounted = false;
    };
  }, [isOpen, card]);

  const handleDownload = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const link = document.createElement('a');
    link.download = `facecard-${card.cardholderName.toLowerCase().replace(/\s+/g, '-')}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  };

  const handleWebShare = async () => {
    const targetUrl = shareUrl || window.location.href;
    if (navigator.share) {
      try {
        await navigator.share({
          title: `${card.cardholderName}'s Face Card`,
          text: `My Face Card (${card.tier} Tier) — Harmony Index ${card.score ?? 84}/100.`,
          url: targetUrl,
        });
      } catch {}
    } else {
      copyLink();
    }
  };

  const copyLink = () => {
    const targetUrl = shareUrl || window.location.href;
    navigator.clipboard?.writeText(targetUrl);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Share Face Card"
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#251E24]/70 backdrop-blur-xs"
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.96 }}
          className="relative w-full max-w-sm rounded-[28px] bg-[var(--bg-surface)] text-[var(--text-main)] border border-[var(--border-card)] p-5 shadow-[var(--shadow-modal)] space-y-4"
        >
          <div className="flex items-center justify-between">
            <h2 className="font-display text-lg font-semibold">Share Face Card</h2>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close share modal"
              className="w-8 h-8 rounded-full bg-[var(--bg-surface-warm)] flex items-center justify-center hover:bg-[var(--bg-secondary)] transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="relative aspect-[9/16] max-h-[360px] w-full mx-auto rounded-2xl overflow-hidden border border-[var(--border-card)] bg-[#251E24] flex items-center justify-center">
            {previewDataUrl ? (
              <img
                src={previewDataUrl}
                alt="Face Card Story Graphic"
                className="w-full h-full object-contain"
              />
            ) : (
              <div className="text-center text-xs text-[#EBDCD5] space-y-2">
                <div className="w-6 h-6 border-2 border-[#D2B8C9] border-t-transparent rounded-full animate-spin mx-auto" />
                <p>Preparing 1080×1920 Story Card...</p>
              </div>
            )}
            <canvas ref={canvasRef} className="hidden" />
          </div>

          <p className="text-center text-[11px] text-[var(--status-success)] font-medium">
            Zero selfie exposure · Card status only
          </p>

          <div className="space-y-2 pt-1">
            <div className="grid grid-cols-2 gap-2">
              <Button variant="secondary" size="md" onClick={handleDownload}>
                Save Story
              </Button>
              <Button variant="primary" size="md" onClick={handleWebShare}>
                Share
              </Button>
            </div>

            <Button variant="ghost" size="sm" fullWidth onClick={copyLink}>
              {isCopied ? 'Link Copied to Clipboard' : 'Copy Verification Link'}
            </Button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
