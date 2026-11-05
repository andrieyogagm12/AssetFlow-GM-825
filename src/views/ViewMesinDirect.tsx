import React, { useState, useMemo } from 'react';
import { useAssets } from '../context/AssetContext';
import { PhotoModal } from '../components/PhotoModal';
import { Search, Gamepad2, Eye, MapPin, Sparkles } from 'lucide-react';

interface ViewMesinDirectProps {
  onBackToAccounting: () => void;
  onNavigateToRotate: (code: string) => void;
}

export const ViewMesinDirect: React.FC<ViewMesinDirectProps> = ({
  onBackToAccounting,
  onNavigateToRotate,
}) => {
  const { assets, locations, assetTypes } = useAssets();
  const [locFilter, setLocFilter] = useState('ALL');
  const [search, setSearch] = useState('');
  const [photoModal, setPhotoModal] = useState<{ isOpen: boolean; title: string; photoUrl?: string; code?: string }>({
    isOpen: false,
    title: '',
  });

  const machines = useMemo(() => {
    return assets.filter((a) => a.category === 'MESIN' && a.status === 'ACTIVE');
  }, [assets]);

  const filteredMachines = useMemo(() => {
    return machines.filter((m) => {
      if (locFilter !== 'ALL' && m.locationCode !== locFilter) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        if (!m.name.toLowerCase().includes(q) && !m.code.toLowerCase().includes(q)) return false;
      }
      return true;
    });
  }, [machines, locFilter, search]);

  return (
    <div className="p-4 lg:p-6 space-y-4">
      {/* Header Banner */}
      <div className="bg-white border border-zinc-200 rounded-xl p-5 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
            <Gamepad2 className="w-7 h-7" />
          </div>
          <div>
            <h2 className="text-base font-bold text-zinc-900">Katalog Mesin Arcade Operasional</h2>
            <p className="text-xs text-zinc-500">
              Total {machines.length} unit mesin arcade terpasang di jaringan Game Master Indonesia
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onBackToAccounting}
          className="px-4 py-2 rounded-lg text-xs font-semibold bg-indigo-600 text-white hover:bg-indigo-700 transition shadow-xs cursor-pointer"
        >
          Ke Laporan Akuntansi (AssetFlow) →
        </button>
      </div>

      {/* Filter Bar */}
      <div className="bg-white border border-zinc-200 rounded-xl p-4 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3 flex-1">
          <div className="relative min-w-[220px]">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari mesin arcade / kode..."
              className="bg-white border-zinc-300 text-zinc-900 w-full h-9 pl-8 pr-3 rounded-lg border text-xs"
            />
            <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-2.5 top-3" />
          </div>

          <select
            value={locFilter}
            onChange={(e) => setLocFilter(e.target.value)}
            className="bg-white border-zinc-300 text-zinc-900 h-9 px-3 rounded-lg border text-xs"
          >
            <option value="ALL">SEMUA LOKASI ({locations.length})</option>
            {locations.map((loc) => (
              <option key={loc.code} value={loc.code}>
                {loc.code} - {loc.name}
              </option>
            ))}
          </select>
        </div>

        <span className="text-xs text-zinc-500 font-medium">
          Menampilkan <strong>{filteredMachines.length}</strong> unit
        </span>
      </div>

      {/* Grid of Machines */}
      {filteredMachines.length === 0 ? (
        <div className="bg-white border border-zinc-200 rounded-xl p-12 text-center text-xs text-zinc-500 shadow-xs">
          <Gamepad2 className="w-12 h-12 text-zinc-300 mx-auto mb-2 stroke-1" />
          <p className="font-semibold text-zinc-700 text-sm">Belum ada unit mesin di database.</p>
          <p className="text-zinc-400 mt-1">
            Data mesin masih kosong (0 unit). Anda dapat menambahkan mesin baru melalui menu 4.1 INPUT di Laporan Akuntansi.
          </p>
          <button
            type="button"
            onClick={onBackToAccounting}
            className="mt-4 px-4 py-2 rounded-lg text-xs font-semibold bg-indigo-600 text-white hover:bg-indigo-700 transition"
          >
            Buka Menu 4.1 INPUT →
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {filteredMachines.map((m) => {
          const typeName = assetTypes.find((t) => t.code === m.typeCode)?.name || m.typeCode;
          const locName = locations.find((l) => l.code === m.locationCode)?.name || m.locationCode;

          return (
            <div
              key={m.id}
              className="bg-white border border-zinc-200 rounded-xl overflow-hidden shadow-xs hover:shadow-md transition-shadow flex flex-col"
            >
              <div className="relative h-40 bg-zinc-100 overflow-hidden group">
                {m.photoUrl ? (
                  <img
                    src={m.photoUrl}
                    alt={m.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center text-zinc-400">
                    <Gamepad2 className="w-10 h-10 mb-1 stroke-1" />
                    <span className="text-[10px]">No Photo</span>
                  </div>
                )}
                <div className="absolute top-2 left-2 bg-indigo-900/85 backdrop-blur-xs text-white text-[10px] font-mono font-bold px-2 py-0.5 rounded">
                  {m.code}
                </div>
                <div className="absolute top-2 right-2 bg-white/90 backdrop-blur-xs text-zinc-800 text-[10px] font-bold px-2 py-0.5 rounded">
                  {m.typeCode}
                </div>
                {m.photoUrl && (
                  <button
                    type="button"
                    onClick={() =>
                      setPhotoModal({
                        isOpen: true,
                        title: m.name,
                        photoUrl: m.photoUrl,
                        code: m.code,
                      })
                    }
                    className="absolute bottom-2 right-2 p-1.5 rounded-lg bg-black/60 text-white hover:bg-black/80 transition"
                  >
                    <Eye className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              <div className="p-3.5 flex-1 flex flex-col justify-between">
                <div>
                  <h3 className="font-bold text-xs text-zinc-900 leading-snug line-clamp-2" title={m.name}>
                    {m.name}
                  </h3>
                  <p className="text-[10px] text-zinc-500 mt-1">{typeName}</p>
                </div>

                <div className="mt-3 pt-2.5 border-t border-zinc-100 space-y-1.5 text-[11px]">
                  <div className="flex items-center justify-between">
                    <span className="text-zinc-400 flex items-center gap-1">
                      <MapPin className="w-3 h-3 text-indigo-600" /> Lokasi:
                    </span>
                    <span className="font-semibold text-zinc-800 font-mono">{m.locationCode}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-zinc-400">Tarif Bermain:</span>
                    <span className="font-bold text-zinc-900 font-mono">
                      {m.playPrice != null && !isNaN(m.playPrice) && m.playPrice > 0
                        ? `Rp ${m.playPrice.toLocaleString('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                        : '-'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[10px] text-zinc-500 font-mono">
                    <span>Reader TAP: {m.readerTap || '-'}</span>
                    <span>SWP: {m.readerSwipe || '-'}</span>
                  </div>

                  <button
                    type="button"
                    onClick={() => onNavigateToRotate(m.code)}
                    className="w-full mt-2 py-1.5 rounded-lg text-[11px] font-semibold bg-zinc-100 text-zinc-800 hover:bg-indigo-50 hover:text-indigo-700 transition cursor-pointer"
                  >
                    Rotasi Mesin Ini →
                  </button>
                </div>
              </div>
            </div>
          );
        })}
        </div>
      )}

      <PhotoModal
        isOpen={photoModal.isOpen}
        onClose={() => setPhotoModal((prev) => ({ ...prev, isOpen: false }))}
        title={photoModal.title}
        photoUrl={photoModal.photoUrl}
        assetCode={photoModal.code}
      />
    </div>
  );
};
