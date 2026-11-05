import React from 'react';
import { X, Image as ImageIcon, ExternalLink } from 'lucide-react';

interface PhotoModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  photoUrl?: string;
  assetCode?: string;
}

export const PhotoModal: React.FC<PhotoModalProps> = ({
  isOpen,
  onClose,
  title,
  photoUrl,
  assetCode,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-[fade-in_0.15s_ease-out]">
      <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden border border-zinc-200">
        <div className="flex items-center justify-between p-4 border-b border-zinc-200 bg-zinc-50">
          <div>
            <h3 className="font-bold text-sm text-zinc-900 truncate max-w-sm">{title}</h3>
            {assetCode && <p className="text-[11px] font-mono text-zinc-500">Kode: {assetCode}</p>}
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-500 hover:text-zinc-900 hover:bg-zinc-200 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 flex items-center justify-center min-h-[260px] bg-zinc-100">
          {photoUrl ? (
            <img
              src={photoUrl}
              alt={title}
              className="max-h-[380px] w-auto max-w-full rounded-lg object-contain shadow-sm border border-zinc-200"
              onError={(e) => {
                (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=600&auto=format&fit=crop&q=80';
              }}
            />
          ) : (
            <div className="flex flex-col items-center justify-center text-zinc-400 py-12">
              <ImageIcon className="w-12 h-12 mb-2 stroke-1" />
              <p className="text-xs font-medium">Belum ada foto fisik aset</p>
              <p className="text-[10px] text-zinc-400 mt-0.5">Dapat diunggah melalui menu 4.1 INPUT atau 4.2 EDIT</p>
            </div>
          )}
        </div>

        <div className="p-3 border-t border-zinc-200 bg-white flex justify-between items-center text-xs">
          {photoUrl ? (
            <a
              href={photoUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 text-[11px] text-blue-600 hover:underline font-medium"
            >
              <ExternalLink className="w-3.5 h-3.5" /> Buka gambar asli
            </a>
          ) : (
            <div />
          )}
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-zinc-800 text-white rounded-lg text-xs font-semibold hover:bg-zinc-900 transition"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
};
