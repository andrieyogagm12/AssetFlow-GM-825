import React, { useState, useEffect, useMemo } from 'react';
import { useAssets } from '../context/AssetContext';
import { RotationRecord } from '../types/asset';
import { exportInfoPerpindahanExcel } from '../utils/excelExport';
import { useResizableTable } from '../utils/useResizableTable';
import { formatDdMmmYy } from '../utils/dateFormatter';
import { Search, FileSpreadsheet, RotateCcw, MapPin, ArrowRight, Globe } from 'lucide-react';

interface ViewInfoPerpindahanProps {
  initialCode?: string;
}

export const ViewInfoPerpindahan: React.FC<ViewInfoPerpindahanProps> = ({ initialCode = '' }) => {
  const { assets, rotations, allAssets, allRotations, gridLines, toggleGridLines, addToast, hasButtonAccess } = useAssets();

  // Khusus Menu 5: Info Perpindahan Aset tidak terpengaruh batasan akses lokasi user
  // Menggunakan allAssets dan allRotations agar seluruh kode aset di semua cabang dapat dicari & dibuka
  const sourceAssets = allAssets && allAssets.length > 0 ? allAssets : assets;
  const sourceRotations = allRotations && allRotations.length > 0 ? allRotations : rotations;

  const { tableRef, ResetButton } = useResizableTable({
    storageKey: 'assetflow_table_resize_5_info_perpindahan',
  });

  const [searchCode, setSearchCode] = useState(initialCode);
  const [activeCode, setActiveCode] = useState(initialCode);

  // Sinkronisasi otomatis saat initialCode berubah dari parameter atau link menu lain
  useEffect(() => {
    if (initialCode) {
      setSearchCode(initialCode);
      setActiveCode(initialCode.trim().toUpperCase());
    }
  }, [initialCode]);

  const matchedAsset = useMemo(() => {
    if (!activeCode.trim()) return null;
    const clean = activeCode.trim().toUpperCase();
    return sourceAssets.find((a) => a.code.toUpperCase() === clean);
  }, [sourceAssets, activeCode]);

  // Find all rotations for this asset sorted chronologically, including initial entry, or show all rotations if no code is entered
  const assetRotations = useMemo(() => {
    if (!activeCode.trim()) {
      return sourceRotations.slice().sort((a, b) => {
        const dateA = a.entryDate || a.exitDate || a.confirmDate || '';
        const dateB = b.entryDate || b.exitDate || b.confirmDate || '';
        return dateB.localeCompare(dateA);
      });
    }
    const clean = activeCode.trim().toUpperCase();
    const rots = sourceRotations
      .filter((r) => r.assetCode.toUpperCase() === clean)
      .sort((a, b) => (a.exitDate > b.exitDate ? 1 : -1));

    if (rots.length > 0) {
      const hasInitial = rots.some((r) => r.type === 'BARU' || r.fromLocationCode === 'BARU');
      if (!hasInitial && matchedAsset) {
        const initialRot: RotationRecord = {
          id: `rot-init-${matchedAsset.id}`,
          assetId: matchedAsset.id,
          assetCode: matchedAsset.code,
          assetName: matchedAsset.name,
          assetType: matchedAsset.typeCode,
          exitDate: matchedAsset.entryDate,
          fromLocationCode: 'BARU',
          toLocationCode: rots[0]?.fromLocationCode || matchedAsset.locationCode,
          status: 'DITERIMA',
          confirmDate: matchedAsset.entryDate,
          entryDate: matchedAsset.entryDate,
          notes: 'Entri Awal Aset',
          type: 'BARU',
        };
        return [initialRot, ...rots];
      }
      return rots;
    }

    if (matchedAsset) {
      const initialRot: RotationRecord = {
        id: `rot-init-${matchedAsset.id}`,
        assetId: matchedAsset.id,
        assetCode: matchedAsset.code,
        assetName: matchedAsset.name,
        assetType: matchedAsset.typeCode,
        exitDate: matchedAsset.entryDate,
        fromLocationCode: 'BARU',
        toLocationCode: matchedAsset.locationCode,
        status: 'DITERIMA',
        confirmDate: matchedAsset.entryDate,
        entryDate: matchedAsset.entryDate,
        notes: 'Entri Awal Aset',
        type: 'BARU',
      };
      return [initialRot];
    }

    return [];
  }, [sourceRotations, activeCode, matchedAsset]);

  const handleSearch = () => {
    if (!searchCode.trim()) {
      addToast('Masukkan kode aset yang ingin dicari', 'warning');
      return;
    }
    setActiveCode(searchCode.trim().toUpperCase());
  };

  const handleClear = () => {
    setSearchCode('');
    setActiveCode('');
  };

  const handleExport = async () => {
    if (assetRotations.length === 0) {
      addToast('Tidak ada data perpindahan aset untuk diekspor', 'warning');
      return;
    }

    const exportData = assetRotations.map((r) => ({
      assetName: r.assetName,
      assetType: r.assetType,
      assetCode: r.assetCode,
      fromLocationCode: r.fromLocationCode,
      toLocationCode: r.toLocationCode,
      entryDate: r.entryDate,
      confirmDate: r.confirmDate,
      status: r.status,
      notes: r.notes || '-',
    }));

    const filename = `INFO_PERPINDAHAN_ASET_${activeCode || 'SEMUA'}_${new Date().getFullYear()}`;

    try {
      await exportInfoPerpindahanExcel({
        rotations: exportData,
        assetCode: activeCode,
        assetName: matchedAsset?.name,
        filename,
      });
      addToast(`Berhasil mengunduh Excel Info Perpindahan (${filename}.xlsx)`, 'success');
    } catch (err) {
      console.error(err);
      addToast('Gagal mengekspor data ke Excel', 'error');
    }
  };

  return (
    <div className="h-full flex flex-col p-2 sm:p-2.5 min-h-0 overflow-hidden">
      <div className="bg-white border border-zinc-200 rounded-xl shadow-xs flex flex-col flex-1 min-h-0 overflow-hidden">
        {/* Search & Actions Header */}
        <div className="shrink-0 p-2.5 sm:p-3 border-b border-zinc-200">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div className="max-w-[460px] flex-1">
              <div className="flex items-center justify-between mb-1">
                <label className="text-[11px] font-semibold text-zinc-500 block uppercase tracking-wider">
                  MASUKKAN KODE ASET
                </label>
                <span className="inline-flex items-center gap-1 text-[10px] font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                  <Globe className="w-3 h-3 text-emerald-600" /> Akses Seluruh Lokasi Terbuka
                </span>
              </div>
              <div className="flex gap-2 mt-1">
                <input
                  type="text"
                  value={searchCode}
                  onChange={(e) => setSearchCode(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                  placeholder="contoh: BECOSM001, CADBAA0183"
                  className="bg-white border-zinc-300 text-zinc-900 w-full h-9 px-3 rounded-lg border text-xs font-mono font-bold uppercase focus:ring-1 focus:ring-indigo-500 outline-hidden"
                />
                <button
                  type="button"
                  onClick={handleSearch}
                  className="inline-flex items-center justify-center gap-1.5 rounded-lg font-semibold transition whitespace-nowrap h-9 px-4 text-xs bg-blue-600 text-white hover:bg-blue-700 cursor-pointer shadow-xs"
                >
                  <Search className="w-3.5 h-3.5" /> Cari
                </button>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {hasButtonAccess('btn-export-excel-5') && (
                <button
                  type="button"
                  onClick={handleExport}
                  disabled={assetRotations.length === 0}
                  className="inline-flex items-center justify-center gap-1.5 rounded-lg font-semibold transition whitespace-nowrap h-9 px-3 text-xs bg-emerald-700 text-white hover:bg-emerald-800 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer shadow-xs"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5" /> Export Excel
                </button>
              )}
              <button
                type="button"
                onClick={handleClear}
                className="inline-flex items-center justify-center gap-1 rounded-lg font-semibold transition whitespace-nowrap h-9 px-3 text-xs border border-zinc-300 hover:bg-zinc-50 text-zinc-700 cursor-pointer"
              >
                Clear
              </button>
              <button
                type="button"
                onClick={toggleGridLines}
                aria-pressed={gridLines}
                title="Tampilkan atau sembunyikan garis tabel"
                className={`inline-flex items-center h-7 px-2.5 rounded-lg border text-[11px] font-semibold whitespace-nowrap transition cursor-pointer ${
                  gridLines
                    ? 'border-indigo-300 bg-indigo-50 text-indigo-700'
                    : 'border-zinc-300 bg-white text-zinc-600 hover:bg-zinc-100'
                }`}
              >
                ▦ Grid: {gridLines ? 'ON' : 'OFF'}
              </button>
              <ResetButton />
            </div>
          </div>
        </div>

        {/* Table Content */}
        <div id="tabel-preview-aset" className="table-preview-container flex-1 min-h-0 overflow-auto relative border-t border-zinc-200">
          <table
            ref={tableRef}
            className={`w-full text-xs table-assetflow resizable-table ${
              gridLines ? 'table-gridlines-active' : ''
            }`}
          >
            <thead className="sticky top-0 z-20 bg-[#1e40af] text-white shadow-xs">
              <tr className="bg-[#1e40af]">
                <th rowSpan={2} className="px-3 py-2 text-center font-bold w-[45px] bg-[#1e40af]">
                  NO
                </th>
                <th colSpan={3} className="px-3 py-1.5 text-center font-bold border-x border-blue-400/40 bg-[#1e40af]">
                  ASET
                </th>
                <th colSpan={2} className="px-3 py-1.5 text-center font-bold border-r border-blue-400/40 bg-[#1e40af]">
                  LOKASI
                </th>
                <th rowSpan={2} className="px-3 py-2 text-center font-bold min-w-[130px] bg-[#1e40af]">
                  TANGGAL MASUK
                </th>
                <th rowSpan={2} className="px-3 py-2 text-center font-bold min-w-[110px] bg-[#1e40af]">
                  STATUS
                </th>
                <th rowSpan={2} className="px-3 py-2 text-left font-bold min-w-[160px] bg-[#1e40af]">
                  KETERANGAN
                </th>
              </tr>
              <tr className="bg-[#1e40af]">
                <th className="px-3 py-1.5 text-left font-bold border-l border-blue-400/40 min-w-[220px] bg-[#1e40af]">
                  NAMA
                </th>
                <th className="px-3 py-1.5 text-center font-bold w-[60px] bg-[#1e40af]">JENIS</th>
                <th className="px-3 py-1.5 text-left font-bold border-r border-blue-400/40 min-w-[120px] bg-[#1e40af]">
                  KODE
                </th>
                <th className="px-3 py-1.5 text-center font-bold w-[90px] bg-[#1e40af]">SEBELUM</th>
                <th className="px-3 py-1.5 text-center font-bold border-r border-blue-400/40 w-[90px] bg-[#1e40af]">
                  TERKINI
                </th>
              </tr>
            </thead>
            <tbody>
              {assetRotations.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-3 py-14 text-center text-xs text-zinc-500">
                    {activeCode
                      ? `Tidak ditemukan riwayat perpindahan untuk kode aset "${activeCode}".`
                      : 'Belum ada data riwayat perpindahan aset.'}
                  </td>
                </tr>
              ) : (
                assetRotations.map((rot, idx) => (
                  <tr key={rot.id} className="border-b border-zinc-200/70 hover:bg-zinc-50/60">
                    <td className="px-3 py-2 text-center text-zinc-400 font-mono text-[11px]">{idx + 1}</td>
                    <td className="px-3 py-2 font-medium text-zinc-900">{rot.assetName}</td>
                    <td className="px-3 py-2 text-center font-bold text-[11px] text-zinc-700">{rot.assetType}</td>
                    <td className="px-3 py-2 font-mono font-bold text-zinc-900">{rot.assetCode}</td>
                    <td className="px-3 py-2 text-center font-bold text-zinc-600">{rot.fromLocationCode}</td>
                    <td className="px-3 py-2 text-center font-bold text-indigo-700">{rot.toLocationCode}</td>
                    <td className="px-3 py-2 text-center font-mono text-[11px] text-zinc-600">
                      {rot.entryDate || rot.confirmDate ? formatDdMmmYy(rot.entryDate || rot.confirmDate) : '-'}
                    </td>
                    <td className="px-3 py-2 text-center">
                      <span
                        className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                          rot.status === 'DITERIMA'
                            ? 'bg-emerald-100 text-emerald-800'
                            : rot.status === 'DITOLAK'
                            ? 'bg-red-100 text-red-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {rot.status}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-zinc-600 text-[11px]">{rot.notes || '-'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Bottom Footer */}
        <div className="shrink-0 p-2 sm:p-2.5 flex items-center justify-between border-t border-zinc-200 text-xs bg-zinc-50/95 shadow-xs">
          <span className="font-semibold text-zinc-700">
            Total {assetRotations.length} riwayat mutasi/perpindahan aset
          </span>
          <span className="text-[11px] text-zinc-500 font-medium font-mono">
            {activeCode ? `Kode Aset: ${activeCode}` : 'Semua Riwayat Perpindahan'}
          </span>
        </div>
      </div>
    </div>
  );
};
