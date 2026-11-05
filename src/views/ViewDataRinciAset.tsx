import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { useAssets } from '../context/AssetContext';
import { Asset } from '../types/asset';
import { exportDataRinciAsetExcel } from '../utils/excelExport';
import { PhotoModal } from '../components/PhotoModal';
import { MultiLocationFilter } from '../components/MultiLocationFilter';
import { MultiSpecificTypeFilter } from '../components/MultiSpecificTypeFilter';
import { useResizableTable } from '../utils/useResizableTable';
import { formatDdMmmYy } from '../utils/dateFormatter';
import { computeAssetLocationForPeriod } from '../utils/assetTimeline';
import {
  generateHistoriMonths,
  getYearColorStyle,
  computeAssetHistoryMap,
  HistoryMonthColumn,
} from '../utils/assetHistoryColumns';
import { HistoryYearFilterDropdown, ALL_HISTORY_YEARS } from '../components/HistoryYearFilterDropdown';
import { FreezeColumnDropdown, FreezeOption } from '../components/FreezeColumnDropdown';
import { YearFilterInput } from '../components/YearFilterInput';
import { Eye, Search, FileSpreadsheet, Lock, ExternalLink, ArrowUpDown } from 'lucide-react';

const MENU1_FREEZE_OPTIONS: FreezeOption[] = [
  { id: '1-6', label: 'Freeze Kolom 1-6' },
  { id: '1-15', label: 'Freeze Kolom 1-15' },
  { id: 'none', label: 'Tidak Freeze' },
];

interface ViewDataRinciAsetProps {
  onNavigateToEdit?: (assetCode: string) => void;
  onNavigateToRotate?: (assetCode: string) => void;
}

interface AssetWithComputedLocation extends Asset {
  computedLocationCode: string;
  computedEntryDate?: string;
}

const MONTH_NAMES = [
  'JANUARI', 'FEBRUARI', 'MARET', 'APRIL', 'MEI', 'JUNI',
  'JULI', 'AGUSTUS', 'SEPTEMBER', 'OKTOBER', 'NOVEMBER', 'DESEMBER'
];

// Default column widths for the 15 base data columns (Kode Lokasi s/d Keterangan)
const DEFAULT_FROZEN_WIDTHS = [75, 42, 170, 65, 70, 100, 125, 125, 105, 85, 70, 70, 95, 85, 180];

const DEFAULT_FROZEN_OFFSETS = (() => {
  const offsets = [0];
  for (let i = 0; i < DEFAULT_FROZEN_WIDTHS.length - 1; i++) {
    offsets.push(offsets[i] + DEFAULT_FROZEN_WIDTHS[i]);
  }
  return offsets;
})();

