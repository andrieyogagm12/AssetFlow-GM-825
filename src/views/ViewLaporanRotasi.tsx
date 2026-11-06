import React, { useState, useMemo } from 'react';
import { useAssets } from '../context/AssetContext';
import { exportLaporanRotasiExcel } from '../utils/excelExport';
import { MultiLocationFilter } from '../components/MultiLocationFilter';
import { useResizableTable } from '../utils/useResizableTable';
import { formatDdMmmYy } from '../utils/dateFormatter';
import { Search, FileSpreadsheet, History, Undo2, AlertTriangle, X } from 'lucide-react';
import { RotationRecord } from '../types/asset';
import { YearFilterInput } from '../components/YearFilterInput';

interface ViewLaporanRotasiProps {
  onInspectAssetHistory?: (assetCode: string) => void;
}

const MONTH_NAMES = [
  'JANUARI', 'FEBRUARI', 'MARET', 'APRIL', 'MEI', 'JUNI',
  'JULI', 'AGUSTUS', 'SEPTEMBER', 'OKTOBER', 'NOVEMBER', 'DESEMBER'
];
export const ViewLaporanRotasi: React.FC<ViewLaporanRotasiProps> = ({ onInspectAssetHistory }) => {
  const { locations, allowedLocations, assets, rotations, gridLines, toggleGridLines, addToast, cancelActivity, hasButtonAccess, hasColumnAccess, isSuperAdmin } = useAssets();

  const { tableRef, ResetButton } = useResizableTable({
    storageKey: 'assetflow_table_resize_2_laporan_rotasi',
  });

  const [selectedLocations, setSelectedLocations] = useState<string[]>(() => {
    if (!isSuperAdmin && allowedLocations.length === 1) {
      return [allowedLocations[0].code];
    }
    return ['ALL'];
  });
  const [selectedMonth, setSelectedMonth] = useState<string>(() => String(new Date().getMonth() + 1));
  const [selectedYear, setSelectedYear] = useState<string>(() => String(new Date().getFullYear()));
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [cancelTarget, setCancelTarget] = useState<RotationRecord | null>(null);

  React.useEffect(() => {
    if (!isSuperAdmin && allowedLocations.length === 1) {
      setSelectedLocations([allowedLocations[0].code]);
    }
  }, [isSuperAdmin, allowedLocations]);

  const filteredRotations = useMemo(() => {
    return rotations.filter((rot) => {
      // Location filter (from or to)
      if (!selectedLocations.includes('ALL')) {
        const matchFrom = selectedLocations.includes(rot.fromLocationCode);
        const matchTo = selectedLocations.includes(rot.toLocationCode);
        if (!matchFrom && !matchTo) return false;
      }

      // Year filter
      const rotDate = new Date(rot.exitDate || rot.confirmDate || '2026-01-01');
      if (selectedYear !== 'ALL') {
        if (rotDate.getFullYear() !== parseInt(selectedYear, 10)) return false;
      }

      // Month filter
      if (selectedMonth !== 'ALL') {
        if (rotDate.getMonth() + 1 !== parseInt(selectedMonth, 10)) return false;
      }

      // Search filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchCode = rot.assetCode.toLowerCase().includes(q);
        const matchName = rot.assetName.toLowerCase().includes(q);
        const matchFrom = rot.fromLocationCode.toLowerCase().includes(q);
        const matchTo = rot.toLocationCode.toLowerCase().includes(q);
        if (!matchCode && !matchName && !matchFrom && !matchTo) return false;
      }

      return true;
    });
  }, [rotations, selectedLocations, selectedMonth, selectedYear, searchQuery]);

  const handleExport = async () => {
    if (filteredRotations.length === 0) {
      addToast('Tidak ada data rotasi untuk diekspor', 'warning');
      return;
    }

    const exportData = filteredRotations.map((r) => {
      const matched = assets.find((a) => a.code.toUpperCase() === r.assetCode.toUpperCase());
      return {
        assetName: r.assetName,
        assetType: r.assetType,
        assetCode: r.assetCode,
        costActual: matched?.costActual || null,
        costExcel: matched?.costExcel || null,
        entryDate: r.entryDate,
        exitDate: r.exitDate,
        fromLocationCode: r.fromLocationCode,
        toLocationCode: r.toLocationCode,
        type: r.type || 'ROTASI',
      };
    });

    const locClean = selectedLocations.includes('ALL') ? 'SEMUA_LOKASI' : selectedLocations.join('_');
    const locLabel = selectedLocations.includes('ALL')
      ? 'SEMUA LOKASI'
      : selectedLocations
          .map((c) => {
            const found = locations.find((l) => l.code === c);
            return found ? `${c} - ${found.name}` : c;
          })
          .join(', ');

    const perClean =
      selectedMonth === 'ALL'
        ? selectedYear === 'ALL'
          ? 'SEMUA_PERIODE'
          : `TAHUN_${selectedYear}`
        : `${MONTH_NAMES[parseInt(selectedMonth, 10) - 1]}_${selectedYear !== 'ALL' ? selectedYear : ''}`.trim();

    const periodeLabel =
      selectedMonth === 'ALL'
        ? selectedYear === 'ALL'
          ? 'SEMUA PERIODE'
          : `TAHUN ${selectedYear}`
        : `${MONTH_NAMES[parseInt(selectedMonth, 10) - 1]} ${selectedYear !== 'ALL' ? selectedYear : ''}`.trim();

    const filename = `LAPORAN_ROTASI_${locClean}_${perClean}`;

    try {
      await exportLaporanRotasiExcel({
        rotations: exportData,
        locationLabel: locLabel,
        periodeLabel,
        filename,
      });
      addToast(`Berhasil mengunduh Excel Laporan Rotasi (${filename}.xlsx)`, 'success');
    } catch (err) {
      console.error(err);
      addToast('Gagal mengekspor data ke Excel', 'error');
    }
  };

  const canRiwayat = hasButtonAccess('btn-riwayat-2');
  const canBatal = hasButtonAccess('btn-batal-rotasi-2');
  const canColumnAksi = hasColumnAccess('col-aksi-2');
  const canAction = canColumnAksi && (canRiwayat || canBatal);

  return (
    <div className="h-full flex flex-col p-2 sm:p-2.5 min-h-0 overflow-hidden">
      <div className="bg-white border border-zinc-200 rounded-xl shadow-xs flex flex-col flex-1 min-h-0 overflow-hidden">
        {/* Filters Header */}
        <div className="shrink-0 p-2.5 border-b border-zinc-200 space-y-2">
          <div className="flex flex-wrap gap-3 items-end">
            <div className="min-w-[220px] flex-1 sm:flex-initial">
              <MultiLocationFilter
                locations={allowedLocations}
                selectedLocations={selectedLocations}
                disabled={!isSuperAdmin && allowedLocations.length === 1}
                onChange={setSelectedLocations}
              />
            </div>

            <div className="min-w-[150px]">
              <label className="text-[11px] font-semibold text-zinc-500 block uppercase tracking-wider">
                BULAN
              </label>
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="bg-white border-zinc-300 text-zinc-900 w-full mt-1 h-9 px-3 rounded-lg border text-xs focus:ring-1 focus:ring-indigo-500 outline-hidden"
              >
                <option value="ALL">SEMUA BULAN</option>
                {MONTH_NAMES.map((name, idx) => (
                  <option key={name} value={String(idx + 1)}>
                    {name}
                  </option>
                ))}
              </select>
            </div>

            <div className="min-w-[130px]">
              <label className="text-[11px] font-semibold text-zinc-500 block uppercase tracking-wider mb-1">
                TAHUN
              </label>
              <YearFilterInput
                value={selectedYear}
                onChange={setSelectedYear}
              />
            </div>

            <div className="min-w-[220px] flex-1">
              <label className="text-[11px] font-semibold text-zinc-500 block uppercase tracking-wider">
                SEARCH
              </label>
              <div className="relative mt-1">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="bg-white border-zinc-300 text-zinc-900 w-full h-9 pl-8 pr-3 rounded-lg border text-xs focus:ring-1 focus:ring-indigo-500 outline-hidden"
                  placeholder="Cari nama / kode..."
                />
                <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-2.5 top-3" />
              </div>
            </div>

            <div className="flex gap-2 items-center ml-auto">
              <span className="text-[11px] text-zinc-500 whitespace-nowrap">
                Menampilkan <strong>{filteredRotations.length}</strong> aktivitas
              </span>
              {hasButtonAccess('btn-export-excel-2') && (
                <button
                  type="button"
                  onClick={handleExport}
                  className="inline-flex items-center justify-center gap-1.5 rounded-lg font-semibold transition whitespace-nowrap h-9 px-3 text-xs bg-emerald-700 text-white hover:bg-emerald-800 shadow-xs cursor-pointer"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5" />
                  Export Excel
                </button>
              )}
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
        <div className="flex-1 min-h-0 overflow-auto relative">
          <table
            ref={tableRef}
            className={`w-full text-xs table-assetflow table-padat resizable-table ${
              gridLines ? 'table-gridlines-active' : ''
            }`}
          >
            <thead className="sticky top-0 z-20 bg-[#1e40af] text-white uppercase shadow-xs">
              <tr>
                <th className="px-3 py-2.5 text-center font-semibold whitespace-nowrap w-[45px] bg-[#1e40af]">NO</th>
                <th className="px-3 py-2.5 text-left font-semibold whitespace-nowrap min-w-[240px] bg-[#1e40af]">NAMA ASET</th>
                <th className="px-3 py-2.5 text-center font-semibold whitespace-nowrap min-w-[60px] bg-[#1e40af]">JENIS</th>
                <th className="px-3 py-2.5 text-left font-semibold whitespace-nowrap min-w-[120px] bg-[#1e40af]">KODE</th>
                <th className="px-3 py-2.5 text-center font-semibold whitespace-nowrap min-w-[100px] bg-[#1e40af]">TGL MASUK</th>
                <th className="px-3 py-2.5 text-center font-semibold whitespace-nowrap min-w-[100px] bg-[#1e40af]">TGL KELUAR</th>
                <th className="px-3 py-2.5 text-center font-semibold whitespace-nowrap min-w-[90px] bg-[#1e40af]">DARI</th>
                <th className="px-3 py-2.5 text-center font-semibold whitespace-nowrap min-w-[90px] bg-[#1e40af]">KE</th>
                <th className="px-3 py-2.5 text-center font-semibold whitespace-nowrap min-w-[120px] bg-[#1e40af]">TIPE</th>
                {canAction && (
                  <th className="px-3 py-2.5 text-center font-semibold whitespace-nowrap min-w-[130px] bg-[#1e40af]">AKSI</th>
                )}
              </tr>
            </thead>
            <tbody>
              {filteredRotations.length === 0 ? (
                <tr>
                  <td colSpan={canAction ? 10 : 9} className="px-3 py-12 text-center text-xs text-zinc-500">
                    Belum ada data rotasi pada filter yang dipilih.
                  </td>
                </tr>
              ) : (
                filteredRotations.map((rot, idx) => (
                  <tr
                    key={rot.id}
                    className="border-b border-zinc-200/70 hover:bg-zinc-50/80 transition-colors"
                  >
                    <td className="px-3 py-2 text-center text-zinc-500 font-mono text-[11px]">{idx + 1}</td>
                    <td className="px-3 py-2 font-medium text-zinc-900">{rot.assetName}</td>
                    <td className="px-3 py-2 text-center font-bold text-[11px] text-zinc-700">{rot.assetType}</td>
                    <td className="px-3 py-2 font-mono font-medium text-zinc-900">{rot.assetCode}</td>
                    <td className="px-3 py-2 text-center font-mono text-[11px] text-zinc-600">
                      {rot.entryDate ? formatDdMmmYy(rot.entryDate) : '-'}
                    </td>
                    <td className="px-3 py-2 text-center font-mono text-[11px] text-zinc-600">
                      {rot.exitDate ? formatDdMmmYy(rot.exitDate) : '-'}
                    </td>
                    <td className="px-3 py-2 text-center font-bold text-zinc-800">
                      {rot.fromLocationCode}
                    </td>
                    <td className="px-3 py-2 text-center font-bold text-indigo-700">
                      {rot.toLocationCode}
                    </td>
                    <td className="px-3 py-2 text-center">
                      <span
                        className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                          rot.type === 'BARU'
                            ? 'bg-emerald-100 text-emerald-800'
                            : rot.type === 'HAPUS'
                            ? 'bg-red-100 text-red-800'
                            : rot.type === 'ROTASI MASUK'
                            ? 'bg-blue-100 text-blue-800'
                            : rot.type === 'EDIT'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-purple-100 text-purple-800'
                        }`}
                      >
                        {rot.type}
                      </span>
                    </td>
                    {canAction && (
                      <td className="px-3 py-2 text-center whitespace-nowrap">
                        <div className="inline-flex items-center gap-1.5 justify-center">
                          {canRiwayat && (
                            <button
                              type="button"
                              onClick={() => onInspectAssetHistory?.(rot.assetCode)}
                              className="inline-flex items-center gap-1 px-2 py-1 rounded text-[10px] font-semibold bg-zinc-100 text-zinc-700 hover:bg-zinc-200 transition cursor-pointer"
                              title="Lihat info perpindahan aset"
                            >
                              <History className="w-3 h-3" /> Info
                            </button>
                          )}
                          {canBatal && (
                            <button
                              type="button"
                              onClick={() => setCancelTarget(rot)}
                              className="inline-flex items-center gap-1 px-2 py-1 rounded text-[10px] font-semibold bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100 hover:border-rose-300 transition cursor-pointer"
                              title="Batalkan aktivitas ini dan kembalikan aset ke lokasi sebelumnya"
                            >
                              <Undo2 className="w-3 h-3 text-rose-600" /> Batal
                            </button>
                          )}
                        </div>
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Bottom Footer Bar */}
        <div className="shrink-0 p-2 sm:p-2.5 flex items-center justify-between border-t border-zinc-200 text-xs bg-zinc-50/95 shadow-xs">
          <span className="font-semibold text-zinc-700">
            Total {filteredRotations.length} aktivitas rotasi terdaftar
          </span>
        </div>
      </div>

      {/* Modal Konfirmasi Pembatalan Aktivitas */}
      {cancelTarget && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full border border-zinc-200 overflow-hidden">
            <div className="p-4 bg-rose-50 border-b border-rose-100 flex items-start gap-3">
              <div className="p-2 rounded-full bg-rose-100 text-rose-700 shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <h3 className="text-sm font-bold text-rose-950">
                  Batalkan Aktivitas {cancelTarget.type}?
                </h3>
                <p className="text-xs text-rose-700 mt-0.5">
                  Tindakan ini akan mengembalikan data dan lokasi aset ke kondisi sebelum aktivitas dilakukan.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setCancelTarget(null)}
                className="text-zinc-400 hover:text-zinc-600 p-1 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 space-y-2.5 text-xs text-zinc-700">
              <div className="grid grid-cols-3 gap-2 py-1 border-b border-zinc-100">
                <span className="text-zinc-500 font-medium">Kode Aset:</span>
                <span className="col-span-2 font-mono font-bold text-zinc-900">{cancelTarget.assetCode}</span>
              </div>
              <div className="grid grid-cols-3 gap-2 py-1 border-b border-zinc-100">
                <span className="text-zinc-500 font-medium">Nama Aset:</span>
                <span className="col-span-2 font-medium text-zinc-900">{cancelTarget.assetName}</span>
              </div>
              <div className="grid grid-cols-3 gap-2 py-1 border-b border-zinc-100">
                <span className="text-zinc-500 font-medium">Tipe Aktivitas:</span>
                <span className="col-span-2">
                  <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold bg-zinc-100 text-zinc-800">
                    {cancelTarget.type}
                  </span>
                </span>
              </div>
              <div className="grid grid-cols-3 gap-2 py-1 border-b border-zinc-100">
                <span className="text-zinc-500 font-medium">Lokasi:</span>
                <span className="col-span-2 font-semibold">
                  {cancelTarget.fromLocationCode} → {cancelTarget.toLocationCode}
                </span>
              </div>
              {cancelTarget.notes && (
                <div className="grid grid-cols-3 gap-2 py-1">
                  <span className="text-zinc-500 font-medium">Keterangan:</span>
                  <span className="col-span-2 text-zinc-600">{cancelTarget.notes}</span>
                </div>
              )}

              <div className="mt-3 p-3 bg-amber-50 rounded-xl border border-amber-200 text-amber-900 text-[11px] leading-relaxed">
                {cancelTarget.type === 'BARU' && (
                  <span>⚠️ Aset baru ini akan <strong>dihapus</strong> dari sistem.</span>
                )}
                {cancelTarget.type === 'HAPUS' && (
                  <span>🔄 Status aset akan <strong>diaktifkan kembali</strong> di lokasi <strong>{cancelTarget.fromLocationCode}</strong>.</span>
                )}
                {cancelTarget.type === 'EDIT' && (
                  <span>🔄 Nilai data aset akan <strong>dikembalikan ke data sebelum diedit</strong>.</span>
                )}
                {(cancelTarget.type === 'ROTASI KELUAR' || cancelTarget.type === 'ROTASI MASUK') && (
                  <span>🔄 Lokasi aset akan <strong>dikembalikan ke {cancelTarget.fromLocationCode}</strong>.</span>
                )}
              </div>
            </div>

            <div className="p-3 bg-zinc-50 border-t border-zinc-200 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setCancelTarget(null)}
                className="px-3.5 py-2 text-xs font-semibold text-zinc-700 bg-white border border-zinc-300 rounded-lg hover:bg-zinc-100 cursor-pointer"
              >
                Kembali
              </button>
              <button
                type="button"
                onClick={() => {
                  if (cancelTarget) {
                    cancelActivity(cancelTarget.id);
                    setCancelTarget(null);
                  }
                }}
                className="px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-lg cursor-pointer shadow-xs inline-flex items-center gap-1.5"
              >
                <Undo2 className="w-3.5 h-3.5" /> Ya, Batalkan Aktivitas
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
