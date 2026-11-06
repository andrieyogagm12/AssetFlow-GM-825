import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { useAssets } from '../context/AssetContext';
import { exportRekapJumlahAsetExcel } from '../utils/excelExport';
import { MultiLocationFilter } from '../components/MultiLocationFilter';
import { useResizableTable } from '../utils/useResizableTable';
import { computeAssetLocationForPeriod, isLocationOperationalInPeriod } from '../utils/assetTimeline';
import { FreezeColumnDropdown, FreezeOption } from '../components/FreezeColumnDropdown';
import { YearFilterInput } from '../components/YearFilterInput';
import { FileSpreadsheet } from 'lucide-react';

const MONTH_NAMES = [
  'JANUARI', 'FEBRUARI', 'MARET', 'APRIL', 'MEI', 'JUNI',
  'JULI', 'AGUSTUS', 'SEPTEMBER', 'OKTOBER', 'NOVEMBER', 'DESEMBER'
];

const MENU3_FREEZE_OPTIONS: FreezeOption[] = [
  { id: '1-3', label: 'Freeze Kolom 1-3' },
  { id: 'none', label: 'Tidak Freeze' },
];

export const ViewRekapJumlahAset: React.FC = () => {
  const {
    locations,
    allowedLocations,
    assets,
    rotations,
    assetTypes,
    gridLines,
    toggleGridLines,
    addToast,
    hasButtonAccess,
    hasColumnAccess,
    isSuperAdmin,
    revenueRevision,
  } = useAssets();

  // Column Access permissions for Menu 3
  const canShowReader = hasColumnAccess('col-reader-3');
  const canShowMesin = hasColumnAccess('col-mesin-3');
  const canShowJoynFun = hasColumnAccess('col-joynfun-3');
  const canShowInventaris = hasColumnAccess('col-inventaris-3');
  const canShowNilaiPastiMesinJf = hasColumnAccess('col-nilai-pasti-mesin-jf-3');
  const canShowNilaiExcelMesinJf = hasColumnAccess('col-nilai-excel-mesin-jf-3');
  const canShowNilaiPastiInv = hasColumnAccess('col-nilai-pasti-inv-3');
  const canShowNilaiExcelInv = hasColumnAccess('col-nilai-excel-inv-3');
  const canShowPendapatanMesin = hasColumnAccess('col-pendapatan-mesin-3');

  const [selectedMonth, setSelectedMonth] = useState<string>(() => String(new Date().getMonth() + 1));
  const [selectedYear, setSelectedYear] = useState<string>(() => String(new Date().getFullYear()));

  // Lokasi yang sedang operasional berdasarkan periode filter (BULAN & TAHUN)
  // Sesuai logika:
  // - Jika lokasi TUTUP pada periode X (misal Nov 2026), filter >= Nov 2026 tidak tampil, sedangkan filter <= Okt 2026 tetap tampil.
  // - Jika lokasi BUKA pada periode Y (misal Mar 2024), filter >= Mar 2024 tampil, sedangkan filter < Mar 2024 tidak tampil.
  const operationalLocations = useMemo(() => {
    return allowedLocations.filter((l) =>
      isLocationOperationalInPeriod(l, selectedYear, selectedMonth)
    );
  }, [allowedLocations, selectedYear, selectedMonth]);

  const { tableRef, ResetButton } = useResizableTable({
    storageKey: 'assetflow_table_resize_3_rekap_aset',
  });

  // Freeze Kolom state: '1-3' or 'none' (Simpan di localStorage 'freeze_menu3')
  const [freezeMode, setFreezeMode] = useState<string>(() => {
    try {
      const saved = localStorage.getItem('freeze_menu3');
      if (saved === '1-3' || saved === 'none') {
        return saved;
      }
    } catch {}
    return '1-3';
  });

  const handleFreezeChange = useCallback((val: string) => {
    setFreezeMode(val);
    try {
      localStorage.setItem('freeze_menu3', val);
    } catch {}
  }, []);

  const isFrozen = freezeMode === '1-3';

  // Dynamic offsets for the first 5 physical columns: NO (col 0), KODE (col 1), NAMA (col 2), TAP (col 3), SWIPE (col 4)
  const DEFAULT_OFFSETS_MENU3 = [0, 45, 120, 320, 370];
  const [frozenOffsets, setFrozenOffsets] = useState<number[]>(DEFAULT_OFFSETS_MENU3);

  const updateFrozenOffsets = useCallback(() => {
    if (!tableRef.current) return;
    const thead = tableRef.current.querySelector('thead');
    if (!thead) return;

    const tr1 = thead.querySelector('tr:first-child');
    const tr2 = thead.querySelector('tr:nth-child(2)');
    if (!tr1 || !tr2) return;

    const thNo = tr1.querySelector('th:first-child');
    const thKode = tr2.querySelector('th:first-child');
    const thNama = tr2.querySelector('th:nth-child(2)');
    const thTap = tr2.querySelector('th:nth-child(3)');
    const thSwipe = tr2.querySelector('th:nth-child(4)');

    const w0 = thNo?.getBoundingClientRect().width || 45;
    const w1 = thKode?.getBoundingClientRect().width || 75;
    const w2 = thNama?.getBoundingClientRect().width || 200;
    const w3 = thTap?.getBoundingClientRect().width || 50;
    const w4 = thSwipe?.getBoundingClientRect().width || 50;

    const off0 = 0;
    const off1 = Math.round(w0);
    const off2 = Math.round(w0 + w1);
    const off3 = Math.round(w0 + w1 + w2);
    const off4 = Math.round(w0 + w1 + w2 + w3);

    setFrozenOffsets([off0, off1, off2, off3, off4]);
  }, [tableRef]);

  useEffect(() => {
    if (!isFrozen) return;
    updateFrozenOffsets();

    const thead = tableRef.current?.querySelector('thead');
    if (!thead) return;

    let observer: ResizeObserver | null = null;
    if (typeof ResizeObserver !== 'undefined') {
      observer = new ResizeObserver(() => {
        updateFrozenOffsets();
      });
      const ths = thead.querySelectorAll('th');
      ths.forEach((th) => observer?.observe(th));
    }

    const handleResize = () => {
      updateFrozenOffsets();
    };
    window.addEventListener('resize', handleResize);

    return () => {
      observer?.disconnect();
      window.removeEventListener('resize', handleResize);
    };
  }, [isFrozen, updateFrozenOffsets, tableRef]);

  const getThStyle3 = (colIdx: number): React.CSSProperties => {
    if (!isFrozen) return {};
    return {
      position: 'sticky',
      left: `${frozenOffsets[colIdx] ?? DEFAULT_OFFSETS_MENU3[colIdx]}px`,
      zIndex: 40,
      backgroundColor: '#1e40af',
    };
  };

  const getTdStyle3 = (colIdx: number): React.CSSProperties => {
    if (!isFrozen) return {};
    return {
      position: 'sticky',
      left: `${frozenOffsets[colIdx] ?? DEFAULT_OFFSETS_MENU3[colIdx]}px`,
      zIndex: 10,
      backgroundColor: '#ffffff',
    };
  };

  const [selectedLocations, setSelectedLocations] = useState<string[]>(() => {
    if (!isSuperAdmin && operationalLocations.length === 1) {
      return [operationalLocations[0].code];
    }
    return ['ALL'];
  });

  // Keterangan manual per lokasi (tersimpan di localStorage, default kosong, hanya diisi manual user)
  const [manualKeterangan, setManualKeterangan] = useState<Record<string, string>>(() => {
    try {
      const saved = localStorage.getItem('gm_rekap_manual_keterangan_v1');
      if (saved) {
        const parsed = JSON.parse(saved);
        const cleaned: Record<string, string> = {};
        for (const [k, v] of Object.entries(parsed)) {
          if (typeof v === 'string') {
            // Bersihkan jika ada teks otomatis lama yang tersimpan
            if (v.startsWith('[QR CONSOLE AKTIF]') || v.startsWith('[GUDANG PUSAT]')) {
              continue;
            }
            cleaned[k] = v;
          }
        }
        return cleaned;
      }
      return {};
    } catch {
      return {};
    }
  });

  const handleKeteranganChange = (locCode: string, val: string) => {
    setManualKeterangan((prev) => {
      const next = { ...prev, [locCode]: val };
      try {
        localStorage.setItem('gm_rekap_manual_keterangan_v1', JSON.stringify(next));
      } catch {}
      return next;
    });
  };

  // Auto-hide notification banner logic in Menu 3:
  // 1. Tampil normal saat halaman dimuat
  // 2. Setelah 5 detik, otomatis hilang dengan animasi slideUp + fadeOut (300ms transition)
  // 3. Tabel preview di bawahnya (#tabel-preview-aset) naik ke atas mengisi area kosong
  // 4. Setelah animasi 300ms, di-remove dari layout (height 0 / display: none) agar tidak ada gap
  // 5. Menggunakan Vanilla JS + CSS murni (tanpa jQuery)
  const [bannerPhase, setBannerPhase] = useState<'visible' | 'collapsing' | 'hidden'>('visible');

  React.useEffect(() => {
    const wrapper = document.querySelector('.auto-hide-notif-wrapper') as HTMLElement | null;
    if (wrapper) {
      wrapper.classList.remove('slide-up-fade-out', 'notif-collapsing', 'is-hidden', 'notif-hidden');
    }
    setBannerPhase('visible');

    const timer5s = window.setTimeout(() => {
      setBannerPhase('collapsing');
      if (wrapper) {
        wrapper.classList.add('slide-up-fade-out', 'notif-collapsing');
      }

      const timer300ms = window.setTimeout(() => {
        setBannerPhase('hidden');
        if (wrapper) {
          wrapper.classList.add('is-hidden', 'notif-hidden');
        }
      }, 300);

      return () => window.clearTimeout(timer300ms);
    }, 5000);

    return () => {
      window.clearTimeout(timer5s);
    };
  }, []);

  React.useEffect(() => {
    if (!isSuperAdmin && operationalLocations.length === 1) {
      setSelectedLocations([operationalLocations[0].code]);
    }
  }, [isSuperAdmin, operationalLocations]);

  // Filter limit date
  const cumulativeLimitDate = useMemo(() => {
    if (selectedYear === 'ALL') return null;
    const y = parseInt(selectedYear, 10);
    const m = selectedMonth === 'ALL' ? 12 : parseInt(selectedMonth, 10);
    return new Date(y, m, 0, 23, 59, 59);
  }, [selectedMonth, selectedYear]);

  // Specific machine types from Master Kategori Aset where category === 'MESIN'
  const mesinTypes = useMemo(() => {
    return assetTypes.filter((t) => t.category === 'MESIN');
  }, [assetTypes]);

  // Specific inventaris types from Master Kategori Aset where category === 'INVENTARIS'
  const invTypes = useMemo(() => {
    return assetTypes.filter((t) => t.category === 'INVENTARIS');
  }, [assetTypes]);

  // Format Rupiah currency
  const formatRupiah = (val?: number | string | null) => {
    if (val === undefined || val === null || val === '') return 'Rp 0,00';
    const num = typeof val === 'number' ? val : parseFloat(String(val).replace(/[^0-9.-]/g, ''));
    if (isNaN(num)) return 'Rp 0,00';
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(num);
  };

  // Helper untuk menghitung total pendapatan mesin pada lokasi & periode tertentu dari Menu 7
  const getRevenueForLocationPeriod = (
    locCode: string,
    year: string,
    month: string
  ): number => {
    let totalRev = 0;
    const parseNum = (str: string): number => {
      if (!str) return 0;
      const clean = String(str).replace(/\./g, '').replace(/,/g, '.').replace(/[^0-9.-]/g, '');
      const val = parseFloat(clean);
      return isNaN(val) ? 0 : val;
    };

    try {
      if (year !== 'ALL' && month !== 'ALL') {
        const key = `gm_rev_data_${locCode}_${parseInt(month, 10)}_${parseInt(year, 10)}`;
        const saved = localStorage.getItem(key);
        if (saved) {
          const parsed = JSON.parse(saved);
          if (parsed.rows && Array.isArray(parsed.rows)) {
            parsed.rows.forEach((r: any) => {
              if (r.hidden) return;
              if (r.players && Array.isArray(r.players)) {
                r.players.forEach((p: any) => {
                  if (p.values) {
                    Object.values(p.values).forEach((v: any) => {
                      if (v && v.revenue) {
                        totalRev += parseNum(v.revenue);
                      }
                    });
                  }
                });
              }
            });
          }
        }
      } else {
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (!key || !key.startsWith(`gm_rev_data_${locCode}_`)) continue;
          const parts = key.split('_');
          if (parts.length >= 6) {
            const kMonth = parts[4];
            const kYear = parts[5];
            if (year !== 'ALL' && kYear !== year) continue;
            if (month !== 'ALL' && kMonth !== month) continue;

            const saved = localStorage.getItem(key);
            if (saved) {
              const parsed = JSON.parse(saved);
              if (parsed.rows && Array.isArray(parsed.rows)) {
                parsed.rows.forEach((r: any) => {
                  if (r.hidden) return;
                  if (r.players && Array.isArray(r.players)) {
                    r.players.forEach((p: any) => {
                      if (p.values) {
                        Object.values(p.values).forEach((v: any) => {
                          if (v && v.revenue) {
                            totalRev += parseNum(v.revenue);
                          }
                        });
                      }
                    });
                  }
                });
              }
            }
          }
        }
      }
    } catch (err) {
      console.error('Error calculating machine revenue for', locCode, err);
    }

    return totalRev;
  };

  // Aggregated data per location with breakdown per specific machine and inventaris types
  // Dihitung dinamis berdasarkan lokasi aset pada periode yang dipilih sesuai data mutasi/rotasi di Menu 5
  // Hanya menampilkan lokasi yang berstatus 'BUKA' (operasional)
  const summaryRows = useMemo(() => {
    const baseLocations = operationalLocations;
    const locList =
      selectedLocations.includes('ALL')
        ? baseLocations
        : baseLocations.filter((l) => selectedLocations.includes(l.code));

    // Map each asset to its active location in the selected period according to Menu 5 rotations
    const activeAssetsInPeriod: { asset: (typeof assets)[0]; computedLocationCode: string }[] = [];

    assets.forEach((asset) => {
      const locInfo = computeAssetLocationForPeriod(
        asset,
        rotations,
        selectedYear,
        selectedMonth
      );

      if (locInfo.isActiveInPeriod) {
        activeAssetsInPeriod.push({
          asset,
          computedLocationCode: locInfo.computedLocationCode,
        });
      }
    });

    return locList.map((loc, idx) => {
      const locAssets = activeAssetsInPeriod
        .filter((item) => item.computedLocationCode === loc.code)
        .map((item) => item.asset);

      const tapCount = locAssets.filter((a) => a.readerTap && a.readerTap.trim() !== '').length;
      const swipeCount = locAssets.filter((a) => a.readerSwipe && a.readerSwipe.trim() !== '').length;

      // Machine breakdown by each specific type from Master Kategori Aset
      const mesinBreakdown: Record<string, number> = {};
      mesinTypes.forEach((mt) => {
        mesinBreakdown[mt.code] = locAssets.filter(
          (a) => a.category === 'MESIN' && a.typeCode === mt.code
        ).length;
      });

      // Inventaris breakdown by each specific type from Master Kategori Aset
      const invBreakdown: Record<string, number> = {};
      invTypes.forEach((it) => {
        invBreakdown[it.code] = locAssets.filter(
          (a) => a.category === 'INVENTARIS' && a.typeCode === it.code
        ).length;
      });

      const mesinCount = locAssets.filter((a) => a.category === 'MESIN').length;
      const jfCount = locAssets.filter((a) => a.category === "JOY'N FUN").length;
      const invCount = locAssets.filter((a) => a.category === 'INVENTARIS').length;
      const total = mesinCount + jfCount + invCount;

      // 1. Total Nilai Perolehan Pasti & Excel (MESIN + JOY'N FUN)
      const mesinJfAssets = locAssets.filter(
        (a) => a.category === 'MESIN' || a.category === "JOY'N FUN"
      );
      const nilaiPastiMesinJf = mesinJfAssets.reduce(
        (sum, a) => sum + (Number(a.costActual) || 0),
        0
      );
      const nilaiExcelMesinJf = mesinJfAssets.reduce(
        (sum, a) => sum + (Number(a.costExcel) || 0),
        0
      );

      // 2. Total Nilai Perolehan Pasti & Excel (INVENTARIS)
      const invAssets = locAssets.filter((a) => a.category === 'INVENTARIS');
      const nilaiPastiInv = invAssets.reduce(
        (sum, a) => sum + (Number(a.costActual) || 0),
        0
      );
      const nilaiExcelInv = invAssets.reduce(
        (sum, a) => sum + (Number(a.costExcel) || 0),
        0
      );

      // 3. Total Pendapatan Mesin (Terkoneksi langsung ke Menu 7)
      const totalPendapatanMesin = getRevenueForLocationPeriod(
        loc.code,
        selectedYear,
        selectedMonth
      );

      // Keterangan default kosong (hanya diisi manual oleh user)
      const savedKet = manualKeterangan[loc.code];
      const finalKet = savedKet !== undefined ? savedKet : '';

      return {
        no: idx + 1,
        code: loc.code,
        name: loc.name,
        tapCount,
        swipeCount,
        mesinBreakdown,
        mesinCount,
        jfCount,
        nilaiPastiMesinJf,
        nilaiExcelMesinJf,
        invBreakdown,
        invCount,
        nilaiPastiInv,
        nilaiExcelInv,
        total,
        totalPendapatanMesin,
        keterangan: finalKet,
        defaultKeterangan: '',
      };
    });
  }, [operationalLocations, assets, rotations, selectedLocations, selectedYear, selectedMonth, mesinTypes, invTypes, manualKeterangan, revenueRevision]);

  // Grand Totals across all locations
  const grandTotals = useMemo(() => {
    const mesinTypeTotals: Record<string, number> = {};
    mesinTypes.forEach((mt) => {
      mesinTypeTotals[mt.code] = 0;
    });

    const invTypeTotals: Record<string, number> = {};
    invTypes.forEach((it) => {
      invTypeTotals[it.code] = 0;
    });

    const totals = summaryRows.reduce(
      (acc, r) => {
        acc.tap += r.tapCount;
        acc.swipe += r.swipeCount;
        acc.mesin += r.mesinCount;
        acc.jf += r.jfCount;
        acc.nilaiPastiMesinJf += r.nilaiPastiMesinJf;
        acc.nilaiExcelMesinJf += r.nilaiExcelMesinJf;
        acc.inv += r.invCount;
        acc.nilaiPastiInv += r.nilaiPastiInv;
        acc.nilaiExcelInv += r.nilaiExcelInv;
        acc.total += r.total;
        acc.totalPendapatanMesin += r.totalPendapatanMesin;

        mesinTypes.forEach((mt) => {
          mesinTypeTotals[mt.code] += r.mesinBreakdown[mt.code] || 0;
        });

        invTypes.forEach((it) => {
          invTypeTotals[it.code] += r.invBreakdown[it.code] || 0;
        });

        return acc;
      },
      {
        tap: 0,
        swipe: 0,
        mesin: 0,
        jf: 0,
        nilaiPastiMesinJf: 0,
        nilaiExcelMesinJf: 0,
        inv: 0,
        nilaiPastiInv: 0,
        nilaiExcelInv: 0,
        total: 0,
        totalPendapatanMesin: 0,
      }
    );

    return { ...totals, mesinTypeTotals, invTypeTotals };
  }, [summaryRows, mesinTypes, invTypes]);

  const handleExport = async () => {
    if (summaryRows.length === 0) {
      addToast('Tidak ada data rekap untuk diekspor', 'warning');
      return;
    }

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

    const filename = `REKAP_JUMLAH_ASET_${perClean}`;

    try {
      await exportRekapJumlahAsetExcel({
        summaryRows,
        grandTotals,
        mesinTypes,
        invTypes,
        periodeLabel,
        filename,
        columnAccess: {
          showNilaiPastiMesinJf: canShowNilaiPastiMesinJf,
          showNilaiExcelMesinJf: canShowNilaiExcelMesinJf,
          showNilaiPastiInv: canShowNilaiPastiInv,
          showNilaiExcelInv: canShowNilaiExcelInv,
          showPendapatanMesin: canShowPendapatanMesin,
        },
      });
      addToast(`Berhasil mengunduh Excel Rekap Jumlah Aset (${filename}.xlsx)`, 'success');
    } catch (err) {
      console.error(err);
      addToast('Gagal mengekspor data ke Excel', 'error');
    }
  };

  return (
    <div className="h-full flex flex-col p-2 sm:p-2.5 min-h-0 overflow-hidden">
      <div className="bg-white border border-zinc-200 rounded-xl shadow-xs flex flex-col flex-1 min-h-0 overflow-hidden">
        {/* Filters Header */}
        <div className="shrink-0 p-2.5 border-b border-zinc-200 flex flex-wrap gap-2.5 items-end">
          <div className="min-w-[240px] flex-1 sm:flex-initial">
            <MultiLocationFilter
              locations={operationalLocations}
              selectedLocations={selectedLocations}
              disabled={!isSuperAdmin && operationalLocations.length === 1}
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

          <div className="ml-auto flex items-center gap-2">
            <span className="text-[11px] text-zinc-500 hidden sm:inline">
              {mesinTypes.length} Mesin • {invTypes.length} Inventaris
            </span>
            {hasButtonAccess('btn-export-excel-3') && (
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
            <FreezeColumnDropdown
              value={freezeMode}
              options={MENU3_FREEZE_OPTIONS}
              onChange={handleFreezeChange}
            />
            <ResetButton />
          </div>

          {/* Banner Notifikasi dengan Auto-Hide Wrapper */}
          <div
            className={`w-full auto-hide-notif-wrapper ${
              bannerPhase === 'collapsing'
                ? 'slide-up-fade-out notif-collapsing'
                : bannerPhase === 'hidden'
                ? 'is-hidden notif-hidden'
                : 'mt-3'
            }`}
          >
            <div
              id="notif-rekap-dinamis"
              className="w-full px-3 py-2 rounded-lg text-[11px] font-medium bg-indigo-50 text-indigo-700 border border-indigo-200 flex flex-wrap items-center justify-between gap-2 shadow-xs"
            >
              <span>
                <strong>Rekap Posisi Aset Dinamis:</strong> Menghitung jumlah aset pada lokasi sesuai periode{' '}
                <strong>
                  {selectedMonth === 'ALL' ? 'SEMUA BULAN' : MONTH_NAMES[parseInt(selectedMonth, 10) - 1]}{' '}
                  {selectedYear}
                </strong>{' '}
                terkoneksi langsung dengan riwayat rotasi di <strong>Menu 5. INFO PERPINDAHAN ASET</strong>.
              </span>
              <span className="text-[10px] font-mono bg-white/70 px-2 py-0.5 rounded border border-indigo-200">
                Periode:{' '}
                {selectedMonth === 'ALL' ? 'Semua Bulan' : MONTH_NAMES[parseInt(selectedMonth, 10) - 1]}{' '}
                {selectedYear}
              </span>
            </div>
          </div>
        </div>

        {/* Table Content */}
        <div id="tabel-preview-aset" className="table-preview-container flex-1 min-h-0 overflow-auto relative">
          <table
            ref={tableRef}
            className={`w-full text-xs table-assetflow table-padat resizable-table ${
              gridLines ? 'table-gridlines-active' : ''
            }`}
          >
            <thead className="sticky top-0 z-20 bg-[#1e40af] text-white shadow-xs uppercase">
              {/* Row 1: Main Category Groups */}
              <tr className="bg-[#1e40af]">
                <th
                  rowSpan={2}
                  style={getThStyle3(0)}
                  className={`px-3 py-2 text-center font-bold border-r border-blue-400/40 w-[45px] min-w-[45px] shrink-0 bg-[#1e40af] ${isFrozen ? 'frozen-col' : ''}`}
                >
                  NO
                </th>
                <th
                  colSpan={2}
                  style={getThStyle3(1)}
                  className={`px-3 py-1.5 text-center font-bold bg-[#1e40af] ${
                    isFrozen && !canShowReader
                      ? 'frozen-col freeze-pane-divider-th border-r-2 border-indigo-400 shadow-[4px_0_8px_-2px_rgba(0,0,0,0.25)]'
                      : 'border-r border-blue-400/40'
                  }`}
                >
                  LOKASI
                </th>
                {canShowReader && (
                  <th
                    colSpan={2}
                    style={getThStyle3(3)}
                    className={`px-3 py-1.5 text-center font-bold bg-[#1e40af] ${
                      isFrozen
                        ? 'frozen-col freeze-pane-divider-th border-r-2 border-indigo-400 shadow-[4px_0_8px_-2px_rgba(0,0,0,0.25)]'
                        : 'border-r border-blue-400/40'
                    }`}
                  >
                    READER
                  </th>
                )}

                {/* MESIN Group with dynamic colSpan matching specific machine types */}
                {canShowMesin && (
                  <th
                    colSpan={mesinTypes.length}
                    className="px-3 py-1.5 text-center font-bold bg-[#1e40af] border-r border-blue-400/40"
                  >
                    MESIN
                  </th>
                )}

                {/* JOY'N FUN Group */}
                {canShowJoynFun && (
                  <th colSpan={1} className="px-3 py-1.5 text-center font-bold bg-[#1e40af] border-r border-blue-400/40">
                    JOY'N FUN
                  </th>
                )}

                {/* 1. TOTAL NILAI PEROLEHAN PASTI (MESIN + JOY'N FUN) */}
                {canShowNilaiPastiMesinJf && (
                  <th
                    rowSpan={2}
                    className="px-2.5 py-2 text-center font-bold border-r border-blue-400/40 w-[145px] min-w-[130px] max-w-[170px] whitespace-normal break-words leading-tight bg-[#1e40af] text-[10.5px] align-middle"
                  >
                    TOTAL NILAI PEROLEHAN PASTI (MESIN + JOY'N FUN)
                  </th>
                )}

                {/* 2. TOTAL NILAI PEROLEHAN EXCEL (MESIN + JOY'N FUN) */}
                {canShowNilaiExcelMesinJf && (
                  <th
                    rowSpan={2}
                    className="px-2.5 py-2 text-center font-bold border-r border-blue-400/40 w-[145px] min-w-[130px] max-w-[170px] whitespace-normal break-words leading-tight bg-[#1e40af] text-[10.5px] align-middle"
                  >
                    TOTAL NILAI PEROLEHAN EXCEL (MESIN + JOY'N FUN)
                  </th>
                )}

                {/* INVENTARIS Group with dynamic colSpan matching specific inventaris types */}
                {canShowInventaris && (
                  <th
                    colSpan={invTypes.length}
                    className="px-3 py-1.5 text-center font-bold bg-[#1e40af] border-r border-blue-400/40"
                  >
                    INVENTARIS
                  </th>
                )}

                {/* 3. TOTAL NILAI PEROLEHAN PASTI (INVENTARIS) */}
                {canShowNilaiPastiInv && (
                  <th
                    rowSpan={2}
                    className="px-2.5 py-2 text-center font-bold border-r border-blue-400/40 w-[140px] min-w-[125px] max-w-[165px] whitespace-normal break-words leading-tight bg-[#1e40af] text-[10.5px] align-middle"
                  >
                    TOTAL NILAI PEROLEHAN PASTI (INVENTARIS)
                  </th>
                )}

                {/* 4. TOTAL NILAI PEROLEHAN EXCEL (INVENTARIS) */}
                {canShowNilaiExcelInv && (
                  <th
                    rowSpan={2}
                    className="px-2.5 py-2 text-center font-bold border-r border-blue-400/40 w-[140px] min-w-[125px] max-w-[165px] whitespace-normal break-words leading-tight bg-[#1e40af] text-[10.5px] align-middle"
                  >
                    TOTAL NILAI PEROLEHAN EXCEL (INVENTARIS)
                  </th>
                )}

                <th rowSpan={2} className="px-3 py-2 text-center font-bold border-r border-blue-400/40 w-[70px] bg-[#1e40af]">
                  TOTAL
                </th>

                {/* 5. TOTAL PENDAPATAN MESIN */}
                {canShowPendapatanMesin && (
                  <th
                    rowSpan={2}
                    className="px-2.5 py-2 text-center font-bold border-r border-blue-400/40 w-[140px] min-w-[125px] max-w-[165px] whitespace-normal break-words leading-tight bg-[#1e40af] text-[10.5px] align-middle"
                  >
                    TOTAL PENDAPATAN MESIN
                  </th>
                )}

                <th rowSpan={2} className="px-3 py-2 text-left font-bold min-w-[200px] bg-[#1e40af]">
                  KETERANGAN
                </th>
              </tr>

              {/* Row 2: Sub-headers */}
              <tr className="bg-[#1e40af]">
                {/* LOKASI Sub-headers */}
                <th
                  style={getThStyle3(1)}
                  className={`px-3 py-1.5 text-left font-bold w-[75px] min-w-[75px] bg-[#1e40af] border-r border-blue-400/40 ${isFrozen ? 'frozen-col' : ''}`}
                >
                  KODE
                </th>
                <th
                  style={getThStyle3(2)}
                  className={`px-3 py-1.5 text-left font-bold min-w-[200px] bg-[#1e40af] ${
                    isFrozen && !canShowReader
                      ? 'frozen-col freeze-pane-divider-th border-r-2 border-indigo-400 shadow-[4px_0_8px_-2px_rgba(0,0,0,0.25)]'
                      : 'border-r border-blue-400/40'
                  }`}
                >
                  NAMA
                </th>

                {/* READER Sub-headers */}
                {canShowReader && (
                  <>
                    <th
                      style={getThStyle3(3)}
                      className={`px-2 py-1.5 text-center font-bold w-[50px] bg-[#1e40af] border-r border-blue-400/40 ${isFrozen ? 'frozen-col' : ''}`}
                    >
                      TAP
                    </th>
                    <th
                      style={getThStyle3(4)}
                      className={`px-2 py-1.5 text-center font-bold w-[50px] bg-[#1e40af] ${
                        isFrozen
                          ? 'frozen-col freeze-pane-divider-th border-r-2 border-indigo-400 shadow-[4px_0_8px_-2px_rgba(0,0,0,0.25)]'
                          : 'border-r border-blue-400/40'
                      }`}
                    >
                      SWIPE
                    </th>
                  </>
                )}

                {/* MESIN Sub-headers: Every specific machine type from Master Kategori Aset */}
                {canShowMesin && mesinTypes.map((mt, mtIdx) => (
                  <th
                    key={mt.code}
                    className={`px-1.5 py-1 text-center font-bold text-[10px] min-w-[34px] bg-[#1e40af] hover:bg-blue-800 transition cursor-help ${
                      mtIdx === mesinTypes.length - 1 ? 'border-r border-blue-400/40' : 'border-r border-blue-700/60'
                    }`}
                    title={`${mt.code} — ${mt.name}`}
                  >
                    {mt.code}
                  </th>
                ))}

                {/* JOY'N FUN Sub-header */}
                {canShowJoynFun && (
                  <th className="px-2 py-1.5 text-center font-bold border-r border-blue-400/40 w-[55px] bg-[#1e40af]" title="Joy'n Fun">
                    JF
                  </th>
                )}

                {/* INVENTARIS Sub-headers: Every specific inventaris type from Master Kategori Aset */}
                {canShowInventaris && invTypes.map((it, itIdx) => (
                  <th
                    key={it.code}
                    className={`px-1.5 py-1 text-center font-bold text-[10px] min-w-[34px] bg-[#1e40af] hover:bg-blue-800 transition cursor-help ${
                      itIdx === invTypes.length - 1 ? 'border-r border-blue-400/40' : 'border-r border-blue-700/60'
                    }`}
                    title={`${it.code} — ${it.name}`}
                  >
                    {it.code}
                  </th>
                ))}
              </tr>
            </thead>

            <tbody>
              {summaryRows.map((r) => (
                <tr
                  key={r.code}
                  className="group border-b border-zinc-200/70 hover:bg-zinc-50/80 transition-colors"
                >
                  <td
                    style={getTdStyle3(0)}
                    className={`px-3 py-2 text-center text-zinc-500 font-mono text-[11px] bg-white group-hover:bg-zinc-50 border-r border-zinc-200/70 ${isFrozen ? 'frozen-col' : ''}`}
                  >
                    {r.no}
                  </td>
                  <td
                    style={getTdStyle3(1)}
                    className={`px-3 py-2 font-bold text-indigo-900 font-mono bg-white group-hover:bg-zinc-50 border-r border-zinc-200/70 ${isFrozen ? 'frozen-col' : ''}`}
                  >
                    {r.code}
                  </td>
                  <td
                    style={getTdStyle3(2)}
                    className={`px-3 py-2 font-medium text-zinc-900 truncate max-w-[220px] bg-white group-hover:bg-zinc-50 ${
                      isFrozen && !canShowReader
                        ? 'frozen-col freeze-pane-divider-td border-r-2 border-indigo-400 shadow-[4px_0_8px_-2px_rgba(0,0,0,0.15)]'
                        : 'border-r border-zinc-200/70'
                    }`}
                    title={r.name}
                  >
                    {r.name}
                  </td>
                  {canShowReader && (
                    <>
                      <td
                        style={getTdStyle3(3)}
                        className={`px-2 py-2 text-center font-mono text-zinc-700 font-medium bg-white group-hover:bg-zinc-50 border-r border-zinc-200/70 ${isFrozen ? 'frozen-col' : ''}`}
                      >
                        {r.tapCount > 0 ? <span className="font-bold text-zinc-900">{r.tapCount}</span> : '0'}
                      </td>
                      <td
                        style={getTdStyle3(4)}
                        className={`px-2 py-2 text-center font-mono text-zinc-700 font-medium bg-white group-hover:bg-zinc-50 ${
                          isFrozen
                            ? 'frozen-col freeze-pane-divider-td border-r-2 border-indigo-400 shadow-[4px_0_8px_-2px_rgba(0,0,0,0.15)]'
                            : 'border-r border-zinc-200/70'
                        }`}
                      >
                        {r.swipeCount > 0 ? <span className="font-bold text-zinc-900">{r.swipeCount}</span> : '0'}
                      </td>
                    </>
                  )}

                  {/* Specific Machine Types Counts */}
                  {canShowMesin && mesinTypes.map((mt) => {
                    const count = r.mesinBreakdown[mt.code] || 0;
                    return (
                      <td
                        key={mt.code}
                        className={`px-1.5 py-1.5 text-center font-mono text-[11px] ${
                          count > 0 ? 'font-bold text-indigo-700 bg-indigo-50/50' : 'text-zinc-400 opacity-60'
                        }`}
                        title={`${mt.code} (${mt.name}): ${count} unit`}
                      >
                        {count}
                      </td>
                    );
                  })}

                  {/* Joy'n Fun */}
                  {canShowJoynFun && (
                    <td className="px-2 py-2 text-center font-mono font-medium text-emerald-800 bg-emerald-50/30">
                      {r.jfCount > 0 ? <span className="font-bold">{r.jfCount}</span> : '0'}
                    </td>
                  )}

                  {/* 1. TOTAL NILAI PEROLEHAN PASTI (MESIN + JOY'N FUN) */}
                  {canShowNilaiPastiMesinJf && (
                    <td className="px-2.5 py-1.5 text-right font-mono text-[11px] font-semibold text-emerald-900 bg-emerald-50/40 whitespace-nowrap">
                      {formatRupiah(r.nilaiPastiMesinJf)}
                    </td>
                  )}

                  {/* 2. TOTAL NILAI PEROLEHAN EXCEL (MESIN + JOY'N FUN) */}
                  {canShowNilaiExcelMesinJf && (
                    <td className="px-2.5 py-1.5 text-right font-mono text-[11px] font-semibold text-teal-900 bg-teal-50/40 whitespace-nowrap">
                      {formatRupiah(r.nilaiExcelMesinJf)}
                    </td>
                  )}

                  {/* Specific Inventaris Types Counts */}
                  {canShowInventaris && invTypes.map((it) => {
                    const count = r.invBreakdown[it.code] || 0;
                    return (
                      <td
                        key={it.code}
                        className={`px-1.5 py-1.5 text-center font-mono text-[11px] ${
                          count > 0 ? 'font-bold text-amber-800 bg-amber-50/60' : 'text-zinc-400 opacity-60'
                        }`}
                        title={`${it.code} (${it.name}): ${count} unit`}
                      >
                        {count}
                      </td>
                    );
                  })}

                  {/* 3. TOTAL NILAI PEROLEHAN PASTI (INVENTARIS) */}
                  {canShowNilaiPastiInv && (
                    <td className="px-2.5 py-1.5 text-right font-mono text-[11px] font-semibold text-amber-900 bg-amber-50/40 whitespace-nowrap">
                      {formatRupiah(r.nilaiPastiInv)}
                    </td>
                  )}

                  {/* 4. TOTAL NILAI PEROLEHAN EXCEL (INVENTARIS) */}
                  {canShowNilaiExcelInv && (
                    <td className="px-2.5 py-1.5 text-right font-mono text-[11px] font-semibold text-orange-900 bg-orange-50/40 whitespace-nowrap">
                      {formatRupiah(r.nilaiExcelInv)}
                    </td>
                  )}

                  {/* Total All (Unit) */}
                  <td className="px-3 py-2 text-center font-mono font-extrabold text-zinc-900 bg-zinc-100/70">
                    {r.total}
                  </td>

                  {/* 5. TOTAL PENDAPATAN MESIN */}
                  {canShowPendapatanMesin && (
                    <td className="px-2.5 py-1.5 text-right font-mono text-[11px] font-bold text-blue-900 bg-blue-50/60 whitespace-nowrap">
                      {formatRupiah(r.totalPendapatanMesin)}
                    </td>
                  )}

                  {/* Keterangan: Default kosong, hanya diisi manual user, default rapat 1 baris, melebihi 1 baris menyesuaikan */}
                  <td className="px-2.5 py-1 align-middle min-w-[220px]">
                    <textarea
                      ref={(el) => {
                        if (el) {
                          el.style.height = 'auto';
                          el.style.height = `${Math.max(26, el.scrollHeight)}px`;
                        }
                      }}
                      value={manualKeterangan[r.code] ?? ''}
                      onChange={(e) => {
                        handleKeteranganChange(r.code, e.target.value);
                        e.target.style.height = 'auto';
                        e.target.style.height = `${Math.max(26, e.target.scrollHeight)}px`;
                      }}
                      placeholder="Ketik keterangan..."
                      rows={1}
                      className="w-full text-[11px] py-1 px-2 border border-zinc-200 rounded-md bg-white hover:border-zinc-300 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/30 outline-hidden transition font-normal text-zinc-800 leading-tight whitespace-pre-wrap min-h-[26px] resize-y overflow-hidden block box-border"
                      title="Ketik keterangan manual untuk lokasi ini (tekan Enter untuk baris baru)"
                    />
                  </td>
                </tr>
              ))}
            </tbody>

            {/* Grand Total Footer */}
            <tfoot className="sticky bottom-0 z-20 bg-zinc-100 font-bold border-t-2 border-indigo-600 text-zinc-900 shadow-md">
              <tr>
                <td
                  colSpan={3}
                  style={isFrozen ? { position: 'sticky', left: 0, zIndex: 30, backgroundColor: '#f4f4f5' } : {}}
                  className={`px-4 py-2.5 text-right font-bold uppercase tracking-wider text-xs bg-zinc-100 ${
                    isFrozen && !canShowReader
                      ? 'frozen-col freeze-pane-divider-td border-r-2 border-indigo-400 shadow-[4px_0_8px_-2px_rgba(0,0,0,0.15)]'
                      : 'border-r border-zinc-300'
                  } ${isFrozen ? 'frozen-col' : ''}`}
                >
                  Grand Total ({summaryRows.length} Lokasi):
                </td>
                {canShowReader && (
                  <>
                    <td
                      style={isFrozen ? { position: 'sticky', left: `${frozenOffsets[3] ?? DEFAULT_OFFSETS_MENU3[3]}px`, zIndex: 30, backgroundColor: '#f4f4f5' } : {}}
                      className={`px-2 py-2 text-center font-mono text-zinc-900 font-bold bg-zinc-100 border-r border-zinc-300 ${isFrozen ? 'frozen-col' : ''}`}
                    >
                      {grandTotals.tap}
                    </td>
                    <td
                      style={isFrozen ? { position: 'sticky', left: `${frozenOffsets[4] ?? DEFAULT_OFFSETS_MENU3[4]}px`, zIndex: 30, backgroundColor: '#f4f4f5' } : {}}
                      className={`px-2 py-2 text-center font-mono text-zinc-900 font-bold bg-zinc-100 ${
                        isFrozen ? 'frozen-col freeze-pane-divider-td border-r-2 border-indigo-400 shadow-[4px_0_8px_-2px_rgba(0,0,0,0.15)]' : ''
                      }`}
                    >
                      {grandTotals.swipe}
                    </td>
                  </>
                )}

                {/* Grand total for each specific machine type */}
                {canShowMesin && mesinTypes.map((mt, mtIdx) => (
                  <td
                    key={mt.code}
                    className={`px-1.5 py-2 text-center font-mono font-bold text-[11px] text-indigo-900 bg-indigo-50/60 ${
                      mtIdx === mesinTypes.length - 1 ? 'border-r border-blue-500' : 'border-r border-blue-700/60'
                    }`}
                    title={`Total ${mt.name}: ${grandTotals.mesinTypeTotals[mt.code] || 0}`}
                  >
                    {grandTotals.mesinTypeTotals[mt.code] || 0}
                  </td>
                ))}

                {/* Grand total Joy'n Fun */}
                {canShowJoynFun && (
                  <td className="px-2 py-2 text-center font-mono font-bold text-emerald-900 bg-emerald-100/60 border-r border-blue-500">
                    {grandTotals.jf}
                  </td>
                )}

                {/* 1. Grand Total Nilai Perolehan Pasti (MESIN + JOY'N FUN) */}
                {canShowNilaiPastiMesinJf && (
                  <td className="px-2.5 py-2 text-right font-mono font-bold text-[11px] text-emerald-950 bg-emerald-100/80 border-r border-blue-500 whitespace-nowrap">
                    {formatRupiah(grandTotals.nilaiPastiMesinJf)}
                  </td>
                )}

                {/* 2. Grand Total Nilai Perolehan Excel (MESIN + JOY'N FUN) */}
                {canShowNilaiExcelMesinJf && (
                  <td className="px-2.5 py-2 text-right font-mono font-bold text-[11px] text-teal-950 bg-teal-100/80 border-r border-blue-500 whitespace-nowrap">
                    {formatRupiah(grandTotals.nilaiExcelMesinJf)}
                  </td>
                )}

                {/* Grand total for each specific inventaris type */}
                {canShowInventaris && invTypes.map((it, itIdx) => (
                  <td
                    key={it.code}
                    className={`px-1.5 py-2 text-center font-mono font-bold text-[11px] text-amber-900 bg-amber-50/70 ${
                      itIdx === invTypes.length - 1 ? 'border-r border-blue-500' : 'border-r border-amber-800/80'
                    }`}
                    title={`Total ${it.name}: ${grandTotals.invTypeTotals[it.code] || 0}`}
                  >
                    {grandTotals.invTypeTotals[it.code] || 0}
                  </td>
                ))}

                {/* 3. Grand Total Nilai Perolehan Pasti (INVENTARIS) */}
                {canShowNilaiPastiInv && (
                  <td className="px-2.5 py-2 text-right font-mono font-bold text-[11px] text-amber-950 bg-amber-100/80 border-r border-blue-500 whitespace-nowrap">
                    {formatRupiah(grandTotals.nilaiPastiInv)}
                  </td>
                )}

                {/* 4. Grand Total Nilai Perolehan Excel (INVENTARIS) */}
                {canShowNilaiExcelInv && (
                  <td className="px-2.5 py-2 text-right font-mono font-bold text-[11px] text-orange-950 bg-orange-100/80 border-r border-blue-500 whitespace-nowrap">
                    {formatRupiah(grandTotals.nilaiExcelInv)}
                  </td>
                )}

                {/* Grand total All (Unit) */}
                <td className="px-3 py-2 text-center font-mono text-sm font-black text-indigo-950 bg-indigo-300/50">
                  {grandTotals.total}
                </td>

                {/* 5. Grand Total Pendapatan Mesin */}
                {canShowPendapatanMesin && (
                  <td className="px-2.5 py-2 text-right font-mono font-bold text-[11px] text-blue-950 bg-blue-100/80 border-r border-blue-500 whitespace-nowrap">
                    {formatRupiah(grandTotals.totalPendapatanMesin)}
                  </td>
                )}

                <td className="px-3 py-2 text-[11px] text-zinc-500 font-normal">
                  Total seluruh unit aset & pendapatan operasional
                </td>
              </tr>
            </tfoot>
          </table>
        </div>

        {/* Bottom Footer Bar */}
        <div className="shrink-0 p-2 sm:p-2.5 flex items-center justify-between border-t border-zinc-200 text-xs bg-zinc-50/95 shadow-xs">
          <span className="font-semibold text-zinc-700">
            Total {summaryRows.length} Lokasi Terdata • Grand Total: {grandTotals.total} Unit Aset
          </span>
          <span className="text-[11px] text-zinc-500 font-mono">
            Periode: {selectedMonth === 'ALL' ? 'Semua Bulan' : MONTH_NAMES[parseInt(selectedMonth, 10) - 1]} {selectedYear}
          </span>
        </div>
      </div>
    </div>
  );
};
