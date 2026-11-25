import React from 'react';
import { QRCodeCanvas } from 'qrcode.react';
import { Download, X, Sparkles, Share2, CheckCircle2, Camera } from 'lucide-react';
import UnifranzLogo from './UnifranzLogo';

export default function PhotoModal({ photoData, onClose }) {
  if (!photoData) return null;

  const { framedDataUrl, careerLabel, timestamp, sharePayload } = photoData;

  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = framedDataUrl;
    link.download = `UNIFRANZ-AR-${careerLabel.replace(/\s+/g, '-')}-${Date.now()}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-xl flex items-center justify-center p-4 md:p-6 animate-fadeIn">
      <div className="relative max-w-4xl w-full glass-panel-bright rounded-3xl border border-[#FF6B00] p-5 md:p-7 shadow-neon-strong overflow-hidden max-h-[94vh] flex flex-col">
        {/* Top Bar */}
        <div className="flex items-center justify-between pb-4 mb-4 border-b border-white/15">
          <div className="flex items-center gap-3">
            <UnifranzLogo className="h-9" showTagline={false} />
            <div className="h-6 w-[1px] bg-white/20 hidden sm:block" />
            <div className="hidden sm:flex flex-col">
              <span className="font-display text-xs font-bold text-[#FF6B00] tracking-wider uppercase flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" /> Foto Souvenir Oficial
              </span>
              <span className="text-[11px] text-white/60 font-tech">{timestamp}</span>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-10 h-10 rounded-full bg-white/10 hover:bg-[#FF6B00] hover:text-black text-white flex items-center justify-center transition"
            title="Cerrar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Main Modal Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center overflow-y-auto pr-1">
          {/* Framed Photo Preview */}
          <div className="lg:col-span-7 flex flex-col items-center">
            <div className="relative rounded-2xl overflow-hidden border-2 border-[#FF6B00] shadow-neon-orange bg-black max-h-[58vh] flex items-center justify-center">
              <img
                src={framedDataUrl}
                alt="Recuerdo UNIFRANZ AR"
                className="max-h-[56vh] w-auto object-contain"
              />
              <div className="absolute top-3 right-3 px-3 py-1 rounded-full bg-black/75 backdrop-blur-md border border-[#FF6B00]/60 text-[10px] font-display font-bold text-[#FF6B00] tracking-wider uppercase">
                #InnovaciónUnifranz
              </div>
            </div>
          </div>

          {/* Instant QR Code & Download Actions */}
          <div className="lg:col-span-5 flex flex-col items-center lg:items-stretch text-center lg:text-left space-y-4">
            <div className="inline-flex items-center self-center lg:self-start gap-2 px-3 py-1 rounded-full bg-[#FF6B00]/20 border border-[#FF6B00]/50 text-[#FF6B00] text-xs font-tech font-semibold">
              <CheckCircle2 className="w-4 h-4" />
              {careerLabel}
            </div>

            <h3 className="font-display font-extrabold text-xl md:text-2xl text-white leading-tight">
              ¡Lleva tu momento <span className="text-[#FF6B00]">UNIFRANZ</span> en tu celular!
            </h3>

            <p className="text-xs text-white/70 leading-relaxed">
              Escanea el código QR instantáneo o descarga tu fotografía conmemorativa en alta resolución lista para compartir en redes.
            </p>

            {/* QR Code Box */}
            <div className="p-4 rounded-2xl bg-white text-black flex flex-col items-center justify-center self-center lg:self-start shadow-neon-orange border-2 border-[#FF6B00]">
              <QRCodeCanvas
                value={sharePayload}
                size={152}
                bgColor="#FFFFFF"
                fgColor="#0A0A0A"
                level="M"
                includeMargin={false}
              />
              <span className="mt-2 font-display font-bold text-[10px] tracking-widest uppercase text-[#FF5500]">
                ESCANEAME • UNIFRANZ AR
              </span>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row lg:flex-col gap-2.5 pt-2 w-full">
              <button
                onClick={handleDownload}
                className="w-full py-3.5 px-5 rounded-xl bg-gradient-to-r from-[#FF6B00] to-[#FF5500] hover:from-[#FF7B1A] hover:to-[#FF6B00] text-black font-display font-extrabold text-xs tracking-wider uppercase flex items-center justify-center gap-2.5 shadow-neon-orange transition transform active:scale-95"
              >
                <Download className="w-4 h-4" />
                Descargar Foto PNG (HD)
              </button>

              <button
                onClick={onClose}
                className="w-full py-3 px-5 rounded-xl bg-white/10 hover:bg-white/15 border border-white/20 text-white font-display font-bold text-xs tracking-wider uppercase flex items-center justify-center gap-2 transition"
              >
                <Camera className="w-4 h-4 text-[#FF6B00]" />
                Tomar Otra Foto
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
