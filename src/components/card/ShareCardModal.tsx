'use client';

import React, { useRef, useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Download, Share2, Copy, Check, Sparkles, ShieldCheck } from 'lucide-react';
import { FaceCardData } from '@/types';

interface ShareCardModalProps {
  isOpen: boolean;
  onClose: () => void;
  card: FaceCardData;
}

export function ShareCardModal({ isOpen, onClose, card }: ShareCardModalProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [shareUrl, setShareUrl] = useState<string>('');
  const [isCopied, setIsCopied] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [previewDataUrl, setPreviewDataUrl] = useState<string | null>(null);

  // Generate canvas asset and fetch public share URL on open
  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;

    async function initShare() {
      setIsGenerating(true);
      try {
        // 1. Create public share card record in database
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
      } catch (err) {
        if (isMounted) {
          setShareUrl(`${window.location.origin}/card`);
        }
      }

      // 2. Render 1080x1920 Story Canvas
      setTimeout(() => {
        if (!isMounted) return;
        renderCanvas();
        setIsGenerating(false);
      }, 100);
    }

    initShare();

    return () => {
      isMounted = false;
    };
  }, [isOpen, card]);

  const renderCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = 1080;
    const height = 1920;
    canvas.width = width;
    canvas.height = height;

    // Background Gradient (Deep Luxury Obsidian Purple)
    const bgGrad = ctx.createLinearGradient(0, 0, 0, height);
    bgGrad.addColorStop(0, '#0E081A');
    bgGrad.addColorStop(0.5, '#160B29');
    bgGrad.addColorStop(1, '#08040F');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, width, height);

    // Ethereal Radial Glow
    const radGrad = ctx.createRadialGradient(width / 2, 400, 50, width / 2, 400, 700);
    radGrad.addColorStop(0, 'rgba(168, 85, 247, 0.25)');
    radGrad.addColorStop(1, 'rgba(168, 85, 247, 0)');
    ctx.fillStyle = radGrad;
    ctx.fillRect(0, 0, width, height);

    // Header Branding
    ctx.font = '900 36px sans-serif';
    ctx.fillStyle = '#EDE9FE';
    ctx.textAlign = 'center';
    ctx.letterSpacing = '12px';
    ctx.fillText('FACECARD', width / 2, 220);

    ctx.font = '700 24px sans-serif';
    ctx.fillStyle = '#A78BFA';
    ctx.letterSpacing = '4px';
    ctx.fillText('OFFICIAL FACECARD', width / 2, 270);

    // The Glass Card Container
    const cardX = 140;
    const cardY = 380;
    const cardW = 800;
    const cardH = 500;
    const cardRadius = 40;

    // Card Fill based on Tier
    const cardGrad = ctx.createLinearGradient(cardX, cardY, cardX + cardW, cardY + cardH);
    if (card.tier === 'GOLD') {
      cardGrad.addColorStop(0, '#F8E7BE');
      cardGrad.addColorStop(0.5, '#EED192');
      cardGrad.addColorStop(1, '#E4BE6B');
    } else if (card.tier === 'PLATINUM') {
      cardGrad.addColorStop(0, '#E0E7FF');
      cardGrad.addColorStop(0.5, '#C7D2FE');
      cardGrad.addColorStop(1, '#A5B4FC');
    } else if (card.tier === 'BLACK') {
      cardGrad.addColorStop(0, '#1C1C20');
      cardGrad.addColorStop(0.5, '#111114');
      cardGrad.addColorStop(1, '#050507');
    } else {
      cardGrad.addColorStop(0, '#EBE5FC');
      cardGrad.addColorStop(0.5, '#DFD5FA');
      cardGrad.addColorStop(1, '#D4C5F9');
    }

    ctx.save();
    ctx.beginPath();
    ctx.roundRect(cardX, cardY, cardW, cardH, cardRadius);
    ctx.fillStyle = cardGrad;
    ctx.shadowColor = 'rgba(0, 0, 0, 0.6)';
    ctx.shadowBlur = 60;
    ctx.shadowOffsetY = 25;
    ctx.fill();
    ctx.restore();

    // Card Border
    ctx.save();
    ctx.beginPath();
    ctx.roundRect(cardX, cardY, cardW, cardH, cardRadius);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
    ctx.lineWidth = 4;
    ctx.stroke();
    ctx.restore();

    // Card Text Color
    const textColor = card.tier === 'BLACK' ? '#FFFFFF' : '#140826';
    const subColor = card.tier === 'BLACK' ? '#A1A1AA' : '#6B7280';

    // Card Brand Title inside Card
    ctx.font = '900 28px sans-serif';
    ctx.fillStyle = textColor;
    ctx.textAlign = 'left';
    ctx.letterSpacing = '6px';
    ctx.fillText('FACECARD', cardX + 50, cardY + 70);

    // Tier Chip in Card
    ctx.font = '800 20px sans-serif';
    ctx.textAlign = 'right';
    ctx.letterSpacing = '2px';
    ctx.fillText(`${card.tier} TIER`, cardX + cardW - 50, cardY + 70);

    // Cardholder Name inside Card
    ctx.font = '800 20px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillStyle = subColor;
    ctx.fillText('CARDHOLDER', cardX + 50, cardY + 360);

    ctx.font = '900 42px sans-serif';
    ctx.fillStyle = textColor;
    ctx.fillText(card.cardholderName.toUpperCase(), cardX + 50, cardY + 420);

    // Lethality inside Card
    ctx.font = '800 20px sans-serif';
    ctx.textAlign = 'right';
    ctx.fillStyle = subColor;
    ctx.fillText('LETHALITY', cardX + cardW - 50, cardY + 340);

    ctx.font = '900 76px sans-serif';
    ctx.fillStyle = textColor;
    ctx.fillText(`${card.score ?? 84}`, cardX + cardW - 130, cardY + 420);

    ctx.font = '700 28px sans-serif';
    ctx.fillStyle = subColor;
    ctx.fillText('/100', cardX + cardW - 50, cardY + 420);

    // Story Stats Section Below Card
    const statsY = 960;

    // Stat 1: Lethality Verdict
    ctx.textAlign = 'center';
    ctx.font = '800 28px sans-serif';
    ctx.fillStyle = '#DDD6FE';
    ctx.fillText(`VERDICT: ${card.band || 'DANGEROUS'}`, width / 2, statsY);

    if (card.streakDays) {
      ctx.font = '700 26px sans-serif';
      ctx.fillStyle = '#FFAE80';
      ctx.fillText(`🔥 ${card.streakDays}-DAY ACTIVE STREAK (×${card.multiplier ?? 1.25})`, width / 2, statsY + 60);
    }

    // Callout Box
    const boxY = 1120;
    ctx.save();
    ctx.beginPath();
    ctx.roundRect(160, boxY, 760, 200, 32);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
    ctx.lineWidth = 2;
    ctx.fill();
    ctx.stroke();
    ctx.restore();

    ctx.font = '800 26px sans-serif';
    ctx.fillStyle = '#FFFFFF';
    ctx.textAlign = 'center';
    ctx.fillText('Face card never declines.', width / 2, boxY + 70);

    ctx.font = '600 22px sans-serif';
    ctx.fillStyle = '#C4B5FD';
    ctx.fillText('Scan your facial geometry & claim your Facecard.', width / 2, boxY + 120);

    // NDPA Privacy Seal
    ctx.font = '600 18px sans-serif';
    ctx.fillStyle = '#6EE7B7';
    ctx.fillText('🛡️ Zero raw selfie storage • NDPA compliant AI Vision', width / 2, 1720);

    // Watermark / Link
    ctx.font = '800 24px sans-serif';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
    ctx.fillText('facecard.app', width / 2, 1780);

    // Set preview image data
    try {
      setPreviewDataUrl(canvas.toDataURL('image/png'));
    } catch (e) {}
  };

  const handleDownload = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const dataUrl = canvas.toDataURL('image/png');
    const link = document.createElement('a');
    link.download = `facecard-${card.cardholderName.toLowerCase().replace(/\s+/g, '-')}.png`;
    link.href = dataUrl;
    link.click();
  };

  const handleWebShare = async () => {
    const targetUrl = shareUrl || window.location.href;
    if (navigator.share) {
      try {
        await navigator.share({
          title: `${card.cardholderName}'s Face Card`,
          text: `My Face Card never declines! Lethality ${card.score ?? 84}/100 (${card.tier} Tier).`,
          url: targetUrl,
        });
      } catch (err) {}
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
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="relative w-full max-w-sm rounded-[32px] bg-[#140826] border border-purple-500/30 p-5 text-white shadow-2xl space-y-4"
        >
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-purple-400" />
              <span className="text-sm font-extrabold tracking-wide uppercase">Share Face Card</span>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Canvas Preview Container */}
          <div className="relative aspect-[9/16] max-h-[380px] w-full mx-auto rounded-2xl overflow-hidden border border-white/15 bg-black/40 flex items-center justify-center">
            {previewDataUrl ? (
              <img
                src={previewDataUrl}
                alt="Face Card Story Graphic"
                className="w-full h-full object-contain"
              />
            ) : (
              <div className="text-center text-xs text-zinc-400 space-y-2">
                <div className="w-6 h-6 border-2 border-purple-400 border-t-transparent rounded-full animate-spin mx-auto" />
                <p>Generating 1080×1920 Story Card...</p>
              </div>
            )}
            <canvas ref={canvasRef} className="hidden" />
          </div>

          {/* Privacy Note */}
          <div className="flex items-center justify-center gap-1.5 text-[10px] text-emerald-400">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Zero selfie exposure • Card status only</span>
          </div>

          {/* Actions */}
          <div className="space-y-2 pt-1">
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={handleDownload}
                className="py-3 px-3 rounded-2xl bg-white text-[#140826] font-bold text-xs flex items-center justify-center gap-1.5 hover:bg-zinc-200 transition-all active:scale-95"
              >
                <Download className="w-4 h-4" />
                <span>Save Story</span>
              </button>

              <button
                onClick={handleWebShare}
                className="py-3 px-3 rounded-2xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-all active:scale-95 shadow-md"
              >
                <Share2 className="w-4 h-4" />
                <span>Share</span>
              </button>
            </div>

            <button
              onClick={copyLink}
              className="w-full py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-zinc-300 font-semibold text-xs flex items-center justify-center gap-1.5 transition-colors"
            >
              {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{isCopied ? 'Link Copied to Clipboard!' : 'Copy Verification Link'}</span>
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
