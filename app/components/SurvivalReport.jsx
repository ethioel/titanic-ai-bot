'use client';

import { useRef, useEffect, useState, useCallback } from 'react';
import { Download, Share2, Copy, CheckCircle, Loader2 } from 'lucide-react';

export default function SurvivalReport({ prediction, twin, passenger }) {
  const canvasRef = useRef(null);
  const [isReady, setIsReady] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isSharing, setIsSharing] = useState(false);

  const survived = prediction?.survived ?? false;
  const probability = prediction?.probability ?? 0;
  const name = passenger?.name || 'You';
  const twinName = twin?.name || null;
  const pclass = passenger?.Pclass || 3;
  const classLabel = { 1: '1st Class', 2: '2nd Class', 3: '3rd Class' }[pclass] || '3rd Class';

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const W = 1200;
    const H = 630;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    canvas.width = W * dpr;
    canvas.height = H * dpr;
    canvas.style.width = W + 'px';
    canvas.style.height = H + 'px';
    ctx.scale(dpr, dpr);

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = '/images/shared-card-bg.jpg';

    img.onload = () => {
      // Cover-fit background
      const imgAspect = img.width / img.height;
      const canvasAspect = W / H;
      let dw, dh, dx, dy;
      if (imgAspect > canvasAspect) {
        dh = H; dw = img.width * (H / img.height); dx = (W - dw) / 2; dy = 0;
      } else {
        dw = W; dh = img.height * (W / img.width); dx = 0; dy = (H - dh) / 2;
      }
      ctx.drawImage(img, dx, dy, dw, dh);

      // Color overlay
      const grad = ctx.createLinearGradient(0, 0, W, H);
      if (survived) {
        grad.addColorStop(0, 'rgba(6, 78, 59, 0.85)');
        grad.addColorStop(0.5, 'rgba(5, 150, 105, 0.70)');
        grad.addColorStop(1, 'rgba(4, 120, 87, 0.60)');
      } else {
        grad.addColorStop(0, 'rgba(127, 29, 29, 0.85)');
        grad.addColorStop(0.5, 'rgba(185, 28, 28, 0.70)');
        grad.addColorStop(1, 'rgba(153, 27, 27, 0.60)');
      }
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, W, H);

      // Vignette
      const vig = ctx.createRadialGradient(W / 2, H / 2, H * 0.25, W / 2, H / 2, H * 0.9);
      vig.addColorStop(0, 'rgba(0,0,0,0)');
      vig.addColorStop(1, 'rgba(0,0,0,0.55)');
      ctx.fillStyle = vig;
      ctx.fillRect(0, 0, W, H);

      // Frame
      ctx.strokeStyle = 'rgba(255,255,255,0.25)';
      ctx.lineWidth = 3;
      ctx.strokeRect(28, 28, W - 56, H - 56);

      // Top badge
      ctx.fillStyle = 'rgba(255,255,255,0.12)';
      ctx.beginPath();
      ctx.roundRect(W / 2 - 150, 52, 300, 34, 17);
      ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.9)';
      ctx.font = '600 13px Inter, system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(`RMS TITANIC · 1912 · ${classLabel.toUpperCase()}`, W / 2, 74);

      // Emoji
      ctx.font = '72px serif';
      ctx.fillText(survived ? '🛟' : '🌊', W / 2, 165);

      // Name + verb
      ctx.fillStyle = '#ffffff';
      ctx.font = '800 46px Inter, system-ui, sans-serif';
      ctx.fillText(`${name} ${survived ? 'SURVIVED' : 'PERISHED'}`, W / 2, 240);

      // Subtitle
      ctx.font = '500 18px Inter, system-ui, sans-serif';
      ctx.fillStyle = 'rgba(255,255,255,0.75)';
      ctx.fillText(`${classLabel} Passenger`, W / 2, 272);

      // Probability ring background
      ctx.beginPath();
      ctx.arc(W / 2, 370, 68, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(255,255,255,0.15)';
      ctx.lineWidth = 10;
      ctx.stroke();

      // Probability ring fill
      const pct = Math.min(Math.max(probability, 0), 1);
      ctx.beginPath();
      ctx.arc(W / 2, 370, 68, -Math.PI / 2, -Math.PI / 2 + (Math.PI * 2 * pct));
      ctx.strokeStyle = survived ? '#34d399' : '#f87171';
      ctx.lineWidth = 10;
      ctx.lineCap = 'round';
      ctx.stroke();

      // Probability text
      ctx.fillStyle = '#ffffff';
      ctx.font = '700 34px Inter, system-ui, sans-serif';
      ctx.fillText(`${(pct * 100).toFixed(1)}%`, W / 2, 378);
      ctx.font = '500 13px Inter, system-ui, sans-serif';
      ctx.fillStyle = 'rgba(255,255,255,0.65)';
      ctx.fillText('SURVIVAL PROBABILITY', W / 2, 402);

      // Twin
      if (twinName) {
        ctx.fillStyle = 'rgba(255,255,255,0.80)';
        ctx.font = 'italic 16px Inter, system-ui, sans-serif';
        ctx.fillText(`Historical Twin: ${twinName}`, W / 2, 460);
      }

      // Footer
      ctx.fillStyle = 'rgba(255,255,255,0.45)';
      ctx.font = '500 13px Inter, system-ui, sans-serif';
      ctx.fillText('titanic-ai-bot.vercel.app', W / 2, 560);

      setIsReady(true);
    };

    img.onerror = () => {
      // Fallback gradient if image missing
      const grad = ctx.createLinearGradient(0, 0, W, H);
      if (survived) {
        grad.addColorStop(0, '#064e3b'); grad.addColorStop(1, '#065f46');
      } else {
        grad.addColorStop(0, '#7f1d1d'); grad.addColorStop(1, '#991b1b');
      }
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, W, H);
      setIsReady(true);
    };
  }, [survived, probability, name, twinName, classLabel]);

  const handleDownload = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const link = document.createElement('a');
    link.download = `titanic-survival-${name.toLowerCase().replace(/\s+/g, '-')}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  }, [name]);

  const handleCopy = useCallback(async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    try {
      canvas.toBlob(async (blob) => {
        if (!blob) return;
        await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      });
    } catch {
      const text = `I ${survived ? 'survived' : 'perished'} the Titanic with ${(probability * 100).toFixed(1)}% probability!`;
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [survived, probability]);

  const handleShare = useCallback(async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    setIsSharing(true);
    try {
      const blob = await new Promise((res) => canvas.toBlob(res, 'image/png'));
      const file = new File([blob], 'titanic-survival.png', { type: 'image/png' });
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          title: 'My Titanic Survival Prediction',
          text: `I ${survived ? 'survived' : 'perished'} the Titanic with ${(probability * 100).toFixed(1)}% probability!`,
          files: [file]
        });
      } else {
        await handleCopy();
      }
    } catch (err) {
      if (err.name !== 'AbortError') await handleCopy();
    } finally {
      setIsSharing(false);
    }
  }, [survived, probability, handleCopy]);

  return (
    <div className="bg-white/70 dark:bg-slate-900/70 backdrop-blur-sm border border-slate-200 dark:border-slate-800 rounded-2xl p-5 md:p-6 shadow-sm">
      <h3 className="text-sm font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400 mb-4 text-center">
        Survival Report Card
      </h3>

      <div className="relative rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 shadow-lg mx-auto" style={{ maxWidth: 600 }}>
        {!isReady && (
          <div className="absolute inset-0 flex items-center justify-center bg-slate-100 dark:bg-slate-800 z-10">
            <Loader2 className="animate-spin text-slate-400" size={32} />
          </div>
        )}
        <canvas
          ref={canvasRef}
          className="w-full h-auto block"
          style={{ aspectRatio: '1200/630' }}
        />
      </div>

      <div className="flex flex-wrap gap-2 mt-4 justify-center">
        <button
          onClick={handleDownload}
          disabled={!isReady}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-semibold transition-colors shadow-lg shadow-blue-600/20"
        >
          <Download size={16} />
          Download PNG
        </button>
        <button
          onClick={handleShare}
          disabled={!isReady || isSharing}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-50 text-sm font-semibold transition-colors"
        >
          {isSharing ? <Loader2 size={16} className="animate-spin" /> : <Share2 size={16} />}
          Share Image
        </button>
        <button
          onClick={handleCopy}
          disabled={!isReady}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-50 text-sm font-semibold transition-colors"
        >
          {copied ? <CheckCircle size={16} className="text-green-500" /> : <Copy size={16} />}
          {copied ? 'Copied!' : 'Copy'}
        </button>
      </div>
    </div>
  );
}
