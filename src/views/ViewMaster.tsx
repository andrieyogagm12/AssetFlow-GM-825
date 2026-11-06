import React, { useState, useMemo, useEffect } from 'react';
import { useAssets } from '../context/AssetContext';
import { LocationItem, AssetTypeItem, AssetCategory } from '../types/asset';
import { Plus, Edit2, Trash2, Check, X, Search } from 'lucide-react';
import { useResizableTable } from '../utils/useResizableTable';
import { YearFilterInput } from '../components/YearFilterInput';

export const ViewMaster: React.FC = () => {
  const {
    locations,
    assetTypes,
    assets,
    gridLines,
    toggleGridLines,
    addLocation,
    updateLocation,
    deleteLocation,
    addAssetType,
    updateAssetType,
    deleteAssetType,
    addToast,
    currentUser,
    hasMenuAccess,
    hasButtonAccess,
    hasColumnAccess,
  } = useAssets();

  const isAdmin = currentUser?.akses === 'ADMIN' || currentUser?.akses === 'ADMINISTRATOR';
  const can61 = isAdmin || hasMenuAccess('menu-6.1');
  const can62 = isAdmin || hasMenuAccess('menu-6.2');

  const canSimpanLokasi = hasButtonAccess('btn-simpan-lokasi-6.1');
  const canAksiLokasi = hasButtonAccess('btn-aksi-lokasi-6.1') && hasColumnAccess('col-aksi-6.1');
  const canSimpanKategori = hasButtonAccess('btn-simpan-kategori-6.2');
  const canAksiKategori = hasButtonAccess('btn-aksi-kategori-6.2') && hasColumnAccess('col-aksi-6.2');

  const [activeSubTab, setActiveSubTab] = useState<'lokasi' | 'kategori'>(
    can61 ? 'lokasi' : 'kategori'
  );

  useEffect(() => {
    if (activeSubTab === 'lokasi' && !can61 && can62) {
      setActiveSubTab('kategori');
    } else if (activeSubTab === 'kategori' && !can62 && can61) {
      setActiveSubTab('lokasi');
    }
  }, [activeSubTab, can61, can62]);

  // Drag resizable table hooks
  const { tableRef: tableRefLokasi, ResetButton: ResetButtonLokasi } = useResizableTable({
    storageKey: 'assetflow_table_resize_6_1_master_lokasi',
  });
  const { tableRef: tableRefKategori, ResetButton: ResetButtonKategori } = useResizableTable({
    storageKey: 'assetflow_table_resize_6_2_master_kategori',
  });

  // ------------------------------------------------
  // 6.1 LOKASI STATE
  // ------------------------------------------------
  const MONTH_NAMES = [
    'JANUARI', 'FEBRUARI', 'MARET', 'APRIL', 'MEI', 'JUNI',
    'JULI', 'AGUSTUS', 'SEPTEMBER', 'OKTOBER', 'NOVEMBER', 'DESEMBER'
  ];
  const now = new Date();
  const currentMonthNum = now.getMonth() + 1;
  const currentYearNum = now.getFullYear();

  const [newLocCode, setNewLocCode] = useState('');
  const [newLocName, setNewLocName] = useState('');
  const [newLocTags, setNewLocTags] = useState<('QR' | 'GUDANG')[]>([]);
  const [newLocKondisi, setNewLocKondisi] = useState<'BUKA' | 'TUTUP'>('BUKA');
  const [newLocBulan, setNewLocBulan] = useState<number>(currentMonthNum);
  const [newLocTahun, setNewLocTahun] = useState<number>(currentYearNum);

  const [locSearch, setLocSearch] = useState('');
  const [editingLocCode, setEditingLocCode] = useState<string | null>(null);
  const [editingLocName, setEditingLocName] = useState('');
  const [editingLocKondisi, setEditingLocKondisi] = useState<'BUKA' | 'TUTUP'>('BUKA');
  const [editingLocBulan, setEditingLocBulan] = useState<number>(currentMonthNum);
  const [editingLocTahun, setEditingLocTahun] = useState<number>(currentYearNum);

  const handleSaveLocation = () => {
    if (!newLocCode.trim() || !newLocName.trim()) {
      addToast('Kode dan Nama Lokasi wajib diisi', 'warning');
      return;
    }
    const ok = addLocation({
      id: 'loc-' + Date.now().toString(36),
      code: newLocCode.trim().toUpperCase(),
      name: newLocName.trim(),
      tags: newLocTags.length > 0 ? newLocTags : undefined,
      kondisi: newLocKondisi,
      kondisiBulan: newLocBulan,
      kondisiTahun: newLocTahun,
    });
    if (ok) {
      setNewLocCode('');
      setNewLocName('');
      setNewLocTags([]);
      setNewLocKondisi('BUKA');
      setNewLocBulan(currentMonthNum);
      setNewLocTahun(currentYearNum);
    }
  };

  const handleUpdateLocation = (code: string) => {
    if (!editingLocName.trim()) return;
    updateLocation(code, {
      name: editingLocName.trim(),
      kondisi: editingLocKondisi,
      kondisiBulan: editingLocBulan,
      kondisiTahun: editingLocTahun,
    });
    setEditingLocCode(null);
  };

  const filteredLocations = useMemo(() => {
    let result = locations;
    if (locSearch.trim()) {
      const q = locSearch.toLowerCase();
      result = locations.filter((l) => l.code.toLowerCase().includes(q) || l.name.toLowerCase().includes(q));
    }
    return [...result].sort((a, b) => a.code.localeCompare(b.code, 'id', { numeric: true, sensitivity: 'base' }));
  }, [locations, locSearch]);

  // ------------------------------------------------
  // 6.2 KATEGORI ASET STATE
  // ------------------------------------------------
  const [newTypeCode, setNewTypeCode] = useState('');
  const [newTypeName, setNewTypeName] = useState('');
  const [newTypeCategory, setNewTypeCategory] = useState<AssetCategory>('MESIN');
  const [typeSearch, setTypeSearch] = useState('');
  const [editingTypeCode, setEditingTypeCode] = useState<string | null>(null);
  const [editingNewCode, setEditingNewCode] = useState('');
  const [editingTypeName, setEditingTypeName] = useState('');
  const [editingTypeCategory, setEditingTypeCategory] = useState<AssetCategory>('MESIN');

  const handleSaveAssetType = () => {
    if (!newTypeCode.trim() || !newTypeName.trim()) {
      addToast('Singkatan dan Jenis Spesifik wajib diisi', 'warning');
      return;
    }
    const ok = addAssetType({
      code: newTypeCode.trim().toUpperCase(),
      name: newTypeName.trim().toUpperCase(),
      category: newTypeCategory,
    });
    if (ok) {
      setNewTypeCode('');
      setNewTypeName('');
    }
  };

  const handleUpdateAssetType = (code: string) => {
    const cleanNewCode = editingNewCode.trim().toUpperCase();
    const cleanName = editingTypeName.trim().toUpperCase();
    if (!cleanNewCode) {
      addToast('Singkatan jenis aset tidak boleh kosong', 'warning');
      return;
    }
    if (!cleanName) {
      addToast('Nama jenis spesifik tidak boleh kosong', 'warning');
      return;
    }
    const ok = updateAssetType(code, {
      code: cleanNewCode,
      name: cleanName,
      category: editingTypeCategory,
    });
    if (ok) {
      setEditingTypeCode(null);
    }
  };

  const filteredAssetTypes = useMemo(() => {
    let result = assetTypes;
    if (typeSearch.trim()) {
      const q = typeSearch.toLowerCase();
      result = assetTypes.filter((t) => t.code.toLowerCase().includes(q) || t.name.toLowerCase().includes(q));
    }
    return [...result].sort((a, b) => a.name.localeCompare(b.name, 'id', { numeric: true, sensitivity: 'base' }));
  }, [assetTypes, typeSearch]);

  return (
    <div className="h-full flex flex-col p-2 sm:p-2.5 min-h-0 overflow-hidden">
      <div className="bg-white border border-zinc-200 rounded-xl shadow-xs flex flex-col flex-1 min-h-0 overflow-hidden">
        <div className="flex flex-col flex-1 min-h-0 overflow-hidden p-2.5 sm:p-3">
          {/* Sub-tabs 6.1 and 6.2 */}
          <div className="shrink-0 flex flex-wrap gap-2 mb-3" role="tablist">
            {can61 && (
              <button
                type="button"
                role="tab"
                aria-selected={activeSubTab === 'lokasi'}
                onClick={() => setActiveSubTab('lokasi')}
                className={`px-4 h-9 rounded-full text-xs font-bold transition whitespace-nowrap cursor-pointer ${
                  activeSubTab === 'lokasi'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'bg-zinc-100 text-zinc-700 hover:bg-zinc-200'
                }`}
              >
                6.1 LOKASI ({locations.length})
              </button>
            )}
            {can62 && (
              <button
                type="button"
                role="tab"
                aria-selected={activeSubTab === 'kategori'}
                onClick={() => setActiveSubTab('kategori')}
                className={`px-4 h-9 rounded-full text-xs font-bold transition whitespace-nowrap cursor-pointer ${
                  activeSubTab === 'kategori'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'bg-zinc-100 text-zinc-700 hover:bg-zinc-200'
                }`}
              >
                6.2 KATEGORI ASET ({assetTypes.length})
              </button>
            )}
          </div>

          {!can61 && !can62 && (
            <div className="p-8 text-center text-zinc-500 text-sm">
              Anda tidak memiliki izin untuk mengakses sub-menu di Master Data.
            </div>
          )}

          {/* =================================================== */}
          {/* 6.1 MASTER LOKASI                                   */}
          {/* =================================================== */}
          {activeSubTab === 'lokasi' && can61 && (
            <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
              <div className="shrink-0 flex items-center justify-between gap-3 mb-2">
                <div className="font-bold text-sm text-zinc-900">
                  6.1 MASTER LOKASI - Tambah, Edit, Hapus Lokasi
                </div>
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
              </div>

              {/* Add Location Form */}
              {canSimpanLokasi && (
                <div className="bg-zinc-50 border border-zinc-200 p-3 rounded-lg mb-4">
                  <div className="text-[11px] font-bold text-zinc-700 mb-2 uppercase">
                    Tambah Lokasi Baru
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <input
                      type="text"
                      value={newLocCode}
                      onChange={(e) => setNewLocCode(e.target.value)}
                      placeholder="KODE (ex: BHSC)"
                      maxLength={10}
                      className="bg-white border-zinc-300 text-zinc-900 h-9 px-3 rounded-lg border text-xs font-mono font-bold uppercase focus:ring-1 focus:ring-indigo-500 outline-hidden w-[120px]"
                    />
                    <input
                      type="text"
                      value={newLocName}
                      onChange={(e) => setNewLocName(e.target.value)}
                      placeholder="NAMA LOKASI (ex: GAME MASTER GANDAWIJAYA)"
                      className="bg-white border-zinc-300 text-zinc-900 h-9 px-3 rounded-lg border text-xs focus:ring-1 focus:ring-indigo-500 outline-hidden flex-1 min-w-[200px]"
                    />
                    <div className="flex items-center gap-2 px-2 text-xs text-zinc-600 bg-white border border-zinc-300 rounded-lg h-9">
                      <label className="flex items-center gap-1 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={newLocTags.includes('QR')}
                          onChange={(e) => {
                            if (e.target.checked) setNewLocTags((prev) => [...prev, 'QR']);
                            else setNewLocTags((prev) => prev.filter((t) => t !== 'QR'));
                          }}
                          className="rounded text-indigo-600"
                        />
                        QR
                      </label>
                      <label className="flex items-center gap-1 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={newLocTags.includes('GUDANG')}
                          onChange={(e) => {
                            if (e.target.checked) setNewLocTags((prev) => [...prev, 'GUDANG']);
                            else setNewLocTags((prev) => prev.filter((t) => t !== 'GUDANG'));
                          }}
                          className="rounded text-indigo-600"
                        />
                        GUDANG
                      </label>
                    </div>
                    <div className="flex items-center gap-1.5 bg-white border border-zinc-300 rounded-lg p-0.5">
                      <select
                        value={newLocKondisi}
                        onChange={(e) => setNewLocKondisi(e.target.value as 'BUKA' | 'TUTUP')}
                        className={`h-8 px-2 rounded-md border text-xs font-bold outline-hidden cursor-pointer ${
                          newLocKondisi === 'BUKA'
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                            : 'bg-rose-50 text-rose-800 border-rose-300'
                        }`}
                        title="Kondisi Operasional Lokasi"
                      >
                        <option value="BUKA">BUKA</option>
                        <option value="TUTUP">TUTUP</option>
                      </select>
                      <select
                        value={newLocBulan}
                        onChange={(e) => setNewLocBulan(Number(e.target.value))}
                        className="h-8 px-2 rounded-md border border-zinc-200 text-xs font-semibold bg-white text-zinc-800 outline-hidden"
                        title="Pilihan Periode Bulan"
                      >
                        {MONTH_NAMES.map((m, idx) => (
                          <option key={m} value={idx + 1}>
                            {m}
                          </option>
                        ))}
                      </select>
                      <YearFilterInput
                        value={String(newLocTahun)}
                        onChange={(val) => setNewLocTahun(Number(val) || currentYearNum)}
                        allowAll={false}
                        compact
                        className="w-[76px] shrink-0"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={handleSaveLocation}
                      className="inline-flex items-center justify-center gap-1.5 rounded-lg font-semibold transition whitespace-nowrap h-9 px-3 text-xs bg-blue-600 text-white hover:bg-blue-700 cursor-pointer shadow-xs"
                    >
                      <Plus className="w-3.5 h-3.5" /> Simpan Lokasi
                    </button>
                  </div>
                </div>
              )}

              {/* Search */}
              <div className="mb-3 flex items-center justify-between gap-3">
                <div className="max-w-sm relative flex-1">
                  <input
                    type="text"
                    value={locSearch}
                    onChange={(e) => setLocSearch(e.target.value)}
                    placeholder="Filter lokasi..."
                    className="bg-white border-zinc-300 text-zinc-900 w-full h-8 pl-8 pr-3 rounded-lg border text-xs"
                  />
                  <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-2.5 top-2.5" />
                </div>
                <ResetButtonLokasi />
              </div>

              {/* Table */}
              <div className="flex-1 min-h-0 overflow-auto relative border border-zinc-200 rounded-lg">
                <table
                  ref={tableRefLokasi}
                  className={`w-full text-xs table-assetflow resizable-table ${
                    gridLines ? 'table-gridlines-active' : ''
                  }`}
                >
                  <thead className="sticky top-0 z-20 bg-[#1e40af] text-white shadow-xs">
                    <tr>
                      <th className="px-3 py-2 text-left font-semibold w-[90px] bg-[#1e40af]">
                        <div className="inline-flex items-center gap-1.5" title="Diurutkan berdasarkan KODE (A-Z)">
                          <span>KODE</span>
                          <span className="text-[10px] text-blue-200 font-bold">▲ A-Z</span>
                        </div>
                      </th>
                      <th className="px-3 py-2 text-left font-semibold bg-[#1e40af]">NAMA LOKASI</th>
                      <th className="px-3 py-2 text-left font-semibold w-[120px] bg-[#1e40af]">TIPE</th>
                      <th className="px-3 py-2 text-center font-semibold w-[250px] min-w-[240px] bg-[#1e40af]">KONDISI</th>
                      {canAksiLokasi && (
                        <th className="px-3 py-2 text-center font-semibold w-[120px] bg-[#1e40af]">AKSI</th>
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredLocations.map((loc) => {
                      const isEditing = editingLocCode === loc.code;
                      return (
                        <tr key={loc.code} className="border-b border-zinc-100 hover:bg-zinc-50/70">
                          <td className="px-3 py-2 font-bold font-mono text-zinc-900">{loc.code}</td>
                          <td className="px-3 py-2">
                            {isEditing ? (
                              <div className="flex items-center gap-2">
                                <input
                                  type="text"
                                  value={editingLocName}
                                  onChange={(e) => setEditingLocName(e.target.value)}
                                  className="border border-indigo-400 rounded px-2 py-1 text-xs w-full"
                                  placeholder="Nama lokasi"
                                />
                                <button
                                  type="button"
                                  onClick={() => handleUpdateLocation(loc.code)}
                                  className="p-1 rounded bg-emerald-600 text-white cursor-pointer"
                                  title="Simpan perubahan"
                                >
                                  <Check className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setEditingLocCode(null)}
                                  className="p-1 rounded bg-zinc-300 text-zinc-700 cursor-pointer"
                                  title="Batal"
                                >
                                  <X className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            ) : (
                              <div>
                                <span className="font-medium text-zinc-900">{loc.name}</span>
                                {loc.operationalName && (
                                  <div className="text-[10px] text-zinc-400">
                                    operasional: {loc.operationalName}
                                  </div>
                                )}
                              </div>
                            )}
                          </td>
                          <td className="px-3 py-2">
                            <div className="flex gap-1 flex-wrap">
                              {loc.tags?.map((tag) => (
                                <span
                                  key={tag}
                                  className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                                    tag === 'QR'
                                      ? 'bg-indigo-100 text-indigo-700'
                                      : 'bg-amber-100 text-amber-800'
                                  }`}
                                >
                                  {tag}
                                </span>
                              ))}
                            </div>
                          </td>
                          {/* KONDISI column */}
                          <td className="px-3 py-2 text-center">
                            {isEditing ? (
                              <div className="flex items-center justify-center gap-1 whitespace-nowrap">
                                <select
                                  value={editingLocKondisi}
                                  onChange={(e) => setEditingLocKondisi(e.target.value as 'BUKA' | 'TUTUP')}
                                  className={`px-2 py-1 rounded text-xs font-bold border outline-hidden ${
                                    editingLocKondisi === 'BUKA'
                                      ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                                      : 'bg-rose-50 text-rose-800 border-rose-300'
                                  }`}
                                >
                                  <option value="BUKA">BUKA</option>
                                  <option value="TUTUP">TUTUP</option>
                                </select>
                                <select
                                  value={editingLocBulan}
                                  onChange={(e) => setEditingLocBulan(Number(e.target.value))}
                                  className="px-1.5 py-1 rounded text-xs border border-zinc-300 bg-white text-zinc-800 font-semibold outline-hidden"
                                  title="Pilihan Bulan"
                                >
                                  {MONTH_NAMES.map((m, idx) => (
                                    <option key={m} value={idx + 1}>
                                      {m}
                                    </option>
                                  ))}
                                </select>
                                <YearFilterInput
                                  value={String(editingLocTahun)}
                                  onChange={(val) => setEditingLocTahun(Number(val) || currentYearNum)}
                                  allowAll={false}
                                  compact
                                  className="w-[76px] shrink-0"
                                />
                              </div>
                            ) : (
                              <span
                                className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-bold border tracking-wide ${
                                  (loc.kondisi || 'BUKA') === 'BUKA'
                                    ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                                    : 'bg-rose-50 text-rose-800 border-rose-300'
                                }`}
                                title={`Status kondisi: ${(loc.kondisi || 'BUKA')}${
                                  loc.kondisiBulan && loc.kondisiTahun
                                    ? ` (${MONTH_NAMES[loc.kondisiBulan - 1]} ${loc.kondisiTahun})`
                                    : ''
                                }. Ubah melalui tombol Edit di kolom Aksi.`}
                              >
                                {(loc.kondisi || 'BUKA')}
                                {loc.kondisiBulan && loc.kondisiTahun
                                  ? ` (${MONTH_NAMES[loc.kondisiBulan - 1]} ${loc.kondisiTahun})`
                                  : ''}
                              </span>
                            )}
                          </td>
                          {canAksiLokasi && (
                            <td className="px-3 py-2 text-center">
                              {isEditing ? (
                                <div className="flex justify-center gap-1">
                                  <button
                                    type="button"
                                    onClick={() => handleUpdateLocation(loc.code)}
                                    className="inline-flex items-center justify-center gap-1 rounded-md font-semibold h-6.5 px-2 text-[11px] bg-emerald-600 text-white hover:bg-emerald-700 cursor-pointer"
                                  >
                                    Simpan
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setEditingLocCode(null)}
                                    className="inline-flex items-center justify-center gap-1 rounded-md font-semibold h-6.5 px-2 text-[11px] border border-zinc-300 hover:bg-zinc-100 cursor-pointer"
                                  >
                                    Batal
                                  </button>
                                </div>
                              ) : (
                                <div className="flex justify-center gap-1">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setEditingLocCode(loc.code);
                                      setEditingLocName(loc.name);
                                      setEditingLocKondisi(loc.kondisi || 'BUKA');
                                      setEditingLocBulan(loc.kondisiBulan || currentMonthNum);
                                      setEditingLocTahun(loc.kondisiTahun || currentYearNum);
                                    }}
                                    className="inline-flex items-center justify-center gap-1 rounded-md font-semibold h-6.5 px-2 text-[11px] border border-zinc-300 hover:bg-zinc-100 cursor-pointer"
                                  >
                                    Edit
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => deleteLocation(loc.code)}
                                    title="Hapus lokasi"
                                    className="inline-flex items-center justify-center gap-1 rounded-md font-semibold h-6.5 px-2 text-[11px] border border-red-200 bg-red-50 text-red-700 hover:bg-red-100 cursor-pointer"
                                  >
                                    Hapus
                                  </button>
                                </div>
                              )}
                            </td>
                          )}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div className="shrink-0 mt-2 p-2 sm:p-2.5 rounded-lg border border-zinc-200 text-[11px] bg-zinc-50/95 text-zinc-600 shadow-xs flex items-center justify-between">
                <span>
                  <strong>{locations.length} lokasi terdaftar.</strong> Data otomatis terurut berdasarkan KODE (A-Z). KODE dipakai sebagai awalan KODE aset di semua laporan.
                </span>
                <span className="font-semibold text-zinc-500 font-mono">Master 6.1</span>
              </div>
            </div>
          )}

          {/* =================================================== */}
          {/* 6.2 MASTER KATEGORI ASET                            */}
          {/* =================================================== */}
          {activeSubTab === 'kategori' && can62 && (
            <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
              <div className="shrink-0 flex items-center justify-between gap-3 mb-2">
                <div className="font-bold text-sm text-zinc-900">
                  6.2 MASTER KATEGORI ASET - Kategori, Jenis, Singkatan 2 Huruf
                </div>
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
              </div>

              {/* Add Type Form */}
              {canSimpanKategori && (
                <div className="grid grid-cols-1 md:grid-cols-[110px_1fr_130px_auto] gap-2 max-w-[820px] mb-4 items-center">
                  <input
                    type="text"
                    value={newTypeCode}
                    onChange={(e) => setNewTypeCode(e.target.value)}
                    placeholder="SINGKATAN (AP)"
                    maxLength={4}
                    className="bg-white border-zinc-300 text-zinc-900 h-9 px-3 rounded-lg border text-xs font-mono font-bold uppercase focus:ring-1 focus:ring-indigo-500 outline-hidden"
                  />
                  <input
                    type="text"
                    value={newTypeName}
                    onChange={(e) => setNewTypeName(e.target.value)}
                    placeholder="JENIS SPESIFIK (ex: AIR PISTOL)"
                    className="bg-white border-zinc-300 text-zinc-900 h-9 px-3 rounded-lg border text-xs focus:ring-1 focus:ring-indigo-500 outline-hidden"
                  />
                  <select
                    value={newTypeCategory}
                    onChange={(e) => setNewTypeCategory(e.target.value as AssetCategory)}
                    className="bg-white border-zinc-300 text-zinc-900 h-9 px-3 rounded-lg border text-xs font-semibold"
                  >
                    <option value="MESIN">MESIN</option>
                    <option value="INVENTARIS">INVENTARIS</option>
                    <option value="JOY'N FUN">JOY'N FUN</option>
                  </select>
                  <button
                    type="button"
                    onClick={handleSaveAssetType}
                    className="inline-flex items-center justify-center gap-1.5 rounded-lg font-semibold transition whitespace-nowrap h-9 px-3 text-xs bg-blue-600 text-white hover:bg-blue-700 cursor-pointer shadow-xs"
                  >
                    <Plus className="w-3.5 h-3.5" /> Simpan Kategori
                  </button>
                </div>
              )}

              {/* Search */}
              <div className="mb-3 flex items-center justify-between gap-3">
                <div className="max-w-sm relative flex-1">
                  <input
                    type="text"
                    value={typeSearch}
                    onChange={(e) => setTypeSearch(e.target.value)}
                    placeholder="Filter jenis aset..."
                    className="bg-white border-zinc-300 text-zinc-900 w-full h-8 pl-8 pr-3 rounded-lg border text-xs"
                  />
                  <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-2.5 top-2.5" />
                </div>
                <ResetButtonKategori />
              </div>

              {/* Table */}
              <div className="flex-1 min-h-0 overflow-auto relative border border-zinc-200 rounded-lg">
                <table
                  ref={tableRefKategori}
                  className={`w-full text-xs table-assetflow resizable-table ${
                    gridLines ? 'table-gridlines-active' : ''
                  }`}
                >
                  <thead className="sticky top-0 z-20 bg-[#1e40af] text-white shadow-xs">
                    <tr>
                      <th className="px-3 py-2 text-left font-semibold w-[90px] bg-[#1e40af]">SINGKATAN</th>
                      <th className="px-3 py-2 text-left font-semibold bg-[#1e40af]">
                        <div className="inline-flex items-center gap-1.5" title="Diurutkan berdasarkan JENIS SPESIFIK (A-Z)">
                          <span>JENIS SPESIFIK</span>
                          <span className="text-[10px] text-blue-200 font-bold">▲ A-Z</span>
                        </div>
                      </th>
                      <th className="px-3 py-2 text-center font-semibold w-[140px] bg-[#1e40af]">KATEGORI ASET</th>
                      <th className="px-3 py-2 text-center font-semibold w-[120px] bg-[#1e40af]">DIPAKAI</th>
                      {canAksiKategori && (
                        <th className="px-3 py-2 text-center font-semibold w-[120px] bg-[#1e40af]">AKSI</th>
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredAssetTypes.map((typ) => {
                      const isEditing = editingTypeCode === typ.code;
                      const activeUsage = assets.filter(
                        (a) => a.typeCode === typ.code && a.status === 'ACTIVE'
                      ).length;
                      const inUse = activeUsage > 0 || (typ.count && typ.count > 0);

                      return (
                        <tr key={typ.code} className="border-b border-zinc-100 hover:bg-zinc-50/70">
                          <td className="px-3 py-2 font-bold font-mono text-zinc-900">
                            {isEditing ? (
                              <input
                                type="text"
                                value={editingNewCode}
                                onChange={(e) => setEditingNewCode(e.target.value.toUpperCase())}
                                maxLength={6}
                                className="border border-indigo-400 rounded px-2 py-1 text-xs w-20 font-mono font-bold uppercase bg-white focus:ring-1 focus:ring-indigo-500 outline-hidden"
                                placeholder="KODE"
                              />
                            ) : (
                              typ.code
                            )}
                          </td>
                          <td className="px-3 py-2">
                            {isEditing ? (
                              <div className="flex items-center gap-2">
                                <input
                                  type="text"
                                  value={editingTypeName}
                                  onChange={(e) => setEditingTypeName(e.target.value.toUpperCase())}
                                  className="border border-indigo-400 rounded px-2 py-1 text-xs w-full uppercase bg-white focus:ring-1 focus:ring-indigo-500 outline-hidden"
                                  placeholder="JENIS SPESIFIK"
                                />
                                <button
                                  type="button"
                                  onClick={() => handleUpdateAssetType(typ.code)}
                                  title="Simpan Perubahan"
                                  className="p-1 rounded bg-emerald-600 text-white hover:bg-emerald-700 cursor-pointer shadow-xs"
                                >
                                  <Check className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setEditingTypeCode(null)}
                                  title="Batal"
                                  className="p-1 rounded bg-zinc-300 text-zinc-700 hover:bg-zinc-400 cursor-pointer"
                                >
                                  <X className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            ) : (
                              <span className="font-medium text-zinc-900">{typ.name}</span>
                            )}
                          </td>
                          <td className="px-3 py-2 text-center">
                            {isEditing ? (
                              <select
                                value={editingTypeCategory}
                                onChange={(e) => setEditingTypeCategory(e.target.value as AssetCategory)}
                                className="border border-indigo-400 rounded px-1.5 py-1 text-xs bg-white font-semibold focus:ring-1 focus:ring-indigo-500 outline-hidden"
                              >
                                <option value="MESIN">MESIN</option>
                                <option value="INVENTARIS">INVENTARIS</option>
                                <option value="JOY'N FUN">JOY'N FUN</option>
                              </select>
                            ) : (
                              <span
                                className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                                  typ.category === 'MESIN'
                                    ? 'bg-indigo-100 text-indigo-800'
                                    : typ.category === 'INVENTARIS'
                                    ? 'bg-amber-100 text-amber-800'
                                    : 'bg-emerald-100 text-emerald-800'
                                }`}
                              >
                                {typ.category}
                              </span>
                            )}
                          </td>
                          <td className="px-3 py-2 text-center font-mono text-[11px] text-zinc-600">
                            {typ.count !== undefined ? `${typ.count} aset` : `${activeUsage} aset`}
                          </td>
                          {canAksiKategori && (
                            <td className="px-3 py-2 text-center">
                              <div className="flex justify-center gap-1">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setEditingTypeCode(typ.code);
                                    setEditingNewCode(typ.code);
                                    setEditingTypeName(typ.name);
                                    setEditingTypeCategory(typ.category);
                                  }}
                                  className="inline-flex items-center justify-center gap-1 rounded-md font-semibold h-6.5 px-2 text-[11px] border border-zinc-300 hover:bg-zinc-100 cursor-pointer"
                                >
                                  Edit
                                </button>
                                <button
                                  type="button"
                                  onClick={() => deleteAssetType(typ.code)}
                                  disabled={Boolean(inUse)}
                                  title={inUse ? 'Masih dipakai aset' : 'Hapus jenis'}
                                  className="inline-flex items-center justify-center gap-1 rounded-md font-semibold h-6.5 px-2 text-[11px] border border-red-200 bg-red-50 text-red-700 hover:bg-red-100 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                                >
                                  Hapus
                                </button>
                              </div>
                            </td>
                          )}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div className="shrink-0 mt-2 p-2 sm:p-2.5 rounded-lg border border-zinc-200 text-[11px] bg-zinc-50/95 text-zinc-600 shadow-xs flex items-center justify-between">
                <span>
                  <strong>{assetTypes.length} kategori & jenis spesifik terdaftar.</strong> Data otomatis terurut berdasarkan JENIS SPESIFIK (A-Z). SINGKATAN dipakai sebagai JENIS di setiap KODE aset.
                </span>
                <span className="font-semibold text-zinc-500 font-mono">Master 6.2</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
