import React from 'react';
import { ShieldAlert, AlertTriangle, X, Lock } from 'lucide-react';

export interface AccessDeniedInfo {
  isOpen: boolean;
  title: string;
  message: string;
  assetCode?: string;
  actualLocation?: string;
  allowedLocations?: string[];
  status?: number;
}

interface AccessDeniedModalProps {
  info: AccessDeniedInfo | null;
  onClose: () => void;
}

export const AccessDeniedModal: React.FC<AccessDeniedModalProps> = ({ info, onClose }) => {
  if (!info || !info.isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="access-denied-title"
      className="fixed inset-0 z-99999 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-200"
    >
      <div className="bg-white rounded-2xl shadow-2xl border-2 border-red-500 max-w-md w-full overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Header Ribbon */}
        <div className="bg-gradient-to-r from-red-600 via-rose-600 to-red-700 p-5 text-white text-center relative">
          <div className="mx-auto w-14 h-14 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center border-2 border-white/40 shadow-inner mb-2 animate-bounce">
            <ShieldAlert className="w-8 h-8 text-white" />
          </div>
          <span className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-black/30 text-red-100 uppercase tracking-wider mb-1">
            Status: {info.status || 403} Forbidden
          </span>
          <h2 id="access-denied-title" className="text-lg font-extrabold tracking-wide text-white">
            {info.title || 'AKSES DITOLAK'}
          </h2>

          <button
            type="button"
            onClick={onClose}
            className="absolute top-3 right-3 p-1.5 rounded-full text-white/80 hover:text-white hover:bg-white/10 transition cursor-pointer"
            aria-label="Tutup popup"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 space-y-4 text-center">
          <div className="p-3.5 bg-red-50 border border-red-200 rounded-xl text-left text-xs leading-relaxed text-red-950 font-medium">
            <p className="text-zinc-800 text-sm">
              {info.message}
            </p>
          </div>

          {(info.assetCode || info.actualLocation || info.allowedLocations) && (
            <div className="grid grid-cols-2 gap-2 text-left text-[11px] bg-zinc-50 p-3 rounded-lg border border-zinc-200">
              {info.assetCode && (
                <div>
                  <span className="text-zinc-500 block">Kode Aset:</span>
                  <span className="font-mono font-bold text-zinc-900">{info.assetCode}</span>
                </div>
              )}
              {info.actualLocation && (
                <div>
                  <span className="text-zinc-500 block">Lokasi Aset:</span>
                  <span className="font-mono font-bold text-rose-600">{info.actualLocation}</span>
                </div>
              )}
              {info.allowedLocations && (
                <div className="col-span-2 pt-1 border-t border-zinc-200 mt-1">
                  <span className="text-zinc-500 block">Lokasi Akses Akun Anda:</span>
                  <span className="font-mono font-bold text-indigo-700">
                    {info.allowedLocations.join(', ') || 'Tidak ada'}
                  </span>
                </div>
              )}
            </div>
          )}

          <div className="flex items-center justify-center gap-1.5 text-[11px] text-zinc-500">
            <Lock className="w-3.5 h-3.5 text-red-500" />
            <span>Percobaan akses ilegal telah dicatat dalam log sistem.</span>
          </div>

          <div className="pt-2">
            <button
              type="button"
              onClick={onClose}
              className="w-full py-2.5 px-4 rounded-xl font-bold text-xs bg-red-600 hover:bg-red-700 active:bg-red-800 text-white shadow-md hover:shadow-lg transition cursor-pointer"
            >
              Saya Mengerti
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