export const ViewDataRinciAset: React.FC<ViewDataRinciAsetProps> = ({
  onNavigateToEdit,
  onNavigateToRotate,
}) => {
  const {
    locations,
    allowedLocations,
    assetTypes,
    assets,
    allAssets,
    rotations,
    allRotations,
    gridLines,
    toggleGridLines,
    addToast,
    isPeriodLocked,
    hasButtonAccess,
    hasColumnAccess,
    currentUser,
    isSuperAdmin,
    validateAssetAccess,
  } = useAssets();

  const showNilaiPasti = hasColumnAccess('col-nilai-pasti-1');
  const showNilaiExcel = hasColumnAccess('col-nilai-excel-1');
  const showSupplier = hasColumnAccess('col-supplier-1');
  const showTanggalBeli = hasColumnAccess('col-tanggal-beli-1');

  // Dynamic mapping of column indices based on which columns are accessible
  const baseColumnIndices = useMemo(() => {
    let idx = 6;
    const colNilaiPasti = showNilaiPasti ? idx++ : -1;
    const colNilaiExcel = showNilaiExcel ? idx++ : -1;
    const colSupplier = showSupplier ? idx++ : -1;
    const colTanggalBeli = showTanggalBeli ? idx++ : -1;
    const colReaderTap = idx++;
    const colReaderSwipe = idx++;
    const colHargaBermain = idx++;
    const colTanggalMasuk = idx++;
    const colKeterangan = idx++;
    const totalCols = idx;
    return {
      colNilaiPasti,
      colNilaiExcel,
      colSupplier,
      colTanggalBeli,
      colReaderTap,
      colReaderSwipe,
      colHargaBermain,
      colTanggalMasuk,
      colKeterangan,
      totalCols,
    };
  }, [showNilaiPasti, showNilaiExcel, showSupplier, showTanggalBeli]);

  const { tableRef, ResetButton } = useResizableTable({
    storageKey: 'assetflow_table_resize_1_data_rinci_aset',
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
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [selectedSpecificTypes, setSelectedSpecificTypes] = useState<string[]>(['ALL']);
  const [rowsPerPage, setRowsPerPage] = useState<number>(100);
  const [currentPage, setCurrentPage] = useState<number>(1);

  // Sync selectedLocations if user restrictions change
  useEffect(() => {
    if (!isSuperAdmin && allowedLocations.length === 1) {
      setSelectedLocations([allowedLocations[0].code]);
    }
  }, [isSuperAdmin, allowedLocations]);

  // Histori Lokasi state & filters (Default OFF)
  const [historyMode, setHistoryMode] = useState<boolean>(false);
  const [selectedHistoryYears, setSelectedHistoryYears] = useState<string[]>([...ALL_HISTORY_YEARS]);

  // Freeze Kolom state: '1-6', '1-15', or 'none' (Simpan di localStorage 'freeze_menu1')
  const [freezeMode, setFreezeMode] = useState<string>(() => {
    try {
      const saved = localStorage.getItem('freeze_menu1');
      if (saved === '1-6' || saved === '1-15' || saved === 'none') {
        return saved;
      }
    } catch {}
    return 'none';
  });

  const handleFreezeChange = useCallback((val: string) => {
    setFreezeMode(val);
    try {
      localStorage.setItem('freeze_menu1', val);
    } catch {}
  }, []);

  const isColumnFrozen = useCallback(
    (colIdx: number) => {
      // Jika user memilih 'none' (Tidak Freeze), kolom TIDAK BOLEH di-freeze meskipun Riwayat Lokasi aktif
      if (freezeMode === 'none') {
        return false;
      }
      if (freezeMode === '1-6') {
        return colIdx <= 5;
      }
      if (freezeMode === '1-15') {
        return colIdx <= baseColumnIndices.colKeterangan;
      }
      return false;
    },
    [freezeMode, baseColumnIndices]
  );

  // Dynamic left offsets for base frozen columns
  const [frozenOffsets, setFrozenOffsets] = useState<number[]>(DEFAULT_FROZEN_OFFSETS);

  const updateFrozenOffsets = useCallback(() => {
    if (!tableRef.current) return;
    const thead = tableRef.current.querySelector('thead');
    if (!thead) return;
    const ths = thead.querySelectorAll('tr:first-child th');
    if (ths.length < baseColumnIndices.totalCols) return;

    const newOffsets: number[] = [];
    let currentLeft = 0;
    for (let i = 0; i < baseColumnIndices.totalCols; i++) {
      newOffsets.push(currentLeft);
      const rect = ths[i]?.getBoundingClientRect();
      currentLeft += rect?.width || 0;
    }
    setFrozenOffsets(newOffsets);
  }, [tableRef, baseColumnIndices]);

  // Recalculate sticky offsets whenever freezeMode is active or table/columns are resized
  useEffect(() => {
    if (freezeMode === 'none') return;

    updateFrozenOffsets();

    const thead = tableRef.current?.querySelector('thead');
    if (!thead) return;

    let observer: ResizeObserver | null = null;
    if (typeof ResizeObserver !== 'undefined') {
      observer = new ResizeObserver(() => {
        updateFrozenOffsets();
      });
      const ths = thead.querySelectorAll('tr:first-child th');
      ths.forEach((th, idx) => {
        if (idx < baseColumnIndices.totalCols) observer?.observe(th);
      });
    }

    const handleResize = () => {
      updateFrozenOffsets();
    };
    window.addEventListener('resize', handleResize);

    return () => {
      observer?.disconnect();
      window.removeEventListener('resize', handleResize);
    };
  }, [freezeMode, updateFrozenOffsets, tableRef, baseColumnIndices]);

  const getStickyStyle = (colIdx: number, isHeader = false): React.CSSProperties => {
    if (!isColumnFrozen(colIdx)) return {};
    const leftPos = frozenOffsets[colIdx] ?? DEFAULT_FROZEN_OFFSETS[colIdx] ?? 0;
    return {
      position: 'sticky',
      left: `${leftPos}px`,
      zIndex: isHeader ? 40 : 20,
    };
  };

  const getStickyClass = (colIdx: number, isHeader = false): string => {
    if (!isColumnFrozen(colIdx)) return '';
    const lastFrozenIdx = freezeMode === '1-6' ? 5 : baseColumnIndices.colKeterangan;
    const isLastFrozen = colIdx === lastFrozenIdx;

    if (isHeader) {
      if (colIdx === 5 && !isLastFrozen) return 'col-sticky-freeze-th-code frozen-col';
      if (isLastFrozen) return 'col-sticky-freeze-th freeze-pane-divider-th frozen-col';
      return 'col-sticky-freeze-th frozen-col';
    } else {
      if (colIdx === 5 && !isLastFrozen) return 'col-sticky-freeze-td-code frozen-col';
      if (isLastFrozen) return 'col-sticky-freeze-td freeze-pane-divider-td frozen-col';
      return 'col-sticky-freeze-td frozen-col';
    }
  };

  // Auto-hide 2 notification banners logic (5 detik tampil, slideUp + fadeOut 300ms, lalu dihapus dari layout)
  const [bannerPhase, setBannerPhase] = useState<'visible' | 'collapsing' | 'hidden'>('visible');

  useEffect(() => {
    const timer5s = setTimeout(() => {
      setBannerPhase('collapsing');
    }, 5000);

    return () => clearTimeout(timer5s);
  }, []);

  useEffect(() => {
    if (bannerPhase === 'collapsing') {
      const timer300ms = setTimeout(() => {
        setBannerPhase('hidden');
      }, 300);

      return () => clearTimeout(timer300ms);
    }
  }, [bannerPhase]);

  // Role protection: Only Akunting or Admin accounts, or accounts with btn-histori-lokasi-1 granted in Menu 8.1
  const canHistori = hasButtonAccess('btn-histori-lokasi-1');
  const isAkunting = Boolean(
    canHistori ||
    (currentUser && (
      (currentUser as any).role === 'AKUNTING' ||
      (currentUser as any).role === 'ADMIN' ||
      currentUser.akses === 'ADMIN' ||
      currentUser.akses === 'ADMINISTRATOR' ||
      (currentUser.akses as string) === 'AKUNTING' ||
      currentUser.namaUser?.toLowerCase().includes('akunting') ||
      currentUser.namaUser?.toLowerCase().includes('admin')
    ))
  );

  const canEdit = hasButtonAccess('btn-edit-aset-1');
  const canRotate = hasButtonAccess('btn-rotasi-aset-1');
  const canExport = hasButtonAccess('btn-export-excel-1');
  const canAction = canEdit || canRotate;

  const isSelectedPeriodLocked = useMemo(() => {
    const hasSingleLoc = selectedLocations.length === 1 && selectedLocations[0] !== 'ALL';
    if (!hasSingleLoc) {
      if (selectedMonth === 'ALL' || selectedYear === 'ALL') return false;
      return isPeriodLocked('ALL', parseInt(selectedMonth, 10), parseInt(selectedYear, 10));
    }
    const loc = selectedLocations[0];
    const m = selectedMonth === 'ALL' ? 'ALL' : parseInt(selectedMonth, 10);
    const y = selectedYear === 'ALL' ? 'ALL' : parseInt(selectedYear, 10);
    return isPeriodLocked(loc, m, y);
  }, [selectedLocations, selectedMonth, selectedYear, isPeriodLocked]);

  // Photo modal state
  const [photoModalData, setPhotoModalData] = useState<{
    isOpen: boolean;
    title: string;
    photoUrl?: string;
    assetCode?: string;
  }>({
    isOpen: false,
    title: '',
  });

  // 1. Calculate cumulative date limit if month/year are selected
  const cumulativeLimitDate = useMemo(() => {
    if (selectedYear === 'ALL') return null;
    const y = parseInt(selectedYear, 10);
    const m = selectedMonth === 'ALL' ? 12 : parseInt(selectedMonth, 10);
    // End of the selected month
    return new Date(y, m, 0, 23, 59, 59);
  }, [selectedMonth, selectedYear]);

  // 2. Compute location per asset DINAMIS mengikuti periode BULAN dan TAHUN yang dipilih user
  // Sumber kebenaran: Menu 5. INFO PERPINDAHAN ASET (rotations)
  // Aturan Bisnis Utama:
  // 1. Cari semua data perpindahan dimana TANGGAL MASUK <= akhir bulan dari periode yang dipilih
  // 2. Urutkan TANGGAL MASUK DESC, ambil LOKASI TERKINI yang paling atas (paling terakhir).
  //    Jika dalam 1 periode ada beberapa kali rotasi, ambil yang paling terakhir.
  // 3. Fallback: Jika belum pernah punya data di Menu 5 sampai periode tersebut, fallback ke lokasi awal aset (saat pertama dibuat).
  // 4. Mode Kumulatif: Aset yang baru masuk setelah akhir periode tidak muncul.
  // 5. Hak akses lokasi akun tetap dihormati (user restricted hanya melihat aset yang lokasinya diizinkan di periode itu).
  const assetsWithDynamicLocation = useMemo<AssetWithComputedLocation[]>(() => {
    const allowedLocCodes = isSuperAdmin ? null : allowedLocations.map((l) => l.code);
    const poolAssets = allAssets && allAssets.length > 0 ? allAssets : assets;
    const poolRotations = allRotations && allRotations.length > 0 ? allRotations : rotations;

    const list: AssetWithComputedLocation[] = [];

    poolAssets.forEach((asset) => {
      const locInfo = computeAssetLocationForPeriod(
        asset,
        poolRotations,
        selectedYear,
        selectedMonth,
        true // requireStrictHistory
      );

      // Rule: Jika belum lahir / tidak aktif di periode ini -> JANGAN TAMPILKAN
      if (!locInfo.isActiveInPeriod || !locInfo.computedLocationCode) {
        return;
      }

      // Hak Akses Lokasi Akun: User hanya boleh melihat aset jika lokasi aktif saat itu ada dalam user_allowed_locations
      if (allowedLocCodes !== null && !allowedLocCodes.includes(locInfo.computedLocationCode)) {
        return;
      }

      list.push({
        ...asset,
        computedLocationCode: locInfo.computedLocationCode,
        computedEntryDate: locInfo.computedEntryDate || asset.entryDate,
      });
    });

    return list;
  }, [
    assets,
    allAssets,
    rotations,
    allRotations,
    selectedYear,
    selectedMonth,
    isSuperAdmin,
    allowedLocations,
  ]);

  // Asset counts per allowed location for filter labels (dihitung dinamis berdasarkan lokasi aktual aset di periode terpilih)
  const assetCountsByLocation = useMemo(() => {
    const counts: Record<string, number> = {};
    assetsWithDynamicLocation.forEach((a) => {
      counts[a.computedLocationCode] = (counts[a.computedLocationCode] || 0) + 1;
    });
    return counts;
  }, [assetsWithDynamicLocation]);

  // 3. Category counts based on assets present in this period
  const categoryCounts = useMemo(() => {
    let base = assetsWithDynamicLocation;
    if (!selectedLocations.includes('ALL')) {
      base = base.filter((a) => selectedLocations.includes(a.computedLocationCode));
    }

    const mesinCount = base.filter((a) => a.category === 'MESIN').length;
    const invCount = base.filter((a) => a.category === 'INVENTARIS').length;
    const jfCount = base.filter((a) => a.category === "JOY'N FUN").length;

    return {
      all: base.length,
      mesin: mesinCount,
      inv: invCount,
      jf: jfCount,
    };
  }, [assetsWithDynamicLocation, selectedLocations]);

  // Available asset types filtered by selected category
  const availableAssetTypes = useMemo(() => {
    return assetTypes.filter((t) => selectedCategory === 'ALL' || t.category === selectedCategory);
  }, [assetTypes, selectedCategory]);

  // Asset counts per specific type for current category and selected locations
  const assetCountsByType = useMemo(() => {
    const counts: Record<string, number> = {};
    assetsWithDynamicLocation.forEach((a) => {
      const locMatch = selectedLocations.includes('ALL') || selectedLocations.includes(a.computedLocationCode);
      const catMatch = selectedCategory === 'ALL' || a.category === selectedCategory;
      if (locMatch && catMatch && a.typeCode) {
        counts[a.typeCode] = (counts[a.typeCode] || 0) + 1;
      }
    });
    return counts;
  }, [assetsWithDynamicLocation, selectedLocations, selectedCategory]);

  // 4. Filtered & Sorted Assets (Urutan data diurutkan berdasarkan kolom KODE ASET)
  const filteredAssets = useMemo(() => {
    const list = assetsWithDynamicLocation.filter((asset) => {
      // Location filter (multi-select)
      if (!selectedLocations.includes('ALL')) {
        if (!selectedLocations.includes(asset.computedLocationCode)) {
          return false;
        }
      }

      // Category filter
      if (selectedCategory !== 'ALL' && asset.category !== selectedCategory) {
        return false;
      }

      // Specific Type filter (multi-select with checkboxes)
      if (!selectedSpecificTypes.includes('ALL')) {
        if (selectedSpecificTypes.length === 0 || !selectedSpecificTypes.includes(asset.typeCode)) {
          return false;
        }
      }

      // Search Query across all 11 columns
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchLoc = asset.computedLocationCode.toLowerCase().includes(q);
        const matchType = asset.typeCode.toLowerCase().includes(q);
        const matchCostActual = String(asset.costActual || '').toLowerCase().includes(q);
        const matchCostExcel = String(asset.costExcel || '').toLowerCase().includes(q);
        const matchSupplier = (asset.supplier || '').toLowerCase().includes(q);
        const matchBuyDate = (asset.buyDate || '').toLowerCase().includes(q);
        const matchReaderTap = (asset.readerTap || '').toLowerCase().includes(q);
        const matchReaderSwipe = (asset.readerSwipe || '').toLowerCase().includes(q);
        const matchPrice = String(asset.playPrice || '').toLowerCase().includes(q);
        const matchEntry = (asset.computedEntryDate || asset.entryDate || '').toLowerCase().includes(q);
        const matchNotes = (asset.notes || '').toLowerCase().includes(q);
        const matchName = asset.name.toLowerCase().includes(q);
        const matchCode = asset.code.toLowerCase().includes(q);

        if (
          !matchLoc &&
          !matchType &&
          !matchCostActual &&
          !matchCostExcel &&
          !matchSupplier &&
          !matchBuyDate &&
          !matchReaderTap &&
          !matchReaderSwipe &&
          !matchPrice &&
          !matchEntry &&
          !matchNotes &&
          !matchName &&
          !matchCode
        ) {
          return false;
        }
      }

      return true;
    });

    // Urutkan data yang tampil berdasarkan kolom KODE ASET secara ascending (natural alphanumeric)
    return list.sort((a, b) =>
      a.code.localeCompare(b.code, undefined, { numeric: true, sensitivity: 'base' })
    );
  }, [
    assetsWithDynamicLocation,
    selectedLocations,
    selectedCategory,
    selectedSpecificTypes,
    searchQuery,
  ]);

  // 5. Total Sums for Summary Cards (hanya untuk data yang sedang tampil / ter-filter)
  const totalCostActual = useMemo(() => {
    return filteredAssets.reduce((sum, a) => sum + (a.costActual || 0), 0);
  }, [filteredAssets]);

  const totalCostExcel = useMemo(() => {
    return filteredAssets.reduce((sum, a) => sum + (a.costExcel || 0), 0);
  }, [filteredAssets]);

  // Pagination
  const totalRows = filteredAssets.length;
  const totalPages = rowsPerPage === 0 ? 1 : Math.ceil(totalRows / rowsPerPage) || 1;
  const paginatedAssets = useMemo(() => {
    if (rowsPerPage === 0) return filteredAssets;
    const start = (currentPage - 1) * rowsPerPage;
    return filteredAssets.slice(start, start + rowsPerPage);
  }, [filteredAssets, currentPage, rowsPerPage]);

  // History Month Columns Generation (from 2020-01 to current date / 2026-12)
  const allHistoryMonths = useMemo(() => generateHistoriMonths('2020-01'), []);

  // Filtered History Columns based on selectedHistoryYears
  const activeHistoryColumns = useMemo<HistoryMonthColumn[]>(() => {
    if (!historyMode) return [];
    return allHistoryMonths.filter((m) => selectedHistoryYears.includes(m.yearStr));
  }, [historyMode, selectedHistoryYears, allHistoryMonths]);

  // Compute history map for displayed rows
  const assetHistoryMap = useMemo(() => {
    const map: Record<string, Record<string, string>> = {};
    if (!historyMode) return map;
    paginatedAssets.forEach((asset) => {
      map[asset.id] = computeAssetHistoryMap(asset, rotations, allHistoryMonths);
    });
    return map;
  }, [historyMode, paginatedAssets, rotations, allHistoryMonths]);

  // Export Excel 3 Sheet matching exact user format (MESIN, INVENTARIS, JOY'N FUN)
  const handleExportExcel3Sheet = async () => {
    // If historyMode is ON, compute history for all exported assets
    const exportHistoryCache: Record<string, Record<string, string>> = {};
    if (historyMode && activeHistoryColumns.length > 0) {
      filteredAssets.forEach((a) => {
        exportHistoryCache[a.id] = computeAssetHistoryMap(a, rotations, activeHistoryColumns);
      });
    }

    const mapToItem = (a: AssetWithComputedLocation) => ({
      locationCode: a.computedLocationCode,
      name: a.name || '',
      photoUrl: a.photoUrl || '',
      typeCode: a.typeCode || '',
      code: a.code || '',
      costActual: a.costActual,
      costExcel: a.costExcel,
      supplier: a.supplier,
      buyDate: a.buyDate,
      readerTap: a.readerTap,
      readerSwipe: a.readerSwipe,
      playPrice: a.playPrice,
      entryDate: a.computedEntryDate || a.entryDate,
      notes: a.notes,
      history: historyMode ? exportHistoryCache[a.id] : undefined,
    });

    const mesinAssets = filteredAssets.filter((a) => a.category === 'MESIN').map(mapToItem);
    const jfAssets = filteredAssets.filter((a) => a.category === "JOY'N FUN").map(mapToItem);
    const invAssets = filteredAssets.filter((a) => a.category === 'INVENTARIS').map(mapToItem);

    const locClean = selectedLocations.includes('ALL')
      ? `SEMUA_LOKASI`
      : selectedLocations.join('_');

    const locLabel = selectedLocations.includes('ALL')
      ? `SEMUA LOKASI (${locations.length})`
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

    const filename = `DATA_RINCI_ASET_${locClean}_${perClean}${historyMode ? '_HISTORI' : ''}`;

    try {
      await exportDataRinciAsetExcel({
        mesinAssets,
        invAssets,
        jfAssets,
        locationLabel: locLabel,
        periodeLabel,
        filename,
        historyColumns: historyMode && activeHistoryColumns.length > 0 ? activeHistoryColumns : undefined,
      });
      addToast(`Berhasil mengunduh Excel 3 Sheet (${filename}.xlsx)`, 'success');
    } catch (err) {
      console.error(err);
      addToast('Gagal mengekspor data ke Excel', 'error');
    }
  };

  const formatRupiah = (val?: number | string | null, emptyFallback = 'Rp 0,00') => {
    if (val === undefined || val === null || val === '') return emptyFallback;
    const num = typeof val === 'number' ? val : parseFloat(String(val).replace(/[^0-9.-]/g, ''));
    if (isNaN(num)) return emptyFallback;
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(num);
  };

  return (
    <div className="p-3 md:p-4">
      <div className="bg-white border border-zinc-200 rounded-xl shadow-xs overflow-hidden">
        {/* Top Filters */}
        <div className="p-3 border-b border-zinc-200 space-y-2.5">
          <div className="flex flex-wrap gap-3 items-end">
            {/* Lokasi (Multi-Select Checkboxes) */}
            <MultiLocationFilter
              locations={allowedLocations}
              selectedLocations={selectedLocations}
              disabled={!isSuperAdmin && allowedLocations.length === 1}
              assetCountsByLocation={assetCountsByLocation}
              onChange={(newLocs) => {
                setSelectedLocations(newLocs);
                setCurrentPage(1);
              }}
              className="min-w-[220px] flex-1 sm:flex-initial"
            />

            {/* Bulan */}
            <div className="min-w-[140px]">
              <label className="text-[11px] font-semibold text-zinc-500 block uppercase tracking-wider">
                BULAN
              </label>
              <select
                value={selectedMonth}
                onChange={(e) => {
                  setSelectedMonth(e.target.value);
                  setCurrentPage(1);
                }}
                className="bg-white border-zinc-300 text-zinc-900 w-full mt-1 h-9 px-3 rounded-lg border text-xs focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 outline-hidden transition"
              >
                <option value="ALL">SEMUA BULAN</option>
                {MONTH_NAMES.map((name, idx) => (
                  <option key={name} value={String(idx + 1)}>
                    {name}
                  </option>
                ))}
              </select>
            </div>

            {/* Tahun */}
            <div className="min-w-[130px]">
              <label className="text-[11px] font-semibold text-zinc-500 block uppercase tracking-wider mb-1">
                TAHUN
              </label>
              <YearFilterInput
                value={selectedYear}
                onChange={(val) => {
                  setSelectedYear(val);
                  setCurrentPage(1);
                }}
              />
            </div>

            {/* Search */}
            <div className="min-w-[220px] flex-1">
              <label className="text-[11px] font-semibold text-zinc-500 block uppercase tracking-wider">
                SEARCH
              </label>
              <div className="relative mt-1">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => {
                    const val = e.target.value;
                    const trimmed = val.trim().toUpperCase();
                    // If user enters an asset code (e.g. JANFIA0114), validate access
                    if (trimmed.length >= 6) {
                      const check = validateAssetAccess(trimmed);
                      if (!check.allowed) {
                        setSearchQuery('');
                        return;
                      }
                    }
                    setSearchQuery(val);
                    setCurrentPage(1);
                  }}
                  className="bg-white border-zinc-300 text-zinc-900 w-full h-9 pl-8 pr-3 rounded-lg border text-xs focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 outline-hidden transition"
                  placeholder="Cari lokasi, jenis, perolehan, supplier, tgl, reader, ket..."
                />
                <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-2.5 top-3" />
              </div>
            </div>

            {/* Action Buttons */}
            <div className="ml-auto flex flex-wrap items-end gap-2 self-end">
              {canExport && (
                <button
                  type="button"
                  onClick={handleExportExcel3Sheet}
                  className="inline-flex items-center justify-center gap-1.5 rounded-lg font-semibold transition whitespace-nowrap h-9 px-3 text-xs bg-emerald-700 text-white hover:bg-emerald-800 shadow-xs cursor-pointer"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5" />
                  Export Excel 3 Sheet
                </button>
              )}

              {/* FITUR HISTORI LOKASI: Role protected for Akunting/Admin */}
              {isAkunting && (
                <div className="inline-flex items-center gap-2">
                  <button
                    type="button"
                    id="btnHistori"
                    onClick={() => {
                      setHistoryMode((prev) => {
                        const next = !prev;
                        if (next && freezeMode === 'none') {
                          handleFreezeChange('1-15');
                        }
                        return next;
                      });
                    }}
                    className={`inline-flex items-center justify-center gap-1.5 h-9 px-3 rounded-lg text-xs font-bold transition whitespace-nowrap cursor-pointer shadow-xs ${
                      historyMode
                        ? 'bg-indigo-600 text-white active hover:bg-indigo-700 ring-2 ring-indigo-400'
                        : 'bg-zinc-800 text-white hover:bg-zinc-700'
                    }`}
                    title="Aktifkan / Nonaktifkan Riwayat Lokasi Bulanan Aset (Atur pembekuan kolom melalui dropdown Freeze Kolom)"
                  >
                    <span>Riwayat Lokasi: {historyMode ? 'ON' : 'OFF'}</span>
                  </button>

                  {/* SATU TOMBOL FILTER DROPDOWN MULTI-CHECKLIST: HANYA MUNCUL saat ON */}
                  {historyMode && (
                    <HistoryYearFilterDropdown
                      selectedYears={selectedHistoryYears}
                      onChangeYears={(newYears) => setSelectedHistoryYears(newYears)}
                    />
                  )}
                </div>
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
                options={MENU1_FREEZE_OPTIONS}
                onChange={handleFreezeChange}
              />
              <ResetButton />
            </div>
          </div>

          {/* Sub Filters: Kategori & Jenis */}
          <div className="flex flex-row flex-wrap items-center justify-between gap-x-3 gap-y-2 pt-1 border-t border-zinc-100">
            <div className="flex flex-wrap gap-1.5 items-center min-w-0">
              <span className="text-[11px] font-semibold text-zinc-500 mr-1">KATEGORI ASET:</span>
              <button
                type="button"
                onClick={() => {
                  setSelectedCategory('ALL');
                  setSelectedSpecificTypes(['ALL']);
                  setCurrentPage(1);
                }}
                className={`inline-flex items-center h-7.5 px-3 rounded-full text-xs font-semibold border transition whitespace-nowrap cursor-pointer ${
                  selectedCategory === 'ALL'
                    ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                    : 'border-zinc-300 text-zinc-700 hover:bg-zinc-100'
                }`}
              >
                SEMUA ({categoryCounts.all})
              </button>
              <button
                type="button"
                onClick={() => {
                  setSelectedCategory('MESIN');
                  setSelectedSpecificTypes(['ALL']);
                  setCurrentPage(1);
                }}
                className={`inline-flex items-center h-7.5 px-3 rounded-full text-xs font-semibold border transition whitespace-nowrap cursor-pointer ${
                  selectedCategory === 'MESIN'
                    ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                    : 'border-zinc-300 text-zinc-700 hover:bg-zinc-100'
                }`}
              >
                MESIN ({categoryCounts.mesin})
              </button>
              <button
                type="button"
                onClick={() => {
                  setSelectedCategory('INVENTARIS');
                  setSelectedSpecificTypes(['ALL']);
                  setCurrentPage(1);
                }}
                className={`inline-flex items-center h-7.5 px-3 rounded-full text-xs font-semibold border transition whitespace-nowrap cursor-pointer ${
                  selectedCategory === 'INVENTARIS'
                    ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                    : 'border-zinc-300 text-zinc-700 hover:bg-zinc-100'
                }`}
              >
                INVENTARIS ({categoryCounts.inv})
              </button>
              <button
                type="button"
                onClick={() => {
                  setSelectedCategory("JOY'N FUN");
                  setSelectedSpecificTypes(['ALL']);
                  setCurrentPage(1);
                }}
                className={`inline-flex items-center h-7.5 px-3 rounded-full text-xs font-semibold border transition whitespace-nowrap cursor-pointer ${
                  selectedCategory === "JOY'N FUN"
                    ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                    : 'border-zinc-300 text-zinc-700 hover:bg-zinc-100'
                }`}
              >
                JOY'N FUN ({categoryCounts.jf})
              </button>
            </div>

            <div className="flex flex-wrap gap-2 items-center min-w-0">
              <span className="text-[11px] font-semibold text-zinc-500">JENIS SPESIFIK:</span>
              <MultiSpecificTypeFilter
                types={availableAssetTypes}
                selectedTypes={selectedSpecificTypes}
                onChange={(newTypes) => {
                  setSelectedSpecificTypes(newTypes);
                  setCurrentPage(1);
                }}
                assetCountsByType={assetCountsByType}
              />
              <span className="text-[11px] text-zinc-500 whitespace-nowrap font-medium">
                Menampilkan {filteredAssets.length} / {assetsWithDynamicLocation.length}
              </span>
            </div>
          </div>

          {/* 2 Banner Notifikasi dengan Auto-Hide Wrapper */}
          <div
            className={`auto-hide-notif-wrapper space-y-2 ${
              bannerPhase === 'collapsing'
                ? 'notif-collapsing'
                : bannerPhase === 'hidden'
                ? 'notif-hidden'
                : ''
            }`}
          >
            {/* Banner 1 */}
            <div
              id="notif-lokasi-dinamis"
              className="info-lokasi-dinamis px-3 py-2 rounded-lg text-[11px] font-medium bg-indigo-50/90 text-indigo-700 border border-indigo-200 flex flex-wrap items-center justify-between gap-2 shadow-xs"
            >
              <span>
                <strong>Lokasi Dinamis & Mode Kumulatif:</strong> Menampilkan posisi lokasi aset pada periode {selectedMonth === 'ALL' ? 'SEMUA BULAN' : MONTH_NAMES[parseInt(selectedMonth, 10) - 1]} {selectedYear} berdasarkan histori Menu 5. INFO PERPINDAHAN ASET.
              </span>
              <span className="text-[10px] font-mono bg-white/70 px-2 py-0.5 rounded border border-indigo-200">
                Filter Lokasi:{' '}
                {selectedLocations.includes('ALL') || selectedLocations.length === 0
                  ? 'SEMUA'
                  : selectedLocations.join(', ')}
              </span>
            </div>

            {/* Banner 2 */}
            <div
              id="notif-histori-aktif"
              className="info-histori-aktif px-3 py-2 rounded-lg text-[11px] font-semibold bg-emerald-50 text-emerald-900 border border-emerald-300 flex items-center justify-between gap-2 shadow-xs"
            >
              <span>
                <strong>Histori Lokasi Aktif:</strong> Menampilkan kolom riwayat bulanan (2020 - 2026).{' '}
                {freezeMode === 'none' ? (
                  <span>Mode freeze: <strong>Tidak Freeze</strong> (semua kolom bergeser bebas saat scroll).</span>
                ) : freezeMode === '1-6' ? (
                  <span>Kolom 1-6 (Kode Lokasi s/d Kode Aset) <strong>freeze (dibekukan)</strong> saat menggeser tabel ke kanan.</span>
                ) : (
                  <span>Kolom 1-15 (Kode Lokasi s/d Keterangan) <strong>tetap freeze (dibekukan)</strong> saat menggeser tabel ke kanan.</span>
                )}
              </span>
              <span className="text-[10px] text-emerald-700 font-mono">
                Format: KODE_LOKASI (masuk tgl. DD)
              </span>
            </div>
          </div>
        </div>

        {/* Notifikasi Periode Terkunci */}
        {isSelectedPeriodLocked && (
          <div className="mx-4 mt-3 mb-2 p-3.5 bg-red-50 border-2 border-red-500 rounded-xl flex items-start gap-3 shadow-xs animate-in fade-in duration-150">
            <div className="p-2 bg-red-100 text-red-700 rounded-lg shrink-0 mt-0.5">
              <Lock className="w-5 h-5 text-red-600" />
            </div>
            <div className="flex-1 text-xs">
              <div className="font-bold text-red-900 text-sm flex items-center gap-2">
                PERIODE TERKUNCI (LOKASI: {selectedLocations.join(', ')} | {selectedMonth !== 'ALL' ? MONTH_NAMES[parseInt(selectedMonth, 10) - 1] : 'SEMUA BULAN'} {selectedYear})
              </div>
              <div className="text-red-800 mt-1 leading-relaxed">
                Periode ini telah <strong>DITUTUP</strong> di <strong>Menu 4.5 TUTUP PERIODE</strong>.
                Seluruh data berstatus <strong>Terkunci (Read-Only)</strong> dan tidak bisa diedit maupun dihapus kecuali melakukan <strong>BUKA PERIODE</strong> terlebih dahulu di Menu 4.5.
              </div>
            </div>
          </div>
        )}

        {/* Table Content */}
        <div id="tabel-preview-aset" className="overflow-x-auto overflow-y-auto max-h-[540px]">
          <table
            ref={tableRef}
            className={`w-full text-xs table-assetflow table-padat resizable-table ${
              gridLines ? 'table-gridlines-active' : ''
            }`}
          >
            <thead className="sticky top-0 z-30 bg-[#1e40af] text-white uppercase shadow-xs">
              <tr>
                {/* 1. KODE LOKASI */}
                <th
                  style={getStickyStyle(0, true)}
                  className={`px-2.5 py-2.5 text-center font-bold whitespace-nowrap min-w-[70px] max-w-[85px] ${getStickyClass(0, true)}`}
                >
                  KODE LOKASI
                </th>
                {/* 2. NO */}
                <th
                  style={getStickyStyle(1, true)}
                  className={`px-2 py-2.5 text-center font-bold whitespace-nowrap min-w-[40px] max-w-[50px] ${getStickyClass(1, true)}`}
                >
                  NO
                </th>
                {/* 3. NAMA ASET */}
                <th
                  style={getStickyStyle(2, true)}
                  className={`px-3 py-2.5 text-left font-bold min-w-[160px] max-w-[220px] whitespace-normal leading-tight ${getStickyClass(2, true)}`}
                >
                  NAMA ASET
                </th>
                {/* 4. FOTO FISIK */}
                <th
                  style={getStickyStyle(3, true)}
                  className={`px-2 py-2.5 text-center font-bold whitespace-nowrap min-w-[65px] max-w-[80px] ${getStickyClass(3, true)}`}
                >
                  FOTO FISIK
                </th>
                {/* 5. JENIS ASET */}
                <th
                  style={getStickyStyle(4, true)}
                  className={`px-2 py-2.5 text-center font-bold whitespace-nowrap min-w-[70px] max-w-[85px] ${getStickyClass(4, true)}`}
                >
                  JENIS ASET
                </th>
                {/* 6. KODE ASET */}
                <th
                  style={getStickyStyle(5, true)}
                  className={`px-2.5 py-2.5 text-center font-bold whitespace-nowrap min-w-[95px] max-w-[120px] border-x border-blue-400/40 ${
                    isColumnFrozen(5) ? getStickyClass(5, true) : 'bg-blue-900/50'
                  }`}
                  title="Data otomatis diurutkan berdasarkan Kode Aset (A-Z)"
                >
                  <div className="inline-flex items-center justify-center gap-1">
                    <span>KODE ASET</span>
                    <span className="text-[10px] text-amber-300 font-bold">▲</span>
                  </div>
                </th>

                {/* Optional financial & attribute columns */}
                {showNilaiPasti && (
                  <th
                    style={getStickyStyle(baseColumnIndices.colNilaiPasti, true)}
                    className={`px-2.5 py-2.5 text-right font-bold min-w-[120px] max-w-[140px] whitespace-normal leading-tight ${getStickyClass(baseColumnIndices.colNilaiPasti, true)}`}
                  >
                    NILAI PEROLEHAN PASTI
                  </th>
                )}
                {showNilaiExcel && (
                  <th
                    style={getStickyStyle(baseColumnIndices.colNilaiExcel, true)}
                    className={`px-2.5 py-2.5 text-right font-bold min-w-[120px] max-w-[140px] whitespace-normal leading-tight ${getStickyClass(baseColumnIndices.colNilaiExcel, true)}`}
                  >
                    NILAI PEROLEHAN EXCEL
                  </th>
                )}
                {showSupplier && (
                  <th
                    style={getStickyStyle(baseColumnIndices.colSupplier, true)}
                    className={`px-2.5 py-2.5 text-left font-bold min-w-[95px] max-w-[130px] whitespace-normal leading-tight ${getStickyClass(baseColumnIndices.colSupplier, true)}`}
                  >
                    SUPPLIER
                  </th>
                )}
                {showTanggalBeli && (
                  <th
                    style={getStickyStyle(baseColumnIndices.colTanggalBeli, true)}
                    className={`px-2 py-2.5 text-center font-bold whitespace-nowrap min-w-[85px] max-w-[95px] ${getStickyClass(baseColumnIndices.colTanggalBeli, true)}`}
                  >
                    TANGGAL BELI
                  </th>
                )}
                <th
                  style={getStickyStyle(baseColumnIndices.colReaderTap, true)}
                  className={`px-2 py-2.5 text-center font-bold whitespace-nowrap min-w-[70px] max-w-[80px] ${getStickyClass(baseColumnIndices.colReaderTap, true)}`}
                >
                  READER TAP
                </th>
                <th
                  style={getStickyStyle(baseColumnIndices.colReaderSwipe, true)}
                  className={`px-2 py-2.5 text-center font-bold whitespace-nowrap min-w-[70px] max-w-[80px] ${getStickyClass(baseColumnIndices.colReaderSwipe, true)}`}
                >
                  READER SWIPE
                </th>
                <th
                  style={getStickyStyle(baseColumnIndices.colHargaBermain, true)}
                  className={`px-2.5 py-2.5 text-right font-bold min-w-[90px] max-w-[110px] whitespace-normal leading-tight ${getStickyClass(baseColumnIndices.colHargaBermain, true)}`}
                >
                  HARGA BERMAIN
                </th>
                <th
                  style={getStickyStyle(baseColumnIndices.colTanggalMasuk, true)}
                  className={`px-2 py-2.5 text-center font-bold whitespace-nowrap min-w-[85px] max-w-[95px] ${getStickyClass(baseColumnIndices.colTanggalMasuk, true)}`}
                >
                  TANGGAL MASUK
                </th>
                <th
                  style={getStickyStyle(baseColumnIndices.colKeterangan, true)}
                  className={`px-3 py-2.5 text-left font-bold min-w-[180px] max-w-[280px] whitespace-normal leading-tight ${getStickyClass(baseColumnIndices.colKeterangan, true)}`}
                >
                  KETERANGAN
                </th>

                {/* DYNAMIC HISTORI MONTH COLUMNS (ONLY WHEN HISTORI IS ON) */}
                {historyMode &&
                  activeHistoryColumns.map((col) => {
                    const colorStyle = getYearColorStyle(col.year);
                    return (
                      <th
                        key={col.key}
                        data-year={col.yearStr}
                        style={{
                          backgroundColor: colorStyle.bg,
                          color: colorStyle.text,
                          minWidth: '95px',
                          maxWidth: '130px',
                        }}
                        className="px-2 py-1 text-center font-bold border-r border-black/10 select-none whitespace-pre-line"
                        title={`Histori Lokasi ${col.label}`}
                      >
                        <div className="flex flex-col items-center justify-center leading-tight py-0.5">
                          <span className="font-extrabold text-[11px] tracking-wider uppercase">
                            {col.monthName}
                          </span>
                          <span className="text-[10px] font-normal opacity-85">
                            {col.year}
                          </span>
                        </div>
                      </th>
                    );
                  })}

                {/* AKSI */}
                {canAction && (
                  <th className="px-2 py-2.5 text-center font-bold whitespace-nowrap min-w-[80px] max-w-[95px]">
                    AKSI
                  </th>
                )}
              </tr>
            </thead>
            <tbody>
              {paginatedAssets.length === 0 ? (
                <tr>
                  <td
                    colSpan={baseColumnIndices.totalCols + (canAction ? 1 : 0) + (historyMode ? activeHistoryColumns.length : 0)}
                    className="px-3 py-12 text-center text-[11px] text-zinc-500"
                  >
                    <div className="flex flex-col items-center justify-center gap-1">
                      <p className="font-semibold text-zinc-700">
                        {assetsWithDynamicLocation.length === 0
                          ? 'Database aset kosong atau belum ada aset yang terdaftar pada periode ini.'
                          : 'Tidak ada data aset yang cocok dengan filter yang dipilih.'}
                      </p>
                      <p className="text-[11px] text-zinc-400">
                        Coba sesuaikan filter lokasi, bulan, atau kata kunci pencarian.
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                paginatedAssets.map((asset, idx) => {
                  const rowNumber = rowsPerPage === 0 ? idx + 1 : (currentPage - 1) * rowsPerPage + idx + 1;
                  return (
                    <tr
                      key={asset.id}
                      className="group border-b border-zinc-200/70 hover:bg-zinc-50/80 transition-colors"
                    >
                      {/* 1. KODE LOKASI */}
                      <td
                        style={getStickyStyle(0, false)}
                        className={`px-2.5 py-2 text-center font-bold text-indigo-900 font-mono text-xs whitespace-nowrap ${getStickyClass(0, false)}`}
                      >
                        {asset.computedLocationCode}
                      </td>

                      {/* 2. NO */}
                      <td
                        style={getStickyStyle(1, false)}
                        className={`px-2 py-2 text-center text-zinc-500 font-mono text-[11px] whitespace-nowrap ${getStickyClass(1, false)}`}
                      >
                        {rowNumber}
                      </td>

                      {/* 3. NAMA ASET */}
                      <td
                        style={getStickyStyle(2, false)}
                        className={`px-3 py-2 text-left font-semibold text-zinc-900 text-xs break-words max-w-[220px] ${getStickyClass(2, false)}`}
                      >
                        {asset.name}
                      </td>

                      {/* 4. FOTO FISIK */}
                      <td
                        style={getStickyStyle(3, false)}
                        className={`px-2 py-2 text-center ${getStickyClass(3, false)}`}
                      >
                        {asset.photoUrl ? (
                          <div className="flex items-center justify-center">
                            <img
                              src={asset.photoUrl}
                              alt={asset.name}
                              onClick={() =>
                                setPhotoModalData({
                                   isOpen: true,
                                   title: asset.name,
                                   photoUrl: asset.photoUrl,
                                   assetCode: asset.code,
                                })
                              }
                              className="w-8 h-8 object-cover rounded border border-zinc-300 shadow-xs cursor-pointer hover:opacity-80 transition bg-zinc-50"
                              title="Klik untuk memperbesar foto"
                            />
                          </div>
                        ) : (
                          <span className="text-zinc-400 text-[10px]">-</span>
                        )}
                      </td>

                      {/* 5. JENIS ASET */}
                      <td
                        style={getStickyStyle(4, false)}
                        className={`px-2 py-2 text-center whitespace-nowrap ${getStickyClass(4, false)}`}
                      >
                        <span className="inline-block px-1.5 py-0.5 rounded bg-zinc-100 border border-zinc-300 font-bold font-mono text-[11px] text-zinc-800">
                          {asset.typeCode}
                        </span>
                      </td>

                      {/* 6. KODE ASET */}
                      <td
                        style={getStickyStyle(5, false)}
                        className={`px-2.5 py-2 text-center font-mono font-bold text-zinc-800 text-xs whitespace-nowrap border-x border-zinc-200/40 ${getStickyClass(5, false)}`}
                      >
                        {asset.code}
                      </td>

                      {/* Optional financial & attribute columns */}
                      {showNilaiPasti && (
                        <td
                          style={getStickyStyle(baseColumnIndices.colNilaiPasti, false)}
                          className={`px-2.5 py-2 text-right font-mono text-zinc-900 text-xs whitespace-nowrap ${getStickyClass(baseColumnIndices.colNilaiPasti, false)}`}
                        >
                          {asset.costActual != null && !isNaN(asset.costActual) && asset.costActual > 0
                            ? formatRupiah(asset.costActual, '')
                            : ''}
                        </td>
                      )}

                      {showNilaiExcel && (
                        <td
                          style={getStickyStyle(baseColumnIndices.colNilaiExcel, false)}
                          className={`px-2.5 py-2 text-right font-mono text-zinc-900 text-xs whitespace-nowrap ${getStickyClass(baseColumnIndices.colNilaiExcel, false)}`}
                        >
                          {asset.costExcel != null && !isNaN(asset.costExcel) && asset.costExcel > 0
                            ? formatRupiah(asset.costExcel, '')
                            : ''}
                        </td>
                      )}

                      {showSupplier && (
                        <td
                          style={getStickyStyle(baseColumnIndices.colSupplier, false)}
                          className={`px-2.5 py-2 text-left text-zinc-700 text-xs break-words max-w-[130px] ${getStickyClass(baseColumnIndices.colSupplier, false)}`}
                        >
                          {asset.supplier && asset.supplier !== '-' ? asset.supplier : ''}
                        </td>
                      )}

                      {showTanggalBeli && (
                        <td
                          style={getStickyStyle(baseColumnIndices.colTanggalBeli, false)}
                          className={`px-2 py-2 text-center font-mono text-[11px] text-zinc-600 whitespace-nowrap ${getStickyClass(baseColumnIndices.colTanggalBeli, false)}`}
                        >
                          {asset.buyDate && asset.buyDate !== '-' ? formatDdMmmYy(asset.buyDate) : ''}
                        </td>
                      )}

                      {/* READER TAP */}
                      <td
                        style={getStickyStyle(baseColumnIndices.colReaderTap, false)}
                        className={`px-2 py-2 text-center text-zinc-600 font-mono text-[11px] whitespace-nowrap ${getStickyClass(baseColumnIndices.colReaderTap, false)}`}
                      >
                        {asset.readerTap && asset.readerTap !== '-' ? asset.readerTap : ''}
                      </td>

                      {/* READER SWIPE */}
                      <td
                        style={getStickyStyle(baseColumnIndices.colReaderSwipe, false)}
                        className={`px-2 py-2 text-center text-zinc-600 font-mono text-[11px] whitespace-nowrap ${getStickyClass(baseColumnIndices.colReaderSwipe, false)}`}
                      >
                        {asset.readerSwipe && asset.readerSwipe !== '-' ? asset.readerSwipe : ''}
                      </td>

                      {/* HARGA BERMAIN */}
                      <td
                        style={getStickyStyle(baseColumnIndices.colHargaBermain, false)}
                        className={`px-2.5 py-2 text-right font-mono text-zinc-800 text-xs whitespace-nowrap ${getStickyClass(baseColumnIndices.colHargaBermain, false)}`}
                      >
                        {asset.playPrice != null && !isNaN(asset.playPrice) && asset.playPrice > 0
                          ? formatRupiah(asset.playPrice, '')
                          : ''}
                      </td>

                      {/* TANGGAL MASUK */}
                      <td
                        style={getStickyStyle(baseColumnIndices.colTanggalMasuk, false)}
                        className={`px-2 py-2 text-center font-mono text-[11px] text-zinc-600 whitespace-nowrap ${getStickyClass(baseColumnIndices.colTanggalMasuk, false)}`}
                      >
                        {asset.computedEntryDate || asset.entryDate
                          ? formatDdMmmYy(asset.computedEntryDate || asset.entryDate)
                          : '-'}
                      </td>

                      {/* KETERANGAN */}
                      <td
                        style={getStickyStyle(baseColumnIndices.colKeterangan, false)}
                        className={`px-3 py-2 text-left text-zinc-700 whitespace-pre-wrap break-words min-w-[180px] max-w-[280px] leading-relaxed text-xs ${getStickyClass(baseColumnIndices.colKeterangan, false)}`}
                      >
                        {asset.notes && asset.notes !== '-' ? asset.notes : ''}
                      </td>

                      {/* DYNAMIC HISTORI MONTH CELLS (ONLY WHEN HISTORI IS ON) */}
                      {historyMode &&
                        activeHistoryColumns.map((col) => {
                          const cellVal = assetHistoryMap[asset.id]?.[col.key] || '';
                          return (
                            <td
                              key={col.key}
                              data-year={col.yearStr}
                              className="px-2 py-1.5 text-center font-mono text-[10px] leading-tight whitespace-pre-line border-r border-zinc-200 text-zinc-800"
                            >
                              {cellVal || '-'}
                            </td>
                          );
                        })}

                      {/* 16. AKSI */}
                      {canAction && (
                        <td className="px-2 py-2 text-center whitespace-nowrap">
                          <div className="inline-flex items-center justify-center gap-1">
                            {canEdit && (
                              <a
                                href={`?tab=aktivitas&sub=edit&code=${encodeURIComponent(asset.code)}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                onClick={(e) => {
                                  if (isSelectedPeriodLocked) {
                                    e.preventDefault();
                                    addToast(
                                      `Periode ${selectedMonth}/${selectedYear} di lokasi ${asset.computedLocationCode} sedang DITUTUP. Buka periode terlebih dahulu di menu 4.5.`,
                                      'error'
                                    );
                                  }
                                }}
                                className={`px-2 py-1 rounded text-[10px] font-semibold transition inline-flex items-center gap-1 no-underline ${
                                  isSelectedPeriodLocked
                                    ? 'bg-zinc-100 text-zinc-400 border border-zinc-200 cursor-not-allowed pointer-events-none'
                                    : 'bg-zinc-100 text-zinc-700 hover:bg-zinc-200 hover:text-zinc-900 cursor-pointer shadow-2xs'
                                }`}
                                title={
                                  isSelectedPeriodLocked
                                    ? 'Periode terkunci di Menu 4.5 - Buka periode terlebih dahulu'
                                    : 'Buka Edit data aset di tab/halaman baru'
                                }
                              >
                                {isSelectedPeriodLocked ? <Lock className="w-2.5 h-2.5 inline text-zinc-400" /> : null}
                                Edit
                                <ExternalLink className="w-2.5 h-2.5 opacity-60" />
                              </a>
                            )}
                            {canRotate && (
                              <a
                                href={`?tab=aktivitas&sub=rotasi&code=${encodeURIComponent(asset.code)}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                onClick={(e) => {
                                  if (isSelectedPeriodLocked) {
                                    e.preventDefault();
                                    addToast(
                                      `Periode ${selectedMonth}/${selectedYear} di lokasi ${asset.computedLocationCode} sedang DITUTUP. Buka periode terlebih dahulu di menu 4.5.`,
                                      'error'
                                    );
                                  }
                                }}
                                className={`px-2 py-1 rounded text-[10px] font-semibold transition inline-flex items-center gap-1 no-underline ${
                                  isSelectedPeriodLocked
                                    ? 'bg-zinc-100 text-zinc-400 border border-zinc-200 cursor-not-allowed pointer-events-none'
                                    : 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100 cursor-pointer shadow-2xs'
                                }`}
                                title={
                                  isSelectedPeriodLocked
                                    ? 'Periode terkunci di Menu 4.5 - Buka periode terlebih dahulu'
                                    : 'Buka Rotasi keluar aset di tab/halaman baru'
                                }
                              >
                                Rotasi
                                <ExternalLink className="w-2.5 h-2.5 opacity-60" />
                              </a>
                            )}
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Bottom Pagination & Summary Bar (Sticky Freeze at Bottom) */}
        <div className="sticky bottom-0 z-20 p-3 flex flex-wrap items-center justify-between gap-3 border-t border-zinc-200 text-xs bg-zinc-50/95 backdrop-blur-xs shadow-md">
          {/* Left: Info Baris & Halaman + Tampilkan Select + Prev/Next */}
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-zinc-600 font-medium">
              Halaman {currentPage} / {totalPages} • {filteredAssets.length} baris
            </span>
            <label className="flex items-center gap-1.5 text-zinc-600">
              <span className="text-[11px]">Tampilkan:</span>
              <select
                value={String(rowsPerPage)}
                onChange={(e) => {
                  setRowsPerPage(parseInt(e.target.value, 10));
                  setCurrentPage(1);
                }}
                className="bg-white border border-zinc-300 rounded-lg h-7 px-2 text-[11px] outline-hidden"
              >
                <option value="100">100 / halaman</option>
                <option value="250">250 / halaman</option>
                <option value="500">500 / halaman</option>
                <option value="0">Semua data</option>
              </select>
            </label>

            <div className="flex gap-1.5 ml-1">
              <button
                type="button"
                disabled={currentPage <= 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                className="inline-flex items-center justify-center gap-1 rounded-lg font-semibold transition whitespace-nowrap h-7 px-2.5 text-[11px] border border-zinc-300 hover:bg-zinc-100 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              >
                Prev
              </button>
              <button
                type="button"
                disabled={currentPage >= totalPages}
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                className="inline-flex items-center justify-center gap-1 rounded-lg font-semibold transition whitespace-nowrap h-7 px-2.5 text-[11px] border border-zinc-300 hover:bg-zinc-100 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              >
                Next
              </button>
            </div>
          </div>

          {/* Right: 2 Summary Cards (sejajar dengan info baris dan halaman, sama persis style font) */}
          {(showNilaiPasti || showNilaiExcel) && (
            <div className="flex flex-wrap items-center gap-2.5 sm:ml-auto">
              {showNilaiPasti && (
                <div className="text-zinc-600 font-medium text-xs bg-white px-2.5 py-1.5 rounded-lg border border-zinc-200 shadow-2xs flex items-center gap-1.5">
                  <span>Total Nilai Perolehan Pasti:</span>
                  <span className="font-bold text-zinc-900 font-mono text-xs">
                    {formatRupiah(totalCostActual)}
                  </span>
                </div>
              )}
              {showNilaiExcel && (
                <div className="text-zinc-600 font-medium text-xs bg-white px-2.5 py-1.5 rounded-lg border border-zinc-200 shadow-2xs flex items-center gap-1.5">
                  <span>Total Nilai Perolehan Excel:</span>
                  <span className="font-bold text-zinc-900 font-mono text-xs">
                    {formatRupiah(totalCostExcel)}
                  </span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Photo Viewer Modal */}
      <PhotoModal
        isOpen={photoModalData.isOpen}
        onClose={() => setPhotoModalData((prev) => ({ ...prev, isOpen: false }))}
        title={photoModalData.title}
        photoUrl={photoModalData.photoUrl}
        assetCode={photoModalData.assetCode}
      />
    </div>
  );
};
