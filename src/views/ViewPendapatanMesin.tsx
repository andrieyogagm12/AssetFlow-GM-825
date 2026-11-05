import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { useAssets } from '../context/AssetContext';
import * as XLSX from 'xlsx';
import { exportLaporanPendapatanExcel } from '../utils/excelExport';
import {
  Plus,
  Minus,
  Trash2,
  Calendar,
  Eye,
  EyeOff,
  Save,
  Download,
  Edit3,
  Lock,
  FileSpreadsheet,
  Check,
  AlertCircle,
  HelpCircle,
  X,
} from 'lucide-react';
import { formatDdMmmYy } from '../utils/dateFormatter';
import { useResizableTable } from '../utils/useResizableTable';
import { MultiLocationFilter } from '../components/MultiLocationFilter';
import { MultiSpecificTypeFilter } from '../components/MultiSpecificTypeFilter';
import { YearFilterInput } from '../components/YearFilterInput';
import { checkAssetPresenceInLocationForPeriod } from '../utils/assetTimeline';
import { FreezeColumnDropdown, FreezeOption } from '../components/FreezeColumnDropdown';

const MONTH_NAMES = [
  'JANUARI', 'FEBRUARI', 'MARET', 'APRIL', 'MEI', 'JUNI',
  'JULI', 'AGUSTUS', 'SEPTEMBER', 'OKTOBER', 'NOVEMBER', 'DESEMBER'
];

const MENU7_FREEZE_OPTIONS: FreezeOption[] = [
  { id: '1-5', label: 'Freeze Kolom 1-5' },
  { id: 'none', label: 'Tidak Freeze' },
];

export interface RevenueColumn {
  id: number;
  dateStr: string; // e.g. "30-SEP-26"
  rawDate: string; // e.g. "2026-09-30"
}

export interface PlayerRevenue {
  playerNo: number; // 1, 2, 3...
  label: string; // "P1", "P2", "P3"...
  values: Record<number, { coin: string; revenue: string }>; // columnId -> { coin, revenue }
  notes: string;
}

export interface MachineRevenueRow {
  id: string;
  assetCode: string;
  assetName: string;
  locationCode: string;
  typeCode: string;
  entryDate: string; // e.g. "12-Jan-24"
  exitDate: string; // e.g. "15-Okt-26" or "-"
  hidden: boolean;
  isManual?: boolean;
  players: PlayerRevenue[];
}

const getNextDayYmd = (ymd: string): string => {
  const d = new Date(ymd);
  if (isNaN(d.getTime())) return ymd;
  d.setDate(d.getDate() + 1);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

const parseNum = (str: string): number => {
  if (!str) return 0;
  // Remove thousand dots, convert comma to dot
  const clean = str.replace(/\./g, '').replace(/,/g, '.').replace(/[^0-9.-]/g, '');
  const val = parseFloat(clean);
  return isNaN(val) ? 0 : val;
};

const formatCurrencyNumber = (num: number): string => {
  return new Intl.NumberFormat('id-ID', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(num);
};

export const ViewPendapatanMesin: React.FC = () => {
  const {
    locations,
    assets,
    rotations,
    assetTypes,
    isPeriodLocked,
    addToast,
    gridLines,
    toggleGridLines,
    currentUser,
    hasMenuAccess,
    hasButtonAccess,
    allowedLocations,
    isSuperAdmin,
    revenueRevision,
    saveRevenueSheet,
  } = useAssets();

  const isAdmin = currentUser?.akses === 'ADMIN' || currentUser?.akses === 'ADMINISTRATOR';
  const can71 = isAdmin || hasMenuAccess('menu-7.1');
  const can72 = isAdmin || hasMenuAccess('menu-7.2');

  const [activeSubTab, setActiveSubTab] = useState<'input' | 'laporan'>(
    can71 ? 'input' : 'laporan'
  );

  useEffect(() => {
    if (activeSubTab === 'input' && !can71 && can72) {
      setActiveSubTab('laporan');
    } else if (activeSubTab === 'laporan' && !can72 && can71) {
      setActiveSubTab('input');
    }
  }, [activeSubTab, can71, can72]);

  // Drag Resizable Table hooks
  const { tableRef: tableRef71, ResetButton: ResetButton71 } = useResizableTable({
    storageKey: 'assetflow_table_resize_7_1_input_pendapatan',
  });
  const { tableRef: tableRef72, ResetButton: ResetButton72 } = useResizableTable({
    storageKey: 'assetflow_table_resize_7_2_laporan_pendapatan',
  });

  const displayLocations = useMemo(() => {
    return allowedLocations.length > 0 ? allowedLocations : locations;
  }, [allowedLocations, locations]);
  // --------------------------------------------------
  // 7.1 INPUT FILTERS & STATE
  // --------------------------------------------------
  const [filterLocCode, setFilterLocCode] = useState<string>(() => {
    if (!isSuperAdmin && allowedLocations.length === 1) {
      return allowedLocations[0].code;
    }
    return '';
  });
  const [filterMonth, setFilterMonth] = useState<string>(() => String(new Date().getMonth() + 1));
  const [filterYear, setFilterYear] = useState<string>(() => String(new Date().getFullYear()));
  const [hasSearched, setHasSearched] = useState<boolean>(false);

  // Active loaded data for 7.1
  const [activeLocCode, setActiveLocCode] = useState<string>('');
  const [activeMonth, setActiveMonth] = useState<number>(() => new Date().getMonth() + 1);
  const [activeYear, setActiveYear] = useState<number>(() => new Date().getFullYear());

  const [columns, setColumns] = useState<RevenueColumn[]>([
    { id: 1, dateStr: '30-SEP-26', rawDate: '2026-09-30' },
  ]);
  const [rows, setRows] = useState<MachineRevenueRow[]>([]);

  // --------------------------------------------------
  // 7.2 LAPORAN FILTERS & STATE
  // --------------------------------------------------
  const [lapFilterLocations, setLapFilterLocations] = useState<string[]>(() => {
    if (!isSuperAdmin && allowedLocations.length === 1) {
      return [allowedLocations[0].code];
    }
    return ['ALL'];
  });

  // Sync state if permissions or allowed locations change
  useEffect(() => {
    if (!isSuperAdmin && allowedLocations.length === 1) {
      const code = allowedLocations[0].code;
      setFilterLocCode(code);
      setLapFilterLocations([code]);
    }
  }, [isSuperAdmin, allowedLocations]);
  const [lapFilterMonth, setLapFilterMonth] = useState<string>(() => String(new Date().getMonth() + 1));
  const [lapFilterYear, setLapFilterYear] = useState<string>(() => String(new Date().getFullYear()));
  const [lapHasSearched, setLapHasSearched] = useState<boolean>(false);
  const [lapRows, setLapRows] = useState<MachineRevenueRow[]>([]);
  const [lapColumns, setLapColumns] = useState<RevenueColumn[]>([
    { id: 1, dateStr: '30-SEP-26', rawDate: '2026-09-30' },
  ]);
  const [lapActiveMonth, setLapActiveMonth] = useState<number>(() => new Date().getMonth() + 1);
  const [lapActiveYear, setLapActiveYear] = useState<number>(() => new Date().getFullYear());
  const [lapActiveLocations, setLapActiveLocations] = useState<string[]>(['ALL']);

  // 7.2 Specific Type Multi-Select Checkbox Filter
  const [lapSpecificTypes, setLapSpecificTypes] = useState<string[]>(['ALL']);

  // Auto-hide notification banner logic in Menu 7.1:
  // 1. Tampil normal saat halaman dimuat / saat klik CARI
  // 2. Setelah 5 detik, otomatis hilang dengan animasi slideUp + fadeOut (300ms transition)
  // 3. Tabel preview di bawahnya (#tabel-preview-aset) naik ke atas mengisi area kosong tanpa white space
  // 4. Setelah animasi 300ms, di-remove dari layout (height: 0 / display: none) agar tidak ada gap
  // 5. Vanilla JS + CSS murni (tanpa jQuery) dengan class .auto-hide-notif-wrapper
  const [bannerPhase71, setBannerPhase71] = useState<'visible' | 'collapsing' | 'hidden'>('visible');

  useEffect(() => {
    if (!hasSearched) return;

    setBannerPhase71('visible');
    const wrapper = document.querySelector('.auto-hide-notif-wrapper-71') as HTMLElement | null;
    if (wrapper) {
      wrapper.classList.remove('slide-up-fade-out', 'notif-collapsing', 'is-hidden', 'notif-hidden');
    }

    const timer5s = window.setTimeout(() => {
      setBannerPhase71('collapsing');
      if (wrapper) {
        wrapper.classList.add('slide-up-fade-out', 'notif-collapsing');
      }

      const timer300ms = window.setTimeout(() => {
        setBannerPhase71('hidden');
        if (wrapper) {
          wrapper.classList.add('is-hidden', 'notif-hidden');
        }
      }, 300);

      return () => window.clearTimeout(timer300ms);
    }, 5000);

    return () => {
      window.clearTimeout(timer5s);
    };
  }, [hasSearched, activeLocCode, activeMonth, activeYear]);

  // Ref for hidden date inputs in header
  const dateInputRefs = useRef<Record<number, HTMLInputElement | null>>({});
  const [pickerColId, setPickerColId] = useState<number | null>(null);

  // Check period locking for active input
  const isCurrentPeriodLocked = useMemo(() => {
    if (!activeLocCode) return false;
    return isPeriodLocked(activeLocCode, activeMonth, activeYear);
  }, [activeLocCode, activeMonth, activeYear, isPeriodLocked]);

  // Storage key for caching entered data
  const getStorageKey = (loc: string, m: number, y: number) => `gm_rev_data_${loc}_${m}_${y}`;

  // --------------------------------------------------
  // FREEZE PANE SETUP FOR 7.1 & 7.2 (Columns 0 to 4: KODE LOKASI, NO, NAMA ASET, JENIS, KODE ASET)
  // --------------------------------------------------
  const [freezeMode71, setFreezeMode71] = useState<string>(() => {
    try {
      const saved = localStorage.getItem('freeze_menu71');
      if (saved === '1-5' || saved === 'none') {
        return saved;
      }
    } catch {}
    return '1-5';
  });

  const handleFreezeChange71 = useCallback((val: string) => {
    setFreezeMode71(val);
    try {
      localStorage.setItem('freeze_menu71', val);
    } catch {}
  }, []);

  const [freezeMode72, setFreezeMode72] = useState<string>(() => {
    try {
      const saved = localStorage.getItem('freeze_menu72');
      if (saved === '1-5' || saved === 'none') {
        return saved;
      }
    } catch {}
    return '1-5';
  });

  const handleFreezeChange72 = useCallback((val: string) => {
    setFreezeMode72(val);
    try {
      localStorage.setItem('freeze_menu72', val);
    } catch {}
  }, []);

  const DEFAULT_FROZEN_REVENUE_OFFSETS = [0, 90, 135, 375, 445];
  const [frozenOffsets71, setFrozenOffsets71] = useState<number[]>(DEFAULT_FROZEN_REVENUE_OFFSETS);
  const [frozenOffsets72, setFrozenOffsets72] = useState<number[]>(DEFAULT_FROZEN_REVENUE_OFFSETS);

  const updateFrozenOffsets71 = useCallback(() => {
    if (!tableRef71.current) return;
    const thead = tableRef71.current.querySelector('thead');
    if (!thead) return;
    const ths = thead.querySelectorAll('tr:first-child > th');
    if (ths.length < 5) return;

    const newOffsets: number[] = [];
    let currentLeft = 0;
    for (let i = 0; i < 5; i++) {
      newOffsets.push(currentLeft);
      const rect = ths[i]?.getBoundingClientRect();
      currentLeft += rect?.width || 0;
    }
    setFrozenOffsets71(newOffsets);
  }, [tableRef71]);

  const updateFrozenOffsets72 = useCallback(() => {
    if (!tableRef72.current) return;
    const thead = tableRef72.current.querySelector('thead');
    if (!thead) return;
    const ths = thead.querySelectorAll('tr:first-child > th');
    if (ths.length < 5) return;

    const newOffsets: number[] = [];
    let currentLeft = 0;
    for (let i = 0; i < 5; i++) {
      newOffsets.push(currentLeft);
      const rect = ths[i]?.getBoundingClientRect();
      currentLeft += rect?.width || 0;
    }
    setFrozenOffsets72(newOffsets);
  }, [tableRef72]);

  // Recalculate 7.1 frozen offsets on mount, table resize, column add/remove, or tab change
  useEffect(() => {
    if (activeSubTab !== 'input' || freezeMode71 === 'none') return;

    updateFrozenOffsets71();

    const thead = tableRef71.current?.querySelector('thead');
    if (!thead) return;

    let observer: ResizeObserver | null = null;
    if (typeof ResizeObserver !== 'undefined') {
      observer = new ResizeObserver(() => {
        updateFrozenOffsets71();
      });
      const ths = thead.querySelectorAll('tr:first-child > th');
      for (let i = 0; i < Math.min(ths.length, 5); i++) {
        observer.observe(ths[i]);
      }
    }

    const handleResize = () => {
      updateFrozenOffsets71();
    };
    window.addEventListener('resize', handleResize);

    return () => {
      observer?.disconnect();
      window.removeEventListener('resize', handleResize);
    };
  }, [activeSubTab, rows, columns, freezeMode71, updateFrozenOffsets71, tableRef71]);

  // Recalculate 7.2 frozen offsets on mount, search, or tab change
  useEffect(() => {
    if (activeSubTab !== 'laporan' || freezeMode72 === 'none') return;

    updateFrozenOffsets72();

    const thead = tableRef72.current?.querySelector('thead');
    if (!thead) return;

    let observer: ResizeObserver | null = null;
    if (typeof ResizeObserver !== 'undefined') {
      observer = new ResizeObserver(() => {
        updateFrozenOffsets72();
      });
      const ths = thead.querySelectorAll('tr:first-child > th');
      for (let i = 0; i < Math.min(ths.length, 5); i++) {
        observer.observe(ths[i]);
      }
    }

    const handleResize = () => {
      updateFrozenOffsets72();
    };
    window.addEventListener('resize', handleResize);

    return () => {
      observer?.disconnect();
      window.removeEventListener('resize', handleResize);
    };
  }, [activeSubTab, lapRows, lapColumns, lapHasSearched, freezeMode72, updateFrozenOffsets72, tableRef72]);

  const getStickyStyle71 = (colIdx: number, isHeader = false): React.CSSProperties => {
    if (freezeMode71 === 'none') return {};
    const leftPos = frozenOffsets71[colIdx] ?? DEFAULT_FROZEN_REVENUE_OFFSETS[colIdx] ?? 0;
    return {
      position: 'sticky',
      left: `${leftPos}px`,
      zIndex: isHeader ? 40 : 20,
    };
  };

  const getStickyClass71 = (colIdx: number, isHeader = false, isHidden = false): string => {
    if (freezeMode71 === 'none') return '';
    if (isHeader) {
      if (colIdx === 4) return 'col-sticky-freeze-th-code freeze-pane-divider-th frozen-col';
      return 'col-sticky-freeze-th frozen-col';
    } else {
      if (colIdx === 4) return isHidden ? 'col-sticky-freeze-td-hidden freeze-pane-divider-td frozen-col' : 'col-sticky-freeze-td-code freeze-pane-divider-td frozen-col';
      return isHidden ? 'col-sticky-freeze-td-hidden frozen-col' : 'col-sticky-freeze-td frozen-col';
    }
  };

  const getStickyStyle72 = (colIdx: number, isHeader = false): React.CSSProperties => {
    if (freezeMode72 === 'none') return {};
    const leftPos = frozenOffsets72[colIdx] ?? DEFAULT_FROZEN_REVENUE_OFFSETS[colIdx] ?? 0;
    return {
      position: 'sticky',
      left: `${leftPos}px`,
      zIndex: isHeader ? 40 : 20,
    };
  };

  const getStickyClass72 = (colIdx: number, isHeader = false): string => {
    if (freezeMode72 === 'none') return '';
    if (isHeader) {
      if (colIdx === 4) return 'col-sticky-freeze-th-code freeze-pane-divider-th frozen-col';
      return 'col-sticky-freeze-th frozen-col';
    } else {
      if (colIdx === 4) return 'col-sticky-freeze-td-code freeze-pane-divider-td frozen-col';
      return 'col-sticky-freeze-td frozen-col';
    }
  };

  // --------------------------------------------------
  // HELPER: LOAD DATA FOR A LOCATION & PERIOD
  // --------------------------------------------------
  const getLoadedRowsForLocation = (
    locCode: string,
    m: number,
    y: number
  ): { columns: RevenueColumn[]; rows: MachineRevenueRow[] } => {
    const savedKey = getStorageKey(locCode, m, y);
    const savedStr = localStorage.getItem(savedKey);

    const defDay = m === 9 ? '30' : m === 10 ? '15' : '01';
    const defMonthStr = String(m).padStart(2, '0');
    const defaultRawDate = `${y}-${defMonthStr}-${defDay}`;
    const defaultDateStr = formatDdMmmYy(defaultRawDate);

    let initialColumns: RevenueColumn[] = [
      { id: 1, dateStr: defaultDateStr, rawDate: defaultRawDate },
    ];
    let savedRowMap: Record<string, MachineRevenueRow> = {};

    if (savedStr) {
      try {
        const parsed = JSON.parse(savedStr);
        if (parsed.columns && Array.isArray(parsed.columns) && parsed.columns.length > 0) {
          initialColumns = parsed.columns;
        }
        if (parsed.rows && Array.isArray(parsed.rows)) {
          parsed.rows.forEach((r: MachineRevenueRow) => {
            savedRowMap[r.assetCode] = r;
          });
        }
      } catch {
        // ignore parse error
      }
    }

    const startOfMonth = new Date(y, m - 1, 1);
    const endOfMonth = new Date(y, m, 0, 23, 59, 59);

    const machineList: {
      code: string;
      name: string;
      typeCode: string;
      entryDate: string;
      exitDate: string;
    }[] = [];

    const processedCodes = new Set<string>();

    assets.forEach((ast) => {
      if (ast.category !== 'MESIN') return;

      const presence = checkAssetPresenceInLocationForPeriod(ast, rotations, locCode, y, m);

      if (presence.wasPresentInPeriod && !processedCodes.has(ast.code.toUpperCase())) {
        processedCodes.add(ast.code.toUpperCase());
        machineList.push({
          code: ast.code,
          name: ast.name,
          typeCode: ast.typeCode || 'OT',
          entryDate: presence.entryDateStr || formatDdMmmYy(ast.entryDate),
          exitDate: presence.exitDateStr,
        });
      }
    });

    machineList.sort((a, b) => {
      if (a.typeCode < b.typeCode) return -1;
      if (a.typeCode > b.typeCode) return 1;
      return a.name.localeCompare(b.name);
    });

    const loadedRows: MachineRevenueRow[] = machineList.map((mItem) => {
      const saved = savedRowMap[mItem.code];
      if (saved) {
        return {
          ...saved,
          assetName: mItem.name,
          locationCode: locCode,
          typeCode: mItem.typeCode,
          entryDate: mItem.entryDate,
          exitDate: mItem.exitDate,
        };
      }

      return {
        id: `rev-${locCode}-${mItem.code}`,
        assetCode: mItem.code,
        assetName: mItem.name,
        locationCode: locCode,
        typeCode: mItem.typeCode,
        entryDate: mItem.entryDate,
        exitDate: mItem.exitDate,
        hidden: false,
        players: [
          {
            playerNo: 1,
            label: 'P1',
            values: {},
            notes: '',
          },
        ],
      };
    });

    if (savedStr) {
      try {
        const parsed = JSON.parse(savedStr);
        if (parsed.rows && Array.isArray(parsed.rows)) {
          parsed.rows.forEach((r: MachineRevenueRow) => {
            if (r.isManual && !loadedRows.some((lr) => lr.id === r.id)) {
              loadedRows.push(r);
            }
          });
        }
      } catch {
        // ignore
      }
    }

    return { columns: initialColumns, rows: loadedRows };
  };

  // --------------------------------------------------
  // LOAD DATA FOR 7.1 (SINGLE LOCATION)
  // --------------------------------------------------
  const handleSearch = () => {
    if (!filterLocCode) {
      addToast('Pilih Kode Lokasi terlebih dahulu', 'warning');
      return;
    }

    const m = parseInt(filterMonth, 10);
    const y = parseInt(filterYear, 10);

    setActiveLocCode(filterLocCode);
    setActiveMonth(m);
    setActiveYear(y);
    setHasSearched(true);

    const { columns: cols, rows: loaded } = getLoadedRowsForLocation(filterLocCode, m, y);
    setColumns(cols);
    setRows(loaded);

    addToast(
      `Memuat ${loaded.length} aset mesin untuk lokasi ${filterLocCode} (${MONTH_NAMES[m - 1]} ${y})`,
      'info'
    );
  };

  // Support reading sub, loc, month, year URL params to load 7.1 in new tab directly
  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const sub = params.get('sub');
      const loc = params.get('loc');
      const m = params.get('month');
      const y = params.get('year');

      if (sub === 'input') {
        setActiveSubTab('input');
      } else if (sub === 'laporan') {
        setActiveSubTab('laporan');
      }

      if (loc) {
        setFilterLocCode(loc);
      }
      if (m) {
        setFilterMonth(m);
      }
      if (y) {
        setFilterYear(y);
      }

      if (sub === 'input' && loc && m && y) {
        const monthNum = parseInt(m, 10);
        const yearNum = parseInt(y, 10);
        setActiveLocCode(loc);
        setActiveMonth(monthNum);
        setActiveYear(yearNum);
        setHasSearched(true);
        const { columns: cols, rows: loaded } = getLoadedRowsForLocation(loc, monthNum, yearNum);
        setColumns(cols);
        setRows(loaded);
      }
    } catch {}
  }, []);

  // --------------------------------------------------
  // LOAD DATA FOR 7.2 (MULTI-LOCATION REPORT)
  // --------------------------------------------------
  const handleSearchLap = () => {
    if (lapFilterLocations.length === 0) {
      addToast('Pilih minimal satu lokasi untuk menampilkan laporan', 'warning');
      return;
    }

    const targetLocs = lapFilterLocations.includes('ALL')
      ? locations.map((l) => l.code)
      : lapFilterLocations;

    const m = parseInt(lapFilterMonth, 10);
    const y = parseInt(lapFilterYear, 10);

    let allLapRows: MachineRevenueRow[] = [];
    let bestColumns: RevenueColumn[] = [];

    targetLocs.forEach((lCode) => {
      const { columns: cols, rows: locRows } = getLoadedRowsForLocation(lCode, m, y);
      if (cols.length > bestColumns.length) {
        bestColumns = cols;
      }
      allLapRows.push(...locRows);
    });

    if (bestColumns.length === 0) {
      const defDay = m === 9 ? '30' : m === 10 ? '15' : '01';
      const defMonthStr = String(m).padStart(2, '0');
      const defaultRawDate = `${y}-${defMonthStr}-${defDay}`;
      bestColumns = [{ id: 1, dateStr: formatDdMmmYy(defaultRawDate), rawDate: defaultRawDate }];
    }

    setLapColumns(bestColumns);
    setLapRows(allLapRows);
    setLapActiveLocations(targetLocs);
    setLapActiveMonth(m);
    setLapActiveYear(y);
    setLapHasSearched(true);

    addToast(
      `Memuat laporan ${allLapRows.length} aset dari ${targetLocs.length} lokasi (${MONTH_NAMES[m - 1]} ${y})`,
      'info'
    );
  };

  // --------------------------------------------------
  // SAVE REVENUE DATA
  // --------------------------------------------------
  const handleSaveRevenue = () => {
    if (!activeLocCode) return;

    if (isCurrentPeriodLocked) {
      addToast(
        `Periode ${MONTH_NAMES[activeMonth - 1]} ${activeYear} di lokasi ${activeLocCode} sudah TUTUP! Buka dulu di menu 4. AKTIVITAS`,
        'error'
      );
      return;
    }

    const payload = {
      locationCode: activeLocCode,
      month: activeMonth,
      year: activeYear,
      columns,
      rows,
      savedAt: new Date().toISOString(),
    };

    saveRevenueSheet(activeLocCode, activeMonth, activeYear, payload);
    addToast(
      `Data Pendapatan Mesin (${rows.length} aset) di ${activeLocCode} berhasil disimpan`,
      'success'
    );
  };

  // Re-sync 7.1 rows whenever assets or rotations change in real-time
  useEffect(() => {
    if (hasSearched && activeLocCode) {
      const { rows: loaded } = getLoadedRowsForLocation(activeLocCode, activeMonth, activeYear);
      setRows((prevRows) => {
        // Merge preserved input values with updated machine list
        const valMap = new Map<string, MachineRevenueRow>();
        prevRows.forEach((r) => valMap.set(r.assetCode.toUpperCase(), r));
        return loaded.map((r) => {
          const prev = valMap.get(r.assetCode.toUpperCase());
          if (prev) {
            return {
              ...r,
              players: prev.players,
              hidden: prev.hidden,
            };
          }
          return r;
        });
      });
    }
  }, [assets, rotations, hasSearched, activeLocCode, activeMonth, activeYear]);

  // Re-sync 7.2 lapRows whenever assets, rotations, or revenueRevision change in real-time
  useEffect(() => {
    if (lapHasSearched && lapActiveLocations.length > 0) {
      let allLapRows: MachineRevenueRow[] = [];
      lapActiveLocations.forEach((lCode) => {
        const { rows: locRows } = getLoadedRowsForLocation(lCode, lapActiveMonth, lapActiveYear);
        allLapRows.push(...locRows);
      });
      setLapRows(allLapRows);
    }
  }, [assets, rotations, revenueRevision, lapHasSearched, lapActiveLocations, lapActiveMonth, lapActiveYear]);

  // --------------------------------------------------
  // COLUMN CONTROLS
  // --------------------------------------------------
  const handleAddColumn = () => {
    if (isCurrentPeriodLocked) return;
    if (columns.length >= 31) {
      addToast('Maksimal 31 kolom pendapatan', 'warning');
      return;
    }

    const lastCol = columns[columns.length - 1];
    const nextId = columns.length + 1;
    const nextRawDate = getNextDayYmd(lastCol.rawDate);
    const nextDateStr = formatDdMmmYy(nextRawDate);

    setColumns((prev) => [
      ...prev,
      { id: nextId, dateStr: nextDateStr, rawDate: nextRawDate },
    ]);
  };

  const handleRemoveColumn = () => {
    if (isCurrentPeriodLocked) return;
    if (columns.length <= 1) {
      addToast('Minimal harus ada 1 kolom pendapatan', 'warning');
      return;
    }
    setColumns((prev) => prev.slice(0, -1));
  };

  const handleHeaderDateChange = (colId: number, pickedRawDate: string) => {
    if (isCurrentPeriodLocked) return;
    if (!pickedRawDate) return;
    // Extract only the day part, keeping activeMonth and activeYear locked
    const parts = pickedRawDate.split('-');
    const dayStr = parts.length === 3 ? parts[2] : String(new Date(pickedRawDate).getDate()).padStart(2, '0');
    const dayNum = parseInt(dayStr, 10) || 1;
    const maxDays = new Date(activeYear, activeMonth, 0).getDate();
    const clampedDay = Math.min(Math.max(1, dayNum), maxDays);
    const dayPadded = String(clampedDay).padStart(2, '0');

    const enforcedRawDate = `${activeYear}-${String(activeMonth).padStart(2, '0')}-${dayPadded}`;
    const formatted = formatDdMmmYy(enforcedRawDate);
    setColumns((prev) =>
      prev.map((c) => (c.id === colId ? { ...c, rawDate: enforcedRawDate, dateStr: formatted } : c))
    );
  };

  const handleSetColumnDay = (colId: number, dayNum: number) => {
    if (isCurrentPeriodLocked) return;
    const maxDays = new Date(activeYear, activeMonth, 0).getDate();
    const clampedDay = Math.min(Math.max(1, dayNum), maxDays);
    const dayPadded = String(clampedDay).padStart(2, '0');
    const enforcedRawDate = `${activeYear}-${String(activeMonth).padStart(2, '0')}-${dayPadded}`;
    const formatted = formatDdMmmYy(enforcedRawDate);
    setColumns((prev) =>
      prev.map((c) => (c.id === colId ? { ...c, rawDate: enforcedRawDate, dateStr: formatted } : c))
    );
  };

  // --------------------------------------------------
  // ROW CONTROLS (+ Tambah Baris, + Player, Hide)
  // --------------------------------------------------
  const handleAddManualRow = () => {
    if (isCurrentPeriodLocked) return;
    const manualId = 'man-' + Date.now();
    const newRow: MachineRevenueRow = {
      id: manualId,
      assetCode: 'NON-MESIN-' + (rows.filter((r) => r.isManual).length + 1),
      assetName: '',
      locationCode: activeLocCode,
      typeCode: 'LAIN',
      entryDate: columns[0]?.dateStr || '-',
      exitDate: '-',
      hidden: false,
      isManual: true,
      players: [
        {
          playerNo: 1,
          label: 'P1',
          values: {},
          notes: '',
        },
      ],
    };

    setRows((prev) => [...prev, newRow]);
    addToast('Baris baru berhasil ditambahkan di paling bawah', 'info');
  };

  const handleDeleteManualRow = (rowId: string) => {
    if (isCurrentPeriodLocked) {
      addToast(`Periode ini sedang DITUTUP. Tidak dapat menghapus baris!`, 'error');
      return;
    }
    setRows((prev) => {
      const next = prev.filter((r) => r.id !== rowId);
      if (activeLocCode) {
        const key = getStorageKey(activeLocCode, activeMonth, activeYear);
        const savedStr = localStorage.getItem(key);
        if (savedStr) {
          try {
            const parsed = JSON.parse(savedStr);
            if (parsed.rows && Array.isArray(parsed.rows)) {
              parsed.rows = parsed.rows.filter((r: MachineRevenueRow) => r.id !== rowId);
              localStorage.setItem(key, JSON.stringify(parsed));
              if (saveRevenueSheet) {
                saveRevenueSheet(activeLocCode, activeMonth, activeYear, parsed);
              }
            }
          } catch {}
        }
      }
      return next;
    });
    addToast('Baris manual berhasil dihapus', 'info');
  };

  const handleToggleHideRow = (rowId: string) => {
    if (isCurrentPeriodLocked) return;
    setRows((prev) =>
      prev.map((r) => (r.id === rowId ? { ...r, hidden: !r.hidden } : r))
    );
  };

  const handleAddPlayer = (rowId: string) => {
    if (isCurrentPeriodLocked) return;
    setRows((prev) =>
      prev.map((r) => {
        if (r.id !== rowId) return r;
        const nextPlayerNo = r.players.length + 1;
        const newPlayer: PlayerRevenue = {
          playerNo: nextPlayerNo,
          label: `P${nextPlayerNo}`,
          values: {},
          notes: '',
        };
        return {
          ...r,
          players: [...r.players, newPlayer],
        };
      })
    );
  };

  const handleRemovePlayer = (rowId: string, playerNo: number) => {
    if (isCurrentPeriodLocked) return;
    setRows((prev) =>
      prev.map((r) => {
        if (r.id !== rowId) return r;
        if (r.players.length <= 1) return r;
        const filtered = r.players.filter((p) => p.playerNo !== playerNo);
        // Re-index remaining players
        const reIndexed = filtered.map((p, idx) => ({
          ...p,
          playerNo: idx + 1,
          label: `P${idx + 1}`,
        }));
        return {
          ...r,
          players: reIndexed,
        };
      })
    );
  };

  const handleUpdateValue = (
    rowId: string,
    playerNo: number,
    colId: number,
    field: 'coin' | 'revenue',
    val: string
  ) => {
    if (isCurrentPeriodLocked) return;
    setRows((prev) =>
      prev.map((r) => {
        if (r.id !== rowId) return r;
        const updatedPlayers = r.players.map((p) => {
          if (p.playerNo !== playerNo) return p;
          const currentVal = p.values[colId] || { coin: '', revenue: '' };
          return {
            ...p,
            values: {
              ...p.values,
              [colId]: {
                ...currentVal,
                [field]: val,
              },
            },
          };
        });
        return {
          ...r,
          players: updatedPlayers,
        };
      })
    );
  };

  const handleUpdateNotes = (rowId: string, playerNo: number, val: string) => {
    if (isCurrentPeriodLocked) return;
    setRows((prev) =>
      prev.map((r) => {
        if (r.id !== rowId) return r;
        const updatedPlayers = r.players.map((p) =>
          p.playerNo === playerNo ? { ...p, notes: val } : p
        );
        return { ...r, players: updatedPlayers };
      })
    );
  };

  // Helper to format currency on blur
  const handleBlurCurrency = (
    rowId: string,
    playerNo: number,
    colId: number,
    rawVal: string
  ) => {
    if (!rawVal.trim()) return;
    const num = parseNum(rawVal);
    const formatted = formatCurrencyNumber(num);
    handleUpdateValue(rowId, playerNo, colId, 'revenue', formatted);
  };

  // Helper to get raw unformatted value on focus
  const handleFocusCurrency = (
    rowId: string,
    playerNo: number,
    colId: number,
    currentFormatted: string
  ) => {
    if (!currentFormatted.trim()) return;
    const num = parseNum(currentFormatted);
    handleUpdateValue(rowId, playerNo, colId, 'revenue', num > 0 ? String(num) : '');
  };

  // --------------------------------------------------
  // COMPUTATIONS: PER ROW TOTALS, SUBTOTALS & GRAND TOTAL
  // --------------------------------------------------
  // Row Totals (sum of all columns & players)
  const computeRowTotals = (row: MachineRevenueRow) => {
    let totalCoin = 0;
    let totalRevenue = 0;

    row.players.forEach((p) => {
      columns.forEach((c) => {
        const valObj = p.values[c.id];
        if (valObj) {
          totalCoin += parseInt(valObj.coin || '0', 10) || 0;
          totalRevenue += parseNum(valObj.revenue || '0');
        }
      });
    });

    return { totalCoin, totalRevenue };
  };

  // Group rows by JENIS (typeCode) for 7.1
  const groupedData = useMemo(() => {
    const displayRows = rows;

    const groups: Record<string, MachineRevenueRow[]> = {};
    displayRows.forEach((r) => {
      const type = r.typeCode || 'OT';
      if (!groups[type]) groups[type] = [];
      groups[type].push(r);
    });

    const sortedKeys = Object.keys(groups).sort();

    return sortedKeys.map((typeKey) => {
      const groupRows = groups[typeKey];
      const typeObj = assetTypes.find((t) => t.code === typeKey);
      const typeName = typeObj ? typeObj.name.toUpperCase() : typeKey.toUpperCase();

      const colSubtotals: Record<number, { coin: number; revenue: number }> = {};
      columns.forEach((c) => {
        colSubtotals[c.id] = { coin: 0, revenue: 0 };
      });

      let subtotalTotalCoin = 0;
      let subtotalTotalRevenue = 0;

      groupRows.forEach((r) => {
        r.players.forEach((p) => {
          columns.forEach((c) => {
            const valObj = p.values[c.id];
            if (valObj) {
              const cCoin = parseInt(valObj.coin || '0', 10) || 0;
              const cRev = parseNum(valObj.revenue || '0');
              colSubtotals[c.id].coin += cCoin;
              colSubtotals[c.id].revenue += cRev;
              subtotalTotalCoin += cCoin;
              subtotalTotalRevenue += cRev;
            }
          });
        });
      });

      return {
        typeKey,
        typeName,
        rows: groupRows,
        colSubtotals,
        subtotalTotalCoin,
        subtotalTotalRevenue,
      };
    });
  }, [rows, columns, assetTypes]);

  // Grand Total for 7.1
  const grandTotal = useMemo(() => {
    const colTotals: Record<number, { coin: number; revenue: number }> = {};
    columns.forEach((c) => {
      colTotals[c.id] = { coin: 0, revenue: 0 };
    });

    let totalCoin = 0;
    let totalRevenue = 0;

    groupedData.forEach((grp) => {
      columns.forEach((c) => {
        colTotals[c.id].coin += grp.colSubtotals[c.id]?.coin || 0;
        colTotals[c.id].revenue += grp.colSubtotals[c.id]?.revenue || 0;
      });
      totalCoin += grp.subtotalTotalCoin;
      totalRevenue += grp.subtotalTotalRevenue;
    });

    return { colTotals, totalCoin, totalRevenue };
  }, [groupedData, columns]);

  // Group rows for 7.2 Laporan (supports multi-location and JENIS filter)
  const lapGroupedData = useMemo(() => {
    const displayRows = lapRows.filter((r) => {
      if (r.hidden) return false;
      if (!lapSpecificTypes.includes('ALL')) {
        if (lapSpecificTypes.length === 0 || !lapSpecificTypes.includes(r.typeCode)) {
          return false;
        }
      }
      return true;
    });

    const groups: Record<string, MachineRevenueRow[]> = {};
    displayRows.forEach((r) => {
      const type = r.typeCode || 'OT';
      if (!groups[type]) groups[type] = [];
      groups[type].push(r);
    });

    const sortedKeys = Object.keys(groups).sort();

    return sortedKeys.map((typeKey) => {
      const groupRows = groups[typeKey];
      const typeObj = assetTypes.find((t) => t.code === typeKey);
      const typeName = typeObj ? typeObj.name.toUpperCase() : typeKey.toUpperCase();

      const colSubtotals: Record<number, { coin: number; revenue: number }> = {};
      lapColumns.forEach((c) => {
        colSubtotals[c.id] = { coin: 0, revenue: 0 };
      });

      let subtotalTotalCoin = 0;
      let subtotalTotalRevenue = 0;

      groupRows.forEach((r) => {
        r.players.forEach((p) => {
          lapColumns.forEach((c) => {
            const valObj = p.values[c.id];
            if (valObj) {
              const cCoin = parseInt(valObj.coin || '0', 10) || 0;
              const cRev = parseNum(valObj.revenue || '0');
              colSubtotals[c.id].coin += cCoin;
              colSubtotals[c.id].revenue += cRev;
              subtotalTotalCoin += cCoin;
              subtotalTotalRevenue += cRev;
            }
          });
        });
      });

      return {
        typeKey,
        typeName,
        rows: groupRows,
        colSubtotals,
        subtotalTotalCoin,
        subtotalTotalRevenue,
      };
    });
  }, [lapRows, lapColumns, assetTypes, lapSpecificTypes]);

  // Grand Total for 7.2
  const lapGrandTotal = useMemo(() => {
    const colTotals: Record<number, { coin: number; revenue: number }> = {};
    lapColumns.forEach((c) => {
      colTotals[c.id] = { coin: 0, revenue: 0 };
    });

    let totalCoin = 0;
    let totalRevenue = 0;

    lapGroupedData.forEach((grp) => {
      lapColumns.forEach((c) => {
        colTotals[c.id].coin += grp.colSubtotals[c.id]?.coin || 0;
        colTotals[c.id].revenue += grp.colSubtotals[c.id]?.revenue || 0;
      });
      totalCoin += grp.subtotalTotalCoin;
      totalRevenue += grp.subtotalTotalRevenue;
    });

    return { colTotals, totalCoin, totalRevenue };
  }, [lapGroupedData, lapColumns]);

  // Active Location Object
  const activeLocationObj = useMemo(() => {
    return locations.find((l) => l.code === activeLocCode);
  }, [locations, activeLocCode]);

  // --------------------------------------------------
  // EXPORT EXCEL FOR 7.2 (MATCHING USER SAMPLE EXACTLY)
  // --------------------------------------------------
  const handleExportExcel72 = async () => {
    const exportRows = lapRows.length > 0 ? lapRows : rows;
    const exportColumns = lapRows.length > 0 ? lapColumns : columns;
    const exportGrouped = lapRows.length > 0 ? lapGroupedData : groupedData;
    const exportGrand = lapRows.length > 0 ? lapGrandTotal : grandTotal;
    const exportMonth = lapRows.length > 0 ? lapActiveMonth : activeMonth;
    const exportYear = lapRows.length > 0 ? lapActiveYear : activeYear;
    const exportLocs = lapRows.length > 0
      ? lapActiveLocations
      : (activeLocCode ? [activeLocCode] : []);

    if (exportRows.length === 0 || exportLocs.length === 0) {
      addToast('Tidak ada data untuk diekspor. Silakan klik CARI / TAMPILKAN terlebih dahulu.', 'warning');
      return;
    }

    const isAll = exportLocs.includes('ALL') || exportLocs.length > 1;
    const locCode = isAll ? 'SEMUA_LOKASI' : exportLocs[0];
    const matchedLoc = locations.find((l) => l.code === exportLocs[0]);
    const locName = isAll ? 'SEMUA LOKASI' : (matchedLoc?.name || exportLocs[0]);
    const periodeLabel = `${MONTH_NAMES[exportMonth - 1]} ${exportYear}`;
    const fileName = `LAPORAN_PENDAPATAN_${locCode}_${MONTH_NAMES[exportMonth - 1]}_${exportYear}`;

    let multiLocationsData: any[] | undefined = undefined;
    if (isAll) {
      const locCodesInRows = Array.from(new Set(exportRows.map((r) => r.locationCode).filter(Boolean)));
      const targetLocCodes = exportLocs.includes('ALL')
        ? (locCodesInRows.length > 0 ? locCodesInRows : displayLocations.map((l) => l.code))
        : exportLocs;

      multiLocationsData = targetLocCodes.map((code) => {
        const locObj = locations.find((l) => l.code === code);
        const lName = locObj?.name || code;
        const locRows = exportRows.filter((r) => r.locationCode === code);

        const groups: Record<string, MachineRevenueRow[]> = {};
        locRows.forEach((r) => {
          const type = r.typeCode || 'OT';
          if (!groups[type]) groups[type] = [];
          groups[type].push(r);
        });

        const sortedKeys = Object.keys(groups).sort();
        const grouped = sortedKeys.map((typeKey) => {
          const groupRows = groups[typeKey];
          const typeObj = assetTypes.find((t) => t.code === typeKey);
          const typeName = typeObj ? typeObj.name.toUpperCase() : typeKey.toUpperCase();

          const colSubtotals: Record<number, { coin: number; revenue: number }> = {};
          exportColumns.forEach((c) => {
            colSubtotals[c.id] = { coin: 0, revenue: 0 };
          });

          let subtotalTotalCoin = 0;
          let subtotalTotalRevenue = 0;

          groupRows.forEach((r) => {
            r.players.forEach((p) => {
              exportColumns.forEach((c) => {
                const valObj = p.values && p.values[c.id];
                if (valObj) {
                  const cCoin = parseInt(valObj.coin || '0', 10) || 0;
                  const cRev = parseNum(valObj.revenue || '0');
                  colSubtotals[c.id].coin += cCoin;
                  colSubtotals[c.id].revenue += cRev;
                  subtotalTotalCoin += cCoin;
                  subtotalTotalRevenue += cRev;
                }
              });
            });
          });

          return {
            typeKey,
            typeName,
            rows: groupRows,
            colSubtotals,
            subtotalTotalCoin,
            subtotalTotalRevenue,
          };
        });

        const colTotals: Record<number, { coin: number; revenue: number }> = {};
        exportColumns.forEach((c) => {
          colTotals[c.id] = { coin: 0, revenue: 0 };
        });
        let totalCoin = 0;
        let totalRevenue = 0;
        grouped.forEach((grp) => {
          exportColumns.forEach((c) => {
            colTotals[c.id].coin += grp.colSubtotals[c.id]?.coin || 0;
            colTotals[c.id].revenue += grp.colSubtotals[c.id]?.revenue || 0;
          });
          totalCoin += grp.subtotalTotalCoin;
          totalRevenue += grp.subtotalTotalRevenue;
        });

        return {
          locationCode: code,
          locationName: lName,
          groupedData: grouped,
          grandTotals: { colTotals, totalCoin, totalRevenue },
        };
      });
    }

    try {
      await exportLaporanPendapatanExcel({
        groupedData: exportGrouped,
        grandTotals: exportGrand,
        columns: exportColumns,
        locationCode: isAll ? '' : exportLocs[0],
        locationName: locName,
        periodeLabel,
        filename: fileName,
        multiLocationsData,
      });
      addToast(`Berhasil mengunduh Excel Laporan Pendapatan (${fileName}.xlsx)`, 'success');
    } catch (err) {
      console.error(err);
      addToast('Gagal mengekspor data ke Excel', 'error');
    }
  };

  return (
    <div className="p-3 md:p-4 space-y-4">
      {/* Tab Navigation */}
      <div className="bg-white border border-zinc-200 rounded-xl shadow-xs overflow-hidden">
        <div className="p-4 border-b border-zinc-200 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap gap-2" role="tablist">
            {can71 && (
              <button
                type="button"
                role="tab"
                aria-selected={activeSubTab === 'input'}
                onClick={() => setActiveSubTab('input')}
                className={`px-4 h-9 rounded-full text-xs font-bold transition whitespace-nowrap cursor-pointer ${
                  activeSubTab === 'input'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'bg-zinc-100 text-zinc-700 hover:bg-zinc-200'
                }`}
              >
                7.1 INPUT PENDAPATAN MESIN
              </button>
            )}
            {can72 && (
              <button
                type="button"
                role="tab"
                aria-selected={activeSubTab === 'laporan'}
                onClick={() => setActiveSubTab('laporan')}
                className={`px-4 h-9 rounded-full text-xs font-bold transition whitespace-nowrap cursor-pointer ${
                  activeSubTab === 'laporan'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'bg-zinc-100 text-zinc-700 hover:bg-zinc-200'
                }`}
              >
                7.2 LAPORAN PENDAPATAN MESIN
              </button>
            )}
          </div>

          <button
            type="button"
            onClick={toggleGridLines}
            aria-pressed={gridLines}
            title="Tampilkan atau sembunyikan garis tabel"
            className={`inline-flex items-center h-8 px-3 rounded-lg border text-xs font-semibold whitespace-nowrap transition cursor-pointer ${
              gridLines
                ? 'border-indigo-300 bg-indigo-50 text-indigo-700'
                : 'border-zinc-300 bg-white text-zinc-600 hover:bg-zinc-100'
            }`}
          >
            ▦ Grid: {gridLines ? 'ON' : 'OFF'}
          </button>
        </div>

        {!can71 && !can72 && (
          <div className="p-8 text-center text-zinc-500 text-sm">
            Anda tidak memiliki izin untuk mengakses sub-menu di Pendapatan Mesin.
          </div>
        )}

        {/* ==================================================== */}
        {/* 7.1 INPUT PENDAPATAN MESIN TAB                       */}
        {/* ==================================================== */}
        {activeSubTab === 'input' && can71 && (
          <div className="p-4 space-y-4">
            {/* Filter Bar */}
            <div className="p-4 bg-zinc-50 border border-zinc-200 rounded-xl flex flex-wrap items-end gap-3">
              <div className="min-w-[220px] flex-1 sm:flex-initial">
                <label className="text-[11px] font-bold text-zinc-700 block uppercase tracking-wider">
                  KODE LOKASI <span className="text-red-500">*</span>
                </label>
                <select
                  value={filterLocCode}
                  onChange={(e) => setFilterLocCode(e.target.value)}
                  disabled={!isSuperAdmin && displayLocations.length === 1}
                  className="bg-white border-zinc-300 text-zinc-900 w-full mt-1 h-9 px-3 rounded-lg border text-xs focus:ring-2 focus:ring-indigo-500 font-semibold disabled:bg-zinc-100 disabled:cursor-not-allowed"
                >
                  <option value="">Pilih Kode Lokasi...</option>
                  {displayLocations.map((loc) => (
                    <option key={loc.code} value={loc.code}>
                      {loc.code} - {loc.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="min-w-[140px]">
                <label className="text-[11px] font-bold text-zinc-700 block uppercase tracking-wider">
                  BULAN <span className="text-red-500">*</span>
                </label>
                <select
                  value={filterMonth}
                  onChange={(e) => setFilterMonth(e.target.value)}
                  className="bg-white border-zinc-300 text-zinc-900 w-full mt-1 h-9 px-3 rounded-lg border text-xs"
                >
                  {MONTH_NAMES.map((name, idx) => (
                    <option key={name} value={String(idx + 1)}>
                      {name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="min-w-[130px]">
                <label className="text-[11px] font-bold text-zinc-700 block uppercase tracking-wider mb-1">
                  TAHUN <span className="text-red-500">*</span>
                </label>
                <YearFilterInput
                  value={filterYear}
                  onChange={setFilterYear}
                  allowAll={false}
                />
              </div>

              <button
                type="button"
                onClick={handleSearch}
                className="inline-flex items-center justify-center gap-1.5 rounded-lg font-bold transition whitespace-nowrap h-9 px-5 text-xs bg-blue-600 text-white hover:bg-blue-700 cursor-pointer shadow-xs"
              >
                CARI / TAMPILKAN
              </button>
            </div>

            {/* If not searched yet */}
            {!hasSearched ? (
              <div className="p-8 text-center bg-blue-50/50 border border-blue-200 rounded-xl text-blue-900">
                <HelpCircle className="w-10 h-10 mx-auto text-blue-500 mb-2 stroke-1" />
                <p className="text-sm font-semibold">Silakan pilih Kode Lokasi dan Periode terlebih dahulu untuk menampilkan data aset.</p>
                <p className="text-xs text-blue-600 mt-1">Data mesin dan histori rotasi akan otomatis dimuat sesuai lokasi dan bulan yang dipilih.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {/* Auto-hide notification wrapper for both banners */}
                <div
                  className={`auto-hide-notif-wrapper auto-hide-notif-wrapper-71 ${
                    bannerPhase71 === 'collapsing' ? 'slide-up-fade-out notif-collapsing' : ''
                  } ${bannerPhase71 === 'hidden' ? 'is-hidden notif-hidden' : ''}`}
                >
                  <div className="space-y-2.5">
                    {/* Period Lock Warning */}
                    {isCurrentPeriodLocked && (
                      <div className="p-3 bg-red-50 border border-red-300 rounded-lg text-red-800 text-xs flex items-center gap-2">
                        <Lock className="w-4 h-4 text-red-600 shrink-0" />
                        <span>
                          <strong>Periode sudah tutup, buka dulu di menu 4. AKTIVITAS!</strong> Input dan edit pendapatan untuk lokasi {activeLocCode} periode {MONTH_NAMES[activeMonth - 1]} {activeYear} dinonaktifkan.
                        </span>
                      </div>
                    )}

                    {/* Bulk Date Info Banner */}
                    <div className="p-2.5 bg-amber-50/80 border border-amber-200 rounded-lg text-amber-900 text-xs flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-amber-700">💡 INFO:</span>
                        <span>Tanggal input cukup 1x di header untuk semua aset. Klik tombol kalender pada header kolom pendapatan untuk memilih tanggal (bulan & tahun terkunci pada periode {MONTH_NAMES[activeMonth - 1]} {activeYear}).</span>
                      </div>
                      <span className="text-[11px] font-semibold text-zinc-600">
                        Lokasi: <strong>{activeLocCode}</strong> | Periode: <strong>{MONTH_NAMES[activeMonth - 1]} {activeYear}</strong>
                      </span>
                    </div>
                  </div>
                </div>

                {/* Action Toolbar */}
                <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                  <div className="flex flex-wrap items-center gap-2">
                    {/* + Tambah Baris */}
                    <button
                      type="button"
                      onClick={handleAddManualRow}
                      disabled={isCurrentPeriodLocked}
                      className="inline-flex items-center justify-center gap-1.5 rounded-lg font-semibold transition whitespace-nowrap h-9 px-3 text-xs border border-zinc-300 bg-white hover:bg-zinc-50 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed shadow-xs"
                      title="Tambah baris pendapatan diluar mesin"
                    >
                      <Plus className="w-3.5 h-3.5" /> + Tambah Baris
                    </button>

                    {/* + Kolom Pendapatan */}
                    <button
                      type="button"
                      onClick={handleAddColumn}
                      disabled={isCurrentPeriodLocked || columns.length >= 31}
                      className="inline-flex items-center justify-center gap-1.5 rounded-lg font-semibold transition whitespace-nowrap h-9 px-3 text-xs border border-zinc-300 bg-white text-zinc-800 hover:bg-zinc-50 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed shadow-xs"
                    >
                      <Plus className="w-3.5 h-3.5" /> + Kolom Pendapatan
                    </button>

                    {/* - Hapus Kolom Pendapatan */}
                    <button
                      type="button"
                      onClick={handleRemoveColumn}
                      disabled={isCurrentPeriodLocked || columns.length <= 1}
                      className="inline-flex items-center justify-center gap-1.5 rounded-lg font-semibold transition whitespace-nowrap h-9 px-3 text-xs border border-red-200 bg-red-50 text-red-700 hover:bg-red-100 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed shadow-xs"
                    >
                      <Minus className="w-3.5 h-3.5" /> - Hapus Kolom Pendapatan
                    </button>
                  </div>

                  {/* Reset Button & Simpan Pendapatan */}
                  <div className="flex items-center gap-2 ml-auto">
                    <FreezeColumnDropdown
                      value={freezeMode71}
                      options={MENU7_FREEZE_OPTIONS}
                      onChange={handleFreezeChange71}
                    />
                    <ResetButton71 />
                    <button
                      type="button"
                      onClick={handleSaveRevenue}
                      disabled={isCurrentPeriodLocked}
                      className="inline-flex items-center justify-center gap-1.5 rounded-lg font-bold transition whitespace-nowrap h-9 px-5 text-xs bg-emerald-600 text-white hover:bg-emerald-700 cursor-pointer shadow-xs disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Save className="w-4 h-4" /> Simpan Pendapatan
                    </button>
                  </div>
                </div>

                {/* ==================================================== */}
                {/* 7.1 TABLE CONTAINER (Uniform Blue Header)            */}
                {/* ==================================================== */}
                <div id="tabel-preview-aset" className="table-preview-container table-wrapper overflow-x-auto overflow-y-auto max-h-[75vh] border border-zinc-300 rounded-lg">
                  <table
                    ref={tableRef71}
                    className={`w-full text-xs border-collapse resizable-table ${
                      gridLines ? 'table-gridlines-active' : ''
                    }`}
                  >
                    {/* Header: Uniform blue following Menu 1 */}
                    <thead className="sticky top-0 z-20 bg-[#1e40af] text-white">
                      {/* Baris 1: Header Utama */}
                      <tr className="border-b border-blue-900/60">
                        <th
                          rowSpan={2}
                          style={getStickyStyle71(0, true)}
                          className={`px-2.5 py-2 font-bold border border-blue-900/40 text-center align-middle whitespace-nowrap min-w-[90px] ${getStickyClass71(0, true)}`}
                        >
                          KODE<br />LOKASI
                        </th>
                        <th
                          rowSpan={2}
                          style={getStickyStyle71(1, true)}
                          className={`px-2 py-2 font-bold border border-blue-900/40 text-center align-middle whitespace-nowrap min-w-[45px] ${getStickyClass71(1, true)}`}
                        >
                          NO
                        </th>
                        <th
                          rowSpan={2}
                          style={getStickyStyle71(2, true)}
                          className={`px-3 py-2 font-bold border border-blue-900/40 text-center align-middle min-w-[240px] ${getStickyClass71(2, true)}`}
                        >
                          NAMA ASET
                        </th>
                        <th
                          rowSpan={2}
                          style={getStickyStyle71(3, true)}
                          className={`px-2 py-2 font-bold border border-blue-900/40 text-center align-middle whitespace-nowrap min-w-[70px] ${getStickyClass71(3, true)}`}
                        >
                          JENIS
                        </th>
                        <th
                          rowSpan={2}
                          style={getStickyStyle71(4, true)}
                          className={`px-2 py-2 font-bold border border-blue-900/40 text-center align-middle whitespace-nowrap min-w-[120px] ${getStickyClass71(4, true)}`}
                        >
                          KODE ASET
                        </th>
                        <th
                          rowSpan={2}
                          className="px-2 py-2 font-bold border border-blue-900/40 text-center align-middle whitespace-nowrap min-w-[100px]"
                        >
                          TANGGAL<br />MASUK ASET
                        </th>
                        <th
                          rowSpan={2}
                          className="px-2 py-2 font-bold border border-blue-900/40 text-center align-middle whitespace-nowrap min-w-[100px]"
                        >
                          TANGGAL<br />KELUAR ASET
                        </th>

                        {/* Dynamic PENDAPATAN Columns */}
                        {columns.map((col) => {
                          const maxDaysInMonth = new Date(activeYear, activeMonth, 0).getDate();
                          const minDateStr = `${activeYear}-${String(activeMonth).padStart(2, '0')}-01`;
                          const maxDateStr = `${activeYear}-${String(activeMonth).padStart(2, '0')}-${String(maxDaysInMonth).padStart(2, '0')}`;

                          return (
                            <th
                              key={col.id}
                              colSpan={2}
                              className="px-2 py-1.5 font-bold border border-blue-900/40 text-center align-middle whitespace-nowrap min-w-[190px]"
                            >
                              <div
                                onClick={() => {
                                  if (!isCurrentPeriodLocked) {
                                    setPickerColId(col.id);
                                  }
                                }}
                                title="Klik untuk mengganti tanggal (bulan & tahun terkunci)"
                                className="flex items-center justify-center gap-1.5 cursor-pointer select-none group text-white"
                              >
                                <span>PENDAPATAN</span>
                                <span className="text-yellow-300 font-extrabold tracking-wide underline decoration-dotted group-hover:decoration-solid">
                                  {col.id} : {col.dateStr}
                                </span>
                                <button
                                  type="button"
                                  disabled={isCurrentPeriodLocked}
                                  title={`Pilih tanggal via kalender (${MONTH_NAMES[activeMonth - 1]} ${activeYear})`}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setPickerColId(col.id);
                                  }}
                                  className="p-1 rounded hover:bg-white/10 cursor-pointer text-white"
                                >
                                  <Calendar className="w-3.5 h-3.5" />
                                </button>
                                <input
                                  type="date"
                                  ref={(el) => {
                                    dateInputRefs.current[col.id] = el;
                                  }}
                                  min={minDateStr}
                                  max={maxDateStr}
                                  value={col.rawDate}
                                  onChange={(e) => handleHeaderDateChange(col.id, e.target.value)}
                                  className="sr-only"
                                />
                              </div>
                            </th>
                          );
                        })}

                        <th
                          rowSpan={2}
                          className="px-2.5 py-2 font-bold border border-blue-900/40 text-center align-middle whitespace-nowrap min-w-[100px]"
                        >
                          TOTAL QTY COIN/TAP
                        </th>
                        <th
                          rowSpan={2}
                          className="px-3 py-2 font-bold border border-blue-900/40 text-center align-middle whitespace-nowrap min-w-[140px]"
                        >
                          TOTAL PENDAPATAN
                        </th>
                        <th
                          rowSpan={2}
                          className="px-3 py-2 font-bold border border-blue-900/40 text-center align-middle min-w-[160px]"
                        >
                          KETERANGAN
                        </th>
                        <th
                          rowSpan={2}
                          className="px-2 py-2 font-bold border border-blue-900/40 text-center align-middle whitespace-nowrap min-w-[145px]"
                        >
                          AKSI
                        </th>
                      </tr>

                      {/* Baris 2: Sub-header */}
                      <tr className="border-b border-blue-900/60 bg-[#1d4ed8] text-white">
                        {columns.map((col) => (
                          <React.Fragment key={'sub-' + col.id}>
                            <th className="px-2 py-1 font-bold border border-blue-900/40 text-center whitespace-nowrap min-w-[80px]">
                              QTY COIN/TAP
                            </th>
                            <th className="px-2 py-1 font-bold border border-blue-900/40 text-center whitespace-nowrap min-w-[110px]">
                              PENDAPATAN
                            </th>
                          </React.Fragment>
                        ))}
                      </tr>
                    </thead>

                    {/* Table Body */}
                    <tbody>
                      {rows.length === 0 ? (
                        <tr>
                          <td
                            colSpan={11 + columns.length * 2}
                            className="p-8 text-center text-zinc-500 italic bg-white"
                          >
                            Tidak ada data mesin ditemukan pada lokasi dan periode ini.
                          </td>
                        </tr>
                      ) : (
                        groupedData.map((grp) => {
                          let groupRunningNo = 1;
                          return (
                            <React.Fragment key={'grp-' + grp.typeKey}>
                              {grp.rows.map((row) => {
                                const rowTotals = computeRowTotals(row);
                                const hasMultiplePlayers = row.players.length > 1;

                                return (
                                  <React.Fragment key={row.id}>
                                    {row.players.map((player, pIdx) => {
                                      const isFirstPlayer = pIdx === 0;

                                      return (
                                        <tr
                                          key={row.id + '-p-' + player.playerNo}
                                          className={`border-b border-black transition hover:bg-blue-50/40 ${
                                            row.hidden ? 'opacity-40 bg-zinc-100 italic' : 'bg-white'
                                          }`}
                                        >
                                          {/* Merged Columns if multiple players */}
                                          {isFirstPlayer && (
                                            <>
                                              <td
                                                rowSpan={hasMultiplePlayers ? row.players.length : 1}
                                                style={getStickyStyle71(0, false)}
                                                className={`px-2 py-1.5 border border-black text-center font-bold font-mono text-[11px] align-middle ${getStickyClass71(0, false, row.hidden)}`}
                                              >
                                                {row.locationCode}
                                              </td>
                                              <td
                                                rowSpan={hasMultiplePlayers ? row.players.length : 1}
                                                style={getStickyStyle71(1, false)}
                                                className={`px-1.5 py-1.5 border border-black text-center font-mono text-[11px] text-zinc-500 align-middle ${getStickyClass71(1, false, row.hidden)}`}
                                              >
                                                {groupRunningNo++}
                                              </td>
                                            </>
                                          )}

                                          {/* NAMA ASET */}
                                          <td
                                            style={getStickyStyle71(2, false)}
                                            className={`px-2.5 py-1.5 border border-black align-middle font-medium ${getStickyClass71(2, false, row.hidden)}`}
                                          >
                                            {row.isManual ? (
                                              <input
                                                type="text"
                                                value={row.assetName}
                                                disabled={isCurrentPeriodLocked}
                                                placeholder="Masukan Nama"
                                                onChange={(e) =>
                                                  setRows((prev) =>
                                                    prev.map((r) =>
                                                      r.id === row.id ? { ...r, assetName: e.target.value } : r
                                                    )
                                                  )
                                                }
                                                className="w-full bg-white border border-zinc-300 rounded px-1.5 py-0.5 text-xs font-semibold text-zinc-900 placeholder:text-zinc-400 placeholder:font-normal focus:ring-1 focus:ring-blue-500 outline-hidden"
                                              />
                                            ) : (
                                              <div className="flex items-center gap-1.5">
                                                <span>
                                                  {hasMultiplePlayers
                                                    ? `${row.assetName} (${player.label})`
                                                    : row.assetName}
                                                </span>
                                              </div>
                                            )}
                                          </td>

                                          {/* Merged JENIS, KODE ASET, TGL MASUK, TGL KELUAR */}
                                          {isFirstPlayer && (
                                            <>
                                              <td
                                                rowSpan={hasMultiplePlayers ? row.players.length : 1}
                                                style={getStickyStyle71(3, false)}
                                                className={`px-2 py-1.5 border border-black text-center font-bold text-[11px] align-middle ${getStickyClass71(3, false, row.hidden)}`}
                                              >
                                                {row.typeCode}
                                              </td>
                                              <td
                                                rowSpan={hasMultiplePlayers ? row.players.length : 1}
                                                style={getStickyStyle71(4, false)}
                                                className={`px-2 py-1.5 border border-black font-mono text-[11px] font-medium align-middle ${getStickyClass71(4, false, row.hidden)}`}
                                              >
                                                {row.assetCode}
                                              </td>
                                              <td
                                                rowSpan={hasMultiplePlayers ? row.players.length : 1}
                                                className="px-2 py-1.5 border border-black text-center font-mono text-[11px] align-middle bg-inherit"
                                              >
                                                {row.entryDate}
                                              </td>
                                              <td
                                                rowSpan={hasMultiplePlayers ? row.players.length : 1}
                                                className="px-2 py-1.5 border border-black text-center font-mono text-[11px] align-middle bg-inherit"
                                              >
                                                {row.exitDate}
                                              </td>
                                            </>
                                          )}

                                          {/* Dynamic Columns Inputs */}
                                          {columns.map((c) => {
                                            const cellVal = player.values[c.id] || { coin: '', revenue: '' };
                                            return (
                                              <React.Fragment key={c.id}>
                                                <td className="px-1 py-1 border border-black align-middle">
                                                  <input
                                                    type="text"
                                                    value={cellVal.coin}
                                                    disabled={isCurrentPeriodLocked}
                                                    placeholder="1500"
                                                    onChange={(e) => {
                                                      const clean = e.target.value.replace(/[^0-9]/g, '');
                                                      handleUpdateValue(row.id, player.playerNo, c.id, 'coin', clean);
                                                    }}
                                                    className="w-full bg-white border border-zinc-200 rounded px-1.5 py-1 text-center font-mono text-xs focus:ring-1 focus:ring-blue-500 outline-hidden"
                                                  />
                                                </td>
                                                <td className="px-1 py-1 border border-black align-middle">
                                                  <input
                                                    type="text"
                                                    value={cellVal.revenue}
                                                    disabled={isCurrentPeriodLocked}
                                                    placeholder="207.000,00"
                                                    onFocus={() => handleFocusCurrency(row.id, player.playerNo, c.id, cellVal.revenue)}
                                                    onBlur={(e) => handleBlurCurrency(row.id, player.playerNo, c.id, e.target.value)}
                                                    onChange={(e) => handleUpdateValue(row.id, player.playerNo, c.id, 'revenue', e.target.value)}
                                                    className="w-full bg-white border border-zinc-200 rounded px-1.5 py-1 text-right font-mono text-xs focus:ring-1 focus:ring-blue-500 outline-hidden"
                                                  />
                                                </td>
                                              </React.Fragment>
                                            );
                                          })}

                                          {/* Merged TOTAL COIN & TOTAL PENDAPATAN */}
                                          {isFirstPlayer && (
                                            <>
                                              <td
                                                rowSpan={hasMultiplePlayers ? row.players.length : 1}
                                                className="px-2 py-1.5 border border-black text-center font-mono font-bold text-xs bg-[#fef08a] text-zinc-900 align-middle"
                                              >
                                                {rowTotals.totalCoin.toLocaleString('id-ID')}
                                              </td>
                                              <td
                                                rowSpan={hasMultiplePlayers ? row.players.length : 1}
                                                className="px-2 py-1.5 border border-black text-right font-mono font-bold text-xs bg-[#fef08a] text-zinc-900 align-middle"
                                              >
                                                {formatCurrencyNumber(rowTotals.totalRevenue)}
                                              </td>
                                            </>
                                          )}

                                          {/* KETERANGAN */}
                                          <td className="px-1.5 py-1 border border-black align-middle">
                                            <input
                                              type="text"
                                              value={player.notes}
                                              disabled={isCurrentPeriodLocked}
                                              placeholder="Ket - bisa isi -"
                                              onChange={(e) => handleUpdateNotes(row.id, player.playerNo, e.target.value)}
                                              className="w-full bg-white border border-zinc-200 rounded px-1.5 py-1 text-xs text-zinc-700 focus:ring-1 focus:ring-blue-500 outline-hidden"
                                            />
                                          </td>

                                          {/* AKSI */}
                                          <td className="px-1.5 py-1 border border-black text-center align-middle whitespace-nowrap">
                                            <div className="flex items-center justify-center gap-1">
                                              {isFirstPlayer ? (
                                                <>
                                                  {/* + Player */}
                                                  <button
                                                    type="button"
                                                    onClick={() => handleAddPlayer(row.id)}
                                                    disabled={isCurrentPeriodLocked}
                                                    title="Tambah Player untuk mesin ini"
                                                    className="px-1.5 py-0.5 bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 rounded text-[10px] font-bold cursor-pointer disabled:opacity-40"
                                                  >
                                                    + Player
                                                  </button>
                                                  {/* Hide button */}
                                                  <button
                                                    type="button"
                                                    onClick={() => handleToggleHideRow(row.id)}
                                                    disabled={isCurrentPeriodLocked}
                                                    title={row.hidden ? 'Tampilkan kembali baris ini' : 'Sembunyikan dari Laporan 7.2'}
                                                    className={`px-1.5 py-0.5 rounded text-[10px] font-bold border transition cursor-pointer ${
                                                      row.hidden
                                                        ? 'bg-amber-100 text-amber-800 border-amber-300'
                                                        : 'bg-zinc-100 text-zinc-600 border-zinc-300 hover:bg-zinc-200'
                                                    }`}
                                                  >
                                                    {row.hidden ? <Eye className="w-3 h-3 inline mr-0.5" /> : <EyeOff className="w-3 h-3 inline mr-0.5" />}
                                                    {row.hidden ? 'Unhide' : 'Hide'}
                                                  </button>
                                                  {/* Tombol Hapus Baris: Khusus data yang baru ditambahkan lewat tombol '+ Tambah Baris' (bukan dari data aset utama) */}
                                                  {row.isManual && (
                                                    <button
                                                      type="button"
                                                      onClick={() => handleDeleteManualRow(row.id)}
                                                      disabled={isCurrentPeriodLocked}
                                                      title="Hapus baris manual ini"
                                                      className="px-1.5 py-0.5 bg-red-50 text-red-600 hover:bg-red-100 border border-red-200 rounded text-[10px] font-bold cursor-pointer inline-flex items-center gap-0.5 transition disabled:opacity-40"
                                                    >
                                                      <Trash2 className="w-3 h-3 inline text-red-600" />
                                                      Hapus
                                                    </button>
                                                  )}
                                                </>
                                              ) : (
                                                <button
                                                  type="button"
                                                  onClick={() => handleRemovePlayer(row.id, player.playerNo)}
                                                  disabled={isCurrentPeriodLocked}
                                                  title={`Hapus Player ${player.label}`}
                                                  className="p-1 text-red-600 hover:bg-red-50 rounded cursor-pointer"
                                                >
                                                  <Trash2 className="w-3 h-3" />
                                                </button>
                                              )}
                                            </div>
                                          </td>
                                        </tr>
                                      );
                                    })}
                                  </React.Fragment>
                                );
                              })}

                              {/* SUBTOTAL ROW FOR THIS JENIS */}
                              <tr className="bg-blue-100 text-blue-950 font-bold border-y-2 border-blue-300">
                                <td
                                  colSpan={5}
                                  style={{
                                    position: 'sticky',
                                    left: 0,
                                    zIndex: 20,
                                  }}
                                  className="px-3 py-1.5 border border-zinc-300 text-left uppercase font-black text-xs bg-blue-100 freeze-pane-divider-td"
                                >
                                  SUBTOTAL {grp.typeName}
                                </td>
                                <td colSpan={2} className="px-2 py-1.5 border border-zinc-300 text-center bg-blue-100">
                                  -
                                </td>
                                {columns.map((c) => {
                                  const sub = grp.colSubtotals[c.id];
                                  return (
                                    <React.Fragment key={'sub-col-' + c.id}>
                                      <td className="px-2 py-1.5 border border-zinc-300 text-center font-mono text-xs">
                                        {sub?.coin.toLocaleString('id-ID') || 0}
                                      </td>
                                      <td className="px-2 py-1.5 border border-zinc-300 text-right font-mono text-xs">
                                        {formatCurrencyNumber(sub?.revenue || 0)}
                                      </td>
                                    </React.Fragment>
                                  );
                                })}
                                <td className="px-2 py-1.5 border border-zinc-300 text-center font-mono text-xs font-black">
                                  {grp.subtotalTotalCoin.toLocaleString('id-ID')}
                                </td>
                                <td className="px-2 py-1.5 border border-zinc-300 text-right font-mono text-xs font-black">
                                  {formatCurrencyNumber(grp.subtotalTotalRevenue)}
                                </td>
                                <td colSpan={2} className="px-2 py-1.5 border border-zinc-300 text-center">
                                  -
                                </td>
                              </tr>
                            </React.Fragment>
                          );
                        })
                      )}
                    </tbody>

                    {/* GRAND TOTAL ROW (Sticky Bottom Freeze) */}
                    {rows.length > 0 && (
                      <tfoot className="sticky bottom-0 z-20 bg-[#1e3a8a] text-white font-extrabold border-t-2 border-blue-900 shadow-md">
                        <tr>
                          <td
                            colSpan={5}
                            style={
                              freezeMode71 !== 'none'
                                ? {
                                    position: 'sticky',
                                    left: 0,
                                    bottom: 0,
                                    zIndex: 40,
                                  }
                                : { bottom: 0 }
                            }
                            className={`px-3 py-2 border border-blue-900/40 text-left uppercase text-xs tracking-wider bg-[#1e3a8a] ${
                              freezeMode71 !== 'none' ? 'freeze-pane-divider-th frozen-col' : ''
                            }`}
                          >
                            GRAND TOTAL
                          </td>
                          <td colSpan={2} className="px-2 py-2 border border-blue-900/40 text-center text-white bg-[#1e3a8a]">
                            -
                          </td>
                          {columns.map((c) => {
                            const gt = grandTotal.colTotals[c.id];
                            return (
                              <React.Fragment key={'gt-col-' + c.id}>
                                <td className="px-2 py-2 border border-blue-900/40 text-center font-mono text-xs text-white bg-[#1e3a8a]">
                                  {gt?.coin.toLocaleString('id-ID') || 0}
                                </td>
                                <td className="px-2 py-2 border border-blue-900/40 text-right font-mono text-xs text-white bg-[#1e3a8a]">
                                  {formatCurrencyNumber(gt?.revenue || 0)}
                                </td>
                              </React.Fragment>
                            );
                          })}
                          <td className="px-2 py-2 border border-blue-900/40 text-center font-mono text-xs text-yellow-300 font-black bg-[#1e3a8a]">
                            {grandTotal.totalCoin.toLocaleString('id-ID')}
                          </td>
                          <td className="px-2 py-2 border border-blue-900/40 text-right font-mono text-xs text-yellow-300 font-black bg-[#1e3a8a]">
                            {formatCurrencyNumber(grandTotal.totalRevenue)}
                          </td>
                          <td colSpan={2} className="px-2 py-2 border border-blue-900/40 text-center text-white bg-[#1e3a8a]">
                            -
                          </td>
                        </tr>
                      </tfoot>
                    )}
                  </table>
                </div>
              </div>
            )}

            {/* Modal / Popover Pilih Tanggal (Bulan & Tahun Terkunci) */}
            {pickerColId !== null && (
              (() => {
                const activePickerCol = columns.find((c) => c.id === pickerColId);
                if (!activePickerCol) return null;
                const maxDays = new Date(activeYear, activeMonth, 0).getDate();

                return (
                  <div
                    className="fixed inset-0 z-50 bg-black/40 backdrop-blur-2xs flex items-center justify-center p-4"
                    onClick={() => setPickerColId(null)}
                  >
                    <div
                      className="bg-white rounded-2xl shadow-2xl border border-zinc-200 p-5 max-w-sm w-full text-zinc-900"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="flex items-center justify-between border-b pb-3 mb-3">
                        <div>
                          <h4 className="font-bold text-sm text-zinc-900 flex items-center gap-1.5">
                            <Calendar className="w-4 h-4 text-indigo-600" />
                            Pilih Tanggal PENDAPATAN {activePickerCol.id}
                          </h4>
                          <p className="text-[11px] text-zinc-500 font-medium mt-0.5">
                            Periode: <strong className="text-indigo-700 font-bold">{MONTH_NAMES[activeMonth - 1]} {activeYear}</strong> (Terkunci Sesuai Filter)
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => setPickerColId(null)}
                          className="text-zinc-400 hover:text-zinc-600 p-1 rounded-lg cursor-pointer"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>

                      <div className="space-y-3">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-semibold text-zinc-600">
                            Pilih Tanggal (1 s/d {maxDays}):
                          </span>
                          <span className="font-mono font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">
                            {activePickerCol.dateStr}
                          </span>
                        </div>

                        {/* Quick Day Grid */}
                        <div className="grid grid-cols-7 gap-1.5 p-2 bg-zinc-50 rounded-xl border border-zinc-200 text-center text-xs max-h-[220px] overflow-y-auto">
                          {Array.from({ length: maxDays }, (_, i) => i + 1).map((day) => {
                            const currentDayNum =
                              parseInt(activePickerCol.rawDate.split('-')[2], 10) || 1;
                            const isSelected = currentDayNum === day;
                            return (
                              <button
                                key={day}
                                type="button"
                                onClick={() => {
                                  handleSetColumnDay(activePickerCol.id, day);
                                  setPickerColId(null);
                                }}
                                className={`h-8 rounded-lg font-bold transition cursor-pointer text-xs ${
                                  isSelected
                                    ? 'bg-indigo-600 text-white shadow-xs scale-105'
                                    : 'bg-white hover:bg-indigo-50 hover:text-indigo-600 text-zinc-800 border border-zinc-200'
                                }`}
                              >
                                {day}
                              </button>
                            );
                          })}
                        </div>

                        {/* Manual Input Day */}
                        <div className="flex items-center gap-2 pt-2 border-t border-zinc-100">
                          <span className="text-xs font-semibold text-zinc-600">Input Hari:</span>
                          <input
                            type="number"
                            min={1}
                            max={maxDays}
                            defaultValue={parseInt(activePickerCol.rawDate.split('-')[2], 10) || 1}
                            onChange={(e) => {
                              const val = parseInt(e.target.value, 10);
                              if (!isNaN(val) && val >= 1 && val <= maxDays) {
                                handleSetColumnDay(activePickerCol.id, val);
                              }
                            }}
                            className="w-16 h-8 px-2 border rounded-lg text-center font-bold text-xs"
                          />
                          <button
                            type="button"
                            onClick={() => setPickerColId(null)}
                            className="ml-auto px-4 py-1.5 bg-indigo-600 text-white text-xs font-bold rounded-lg hover:bg-indigo-700 cursor-pointer shadow-xs"
                          >
                            Selesai
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })()
            )}
          </div>
        )}

        {/* ==================================================== */}
        {/* 7.2 LAPORAN PENDAPATAN MESIN TAB                     */}
        {/* ==================================================== */}
        {activeSubTab === 'laporan' && can72 && (
          <div className="p-4 space-y-4">
            {/* Filter Bar */}
            <div className="p-4 bg-zinc-50 border border-zinc-200 rounded-xl flex flex-wrap items-end justify-between gap-3">
              <div className="flex flex-wrap items-end gap-3">
                <div className="min-w-[240px]">
                  <MultiLocationFilter
                    locations={displayLocations}
                    selectedLocations={lapFilterLocations}
                    disabled={!isSuperAdmin && displayLocations.length === 1}
                    onChange={setLapFilterLocations}
                    label="KODE LOKASI"
                  />
                </div>

                <div className="min-w-[140px]">
                  <label className="text-[11px] font-bold text-zinc-700 block uppercase tracking-wider">
                    BULAN
                  </label>
                  <select
                    value={lapFilterMonth}
                    onChange={(e) => setLapFilterMonth(e.target.value)}
                    className="bg-white border-zinc-300 text-zinc-900 w-full mt-1 h-9 px-3 rounded-lg border text-xs"
                  >
                    {MONTH_NAMES.map((name, idx) => (
                      <option key={name} value={String(idx + 1)}>
                        {name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="min-w-[130px]">
                  <label className="text-[11px] font-bold text-zinc-700 block uppercase tracking-wider mb-1">
                    TAHUN
                  </label>
                  <YearFilterInput
                    value={lapFilterYear}
                    onChange={setLapFilterYear}
                    allowAll={false}
                  />
                </div>

                <button
                  type="button"
                  onClick={handleSearchLap}
                  className="inline-flex items-center justify-center gap-1.5 rounded-lg font-bold transition whitespace-nowrap h-9 px-5 text-xs bg-blue-600 text-white hover:bg-blue-700 cursor-pointer shadow-xs"
                >
                  CARI / TAMPILKAN
                </button>
              </div>

              {/* Action Buttons for 7.2 */}
              <div className="flex flex-wrap items-center gap-2">
                <FreezeColumnDropdown
                  value={freezeMode72}
                  options={MENU7_FREEZE_OPTIONS}
                  onChange={handleFreezeChange72}
                />
                <ResetButton72 />

                {can71 && hasButtonAccess('btn-edit-pendapatan-7.2') && (() => {
                  const firstLoc = lapActiveLocations.find((l) => l !== 'ALL') || locations[0]?.code || '';
                  const editUrl = `?tab=pendapatan-mesin&sub=input&loc=${encodeURIComponent(firstLoc)}&month=${encodeURIComponent(lapFilterMonth)}&year=${encodeURIComponent(lapFilterYear)}`;
                  return (
                    <a
                      href={editUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center justify-center gap-1.5 rounded-lg font-bold transition whitespace-nowrap h-9 px-4 text-xs bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 cursor-pointer shadow-xs no-underline"
                      title="Buka Edit Pendapatan di tab baru browser tanpa menutup halaman 7.2"
                    >
                      <Edit3 className="w-3.5 h-3.5" /> Edit Pendapatan
                    </a>
                  );
                })()}

                <button
                  type="button"
                  onClick={handleExportExcel72}
                  disabled={lapRows.length === 0 && rows.length === 0}
                  className="inline-flex items-center justify-center gap-1.5 rounded-lg font-bold transition whitespace-nowrap h-9 px-4 text-xs bg-emerald-700 text-white hover:bg-emerald-800 cursor-pointer shadow-xs disabled:opacity-50"
                >
                  <FileSpreadsheet className="w-4 h-4" /> Export Excel
                </button>
              </div>
            </div>

            {!lapHasSearched ? (
              <div className="p-8 text-center bg-zinc-50 border border-zinc-200 rounded-xl text-zinc-600">
                <FileSpreadsheet className="w-10 h-10 mx-auto text-zinc-400 mb-2 stroke-1" />
                <p className="text-sm font-semibold">Silakan pilih Kode Lokasi (bisa multi-select) dan Periode terlebih dahulu untuk melihat Laporan Pendapatan.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {/* Header text info: KODE LOKASI - NAMA LOKASI (BULAN TAHUN) + Jenis Spesifik Filter at top right */}
                <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-2.5 border border-zinc-200 rounded-lg">
                  {/* Left: Location & Period Text */}
                  <div className="text-xs font-bold text-zinc-900 tracking-wide">
                    Lokasi: <span className="text-indigo-700">{lapActiveLocations.length === locations.length ? 'SEMUA LOKASI' : lapActiveLocations.join(', ')}</span> ({MONTH_NAMES[lapActiveMonth - 1]} {lapActiveYear})
                  </div>

                  {/* Right: Kotak filter "Jenis Spesifik" dengan Checkbox Multi-Select seperti Kode Lokasi */}
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-bold text-zinc-600 whitespace-nowrap uppercase">
                      JENIS SPESIFIK:
                    </span>
                    <MultiSpecificTypeFilter
                      types={assetTypes.filter((t) => t.category === 'MESIN')}
                      selectedTypes={lapSpecificTypes}
                      onChange={setLapSpecificTypes}
                      className="min-w-[210px]"
                    />
                  </div>
                </div>

                {/* ==================================================== */}
                {/* 7.2 REPORT TABLE (Uniform Blue Header, Readonly)     */}
                {/* ==================================================== */}
                <div className="table-wrapper overflow-x-auto overflow-y-auto max-h-[75vh] border border-zinc-300 rounded-lg">
                  <table
                    ref={tableRef72}
                    className={`w-full text-xs border-collapse resizable-table ${
                      gridLines ? 'table-gridlines-active' : ''
                    }`}
                  >
                    <thead className="sticky top-0 z-20 bg-[#1e40af] text-white">
                      {/* Baris 1: Header Utama */}
                      <tr className="border-b border-blue-900/60">
                        <th
                          rowSpan={2}
                          style={getStickyStyle72(0, true)}
                          className={`px-2.5 py-2 font-bold border border-blue-900/40 text-center align-middle whitespace-nowrap min-w-[90px] ${getStickyClass72(0, true)}`}
                        >
                          KODE<br />LOKASI
                        </th>
                        <th
                          rowSpan={2}
                          style={getStickyStyle72(1, true)}
                          className={`px-2 py-2 font-bold border border-blue-900/40 text-center align-middle whitespace-nowrap min-w-[45px] ${getStickyClass72(1, true)}`}
                        >
                          NO
                        </th>
                        <th
                          rowSpan={2}
                          style={getStickyStyle72(2, true)}
                          className={`px-3 py-2 font-bold border border-blue-900/40 text-center align-middle min-w-[240px] ${getStickyClass72(2, true)}`}
                        >
                          NAMA ASET
                        </th>
                        <th
                          rowSpan={2}
                          style={getStickyStyle72(3, true)}
                          className={`px-2 py-2 font-bold border border-blue-900/40 text-center align-middle whitespace-nowrap min-w-[70px] ${getStickyClass72(3, true)}`}
                        >
                          JENIS
                        </th>
                        <th
                          rowSpan={2}
                          style={getStickyStyle72(4, true)}
                          className={`px-2 py-2 font-bold border border-blue-900/40 text-center align-middle whitespace-nowrap min-w-[120px] ${getStickyClass72(4, true)}`}
                        >
                          KODE ASET
                        </th>
                        <th
                          rowSpan={2}
                          className="px-2 py-2 font-bold border border-blue-900/40 text-center align-middle whitespace-nowrap min-w-[100px]"
                        >
                          TANGGAL<br />MASUK ASET
                        </th>
                        <th
                          rowSpan={2}
                          className="px-2 py-2 font-bold border border-blue-900/40 text-center align-middle whitespace-nowrap min-w-[100px]"
                        >
                          TANGGAL<br />KELUAR ASET
                        </th>

                        {/* Dynamic PENDAPATAN Columns */}
                        {lapColumns.map((col) => (
                          <th
                            key={col.id}
                            colSpan={2}
                            className="px-2 py-1.5 font-bold border border-blue-900/40 text-center align-middle whitespace-nowrap min-w-[190px]"
                          >
                            <div className="flex items-center justify-center gap-1.5 text-white">
                              <span>PENDAPATAN</span>
                              <span className="text-yellow-300 font-extrabold tracking-wide">
                                {col.id} : {col.dateStr}
                              </span>
                            </div>
                          </th>
                        ))}

                        <th
                          rowSpan={2}
                          className="px-2.5 py-2 font-bold border border-blue-900/40 text-center align-middle whitespace-nowrap min-w-[100px]"
                        >
                          TOTAL QTY COIN/TAP
                        </th>
                        <th
                          rowSpan={2}
                          className="px-3 py-2 font-bold border border-blue-900/40 text-center align-middle whitespace-nowrap min-w-[140px]"
                        >
                          TOTAL PENDAPATAN
                        </th>
                        <th
                          rowSpan={2}
                          className="px-3 py-2 font-bold border border-blue-900/40 text-center align-middle min-w-[160px]"
                        >
                          KETERANGAN
                        </th>
                      </tr>

                      {/* Baris 2: Sub-header */}
                      <tr className="border-b border-blue-900/60 bg-[#1d4ed8] text-white">
                        {lapColumns.map((col) => (
                          <React.Fragment key={'lap-sub-' + col.id}>
                            <th className="px-2 py-1 font-bold border border-blue-900/40 text-center whitespace-nowrap min-w-[80px]">
                              QTY COIN/TAP
                            </th>
                            <th className="px-2 py-1 font-bold border border-blue-900/40 text-center whitespace-nowrap min-w-[110px]">
                              PENDAPATAN
                            </th>
                          </React.Fragment>
                        ))}
                      </tr>
                    </thead>

                    <tbody>
                      {lapRows.length === 0 ? (
                        <tr>
                          <td
                            colSpan={10 + lapColumns.length * 2}
                            className="p-8 text-center text-zinc-500 italic bg-white"
                          >
                            Belum ada data pendapatan untuk periode ini. Pilih lokasi & periode lalu klik CARI / TAMPILKAN.
                          </td>
                        </tr>
                      ) : (
                        lapGroupedData.map((grp) => {
                          let groupRunningNo = 1;
                          return (
                            <React.Fragment key={'lap-grp-' + grp.typeKey}>
                              {grp.rows.map((row) => {
                                if (row.hidden) return null; // Exclude hidden rows from 7.2
                                const rowTotals = computeRowTotals(row);
                                const hasMultiplePlayers = row.players.length > 1;

                                return (
                                  <React.Fragment key={'lap-row-' + row.id}>
                                    {row.players.map((player, pIdx) => {
                                      const isFirstPlayer = pIdx === 0;

                                      return (
                                        <tr
                                          key={'lap-' + row.id + '-p-' + player.playerNo}
                                          className="border-b border-black hover:bg-blue-50/40 bg-white"
                                        >
                                          {/* Merged Columns if multiple players */}
                                          {isFirstPlayer && (
                                            <>
                                              <td
                                                rowSpan={hasMultiplePlayers ? row.players.length : 1}
                                                style={getStickyStyle72(0, false)}
                                                className={`px-2 py-1.5 border border-black text-center font-bold font-mono text-[11px] align-middle ${getStickyClass72(0, false)}`}
                                              >
                                                {row.locationCode}
                                              </td>
                                              <td
                                                rowSpan={hasMultiplePlayers ? row.players.length : 1}
                                                style={getStickyStyle72(1, false)}
                                                className={`px-1.5 py-1.5 border border-black text-center font-mono text-[11px] text-zinc-500 align-middle ${getStickyClass72(1, false)}`}
                                              >
                                                {groupRunningNo++}
                                              </td>
                                            </>
                                          )}

                                          {/* NAMA ASET */}
                                          <td
                                            style={getStickyStyle72(2, false)}
                                            className={`px-2.5 py-1.5 border border-black align-middle font-medium ${getStickyClass72(2, false)}`}
                                          >
                                            {hasMultiplePlayers
                                              ? `${row.assetName} (${player.label})`
                                              : row.assetName}
                                          </td>

                                          {/* Merged JENIS, KODE ASET, TGL MASUK, TGL KELUAR */}
                                          {isFirstPlayer && (
                                            <>
                                              <td
                                                rowSpan={hasMultiplePlayers ? row.players.length : 1}
                                                style={getStickyStyle72(3, false)}
                                                className={`px-2 py-1.5 border border-black text-center font-bold text-[11px] align-middle ${getStickyClass72(3, false)}`}
                                              >
                                                {row.typeCode}
                                              </td>
                                              <td
                                                rowSpan={hasMultiplePlayers ? row.players.length : 1}
                                                style={getStickyStyle72(4, false)}
                                                className={`px-2 py-1.5 border border-black font-mono text-[11px] font-medium align-middle ${getStickyClass72(4, false)}`}
                                              >
                                                {row.assetCode}
                                              </td>
                                              <td
                                                rowSpan={hasMultiplePlayers ? row.players.length : 1}
                                                className="px-2 py-1.5 border border-black text-center font-mono text-[11px] align-middle bg-inherit"
                                              >
                                                {row.entryDate}
                                              </td>
                                              <td
                                                rowSpan={hasMultiplePlayers ? row.players.length : 1}
                                                className="px-2 py-1.5 border border-black text-center font-mono text-[11px] align-middle bg-inherit"
                                              >
                                                {row.exitDate}
                                              </td>
                                            </>
                                          )}

                                          {/* Dynamic Columns (Readonly) */}
                                          {lapColumns.map((c) => {
                                            const cellVal = player.values[c.id];
                                            const coinVal = cellVal?.coin ? parseInt(cellVal.coin, 10).toLocaleString('id-ID') : '-';
                                            const revVal = cellVal?.revenue ? formatCurrencyNumber(parseNum(cellVal.revenue)) : '-';
                                            return (
                                              <React.Fragment key={'lap-c-' + c.id}>
                                                <td className="px-2 py-1.5 border border-black text-center font-mono text-xs">
                                                  {coinVal}
                                                </td>
                                                <td className="px-2 py-1.5 border border-black text-right font-mono text-xs">
                                                  {revVal}
                                                </td>
                                              </React.Fragment>
                                            );
                                          })}

                                          {/* Merged TOTAL COIN & TOTAL PENDAPATAN */}
                                          {isFirstPlayer && (
                                            <>
                                              <td
                                                rowSpan={hasMultiplePlayers ? row.players.length : 1}
                                                className="px-2 py-1.5 border border-black text-center font-mono font-bold text-xs bg-[#fef08a] text-zinc-900 align-middle"
                                              >
                                                {rowTotals.totalCoin.toLocaleString('id-ID')}
                                              </td>
                                              <td
                                                rowSpan={hasMultiplePlayers ? row.players.length : 1}
                                                className="px-2 py-1.5 border border-black text-right font-mono font-bold text-xs bg-[#fef08a] text-zinc-900 align-middle"
                                              >
                                                {formatCurrencyNumber(rowTotals.totalRevenue)}
                                              </td>
                                            </>
                                          )}

                                          {/* KETERANGAN */}
                                          <td className="px-2 py-1.5 border border-black text-zinc-700 text-xs align-middle">
                                            {player.notes || '-'}
                                          </td>
                                        </tr>
                                      );
                                    })}
                                  </React.Fragment>
                                );
                              })}

                              {/* SUBTOTAL ROW PER JENIS */}
                              <tr className="bg-blue-100 text-blue-950 font-bold border-y-2 border-blue-300">
                                <td
                                  colSpan={5}
                                  style={{
                                    position: 'sticky',
                                    left: 0,
                                    zIndex: 20,
                                  }}
                                  className="px-3 py-1.5 border border-zinc-300 text-left uppercase font-black text-xs bg-blue-100 freeze-pane-divider-td"
                                >
                                  SUBTOTAL {grp.typeName}
                                </td>
                                <td colSpan={2} className="px-2 py-1.5 border border-zinc-300 text-center bg-blue-100">
                                  -
                                </td>
                                {lapColumns.map((c) => {
                                  const sub = grp.colSubtotals[c.id];
                                  return (
                                    <React.Fragment key={'lap-sub-col-' + c.id}>
                                      <td className="px-2 py-1.5 border border-zinc-300 text-center font-mono text-xs">
                                        {sub?.coin.toLocaleString('id-ID') || 0}
                                      </td>
                                      <td className="px-2 py-1.5 border border-zinc-300 text-right font-mono text-xs">
                                        {formatCurrencyNumber(sub?.revenue || 0)}
                                      </td>
                                    </React.Fragment>
                                  );
                                })}
                                <td className="px-2 py-1.5 border border-zinc-300 text-center font-mono text-xs font-black">
                                  {grp.subtotalTotalCoin.toLocaleString('id-ID')}
                                </td>
                                <td className="px-2 py-1.5 border border-zinc-300 text-right font-mono text-xs font-black">
                                  {formatCurrencyNumber(grp.subtotalTotalRevenue)}
                                </td>
                                <td className="px-2 py-1.5 border border-zinc-300 text-center">
                                  -
                                </td>
                              </tr>
                            </React.Fragment>
                          );
                        })
                      )}

                    </tbody>

                    {/* GRAND TOTAL ROW (Sticky Bottom Freeze) */}
                    {lapRows.length > 0 && (
                      <tfoot className="sticky bottom-0 z-20 bg-[#1e3a8a] text-white font-extrabold border-t-2 border-blue-950 shadow-md">
                        <tr>
                          <td
                            colSpan={5}
                            style={
                              freezeMode72 !== 'none'
                                ? {
                                    position: 'sticky',
                                    left: 0,
                                    bottom: 0,
                                    zIndex: 40,
                                  }
                                : { bottom: 0 }
                            }
                            className={`px-3 py-2 border border-blue-900/50 text-left uppercase text-xs tracking-wider bg-[#1e3a8a] ${
                              freezeMode72 !== 'none' ? 'freeze-pane-divider-th frozen-col' : ''
                            }`}
                          >
                            GRAND TOTAL
                          </td>
                          <td colSpan={2} className="px-2 py-2 border border-blue-900/50 text-center text-white bg-[#1e3a8a]">
                            -
                          </td>
                          {lapColumns.map((c) => {
                            const gt = lapGrandTotal.colTotals[c.id];
                            return (
                              <React.Fragment key={'lap-gt-col-' + c.id}>
                                <td className="px-2 py-2 border border-blue-900/50 text-center font-mono text-xs text-white">
                                  {gt?.coin.toLocaleString('id-ID') || 0}
                                </td>
                                <td className="px-2 py-2 border border-blue-900/50 text-right font-mono text-xs text-white">
                                  {formatCurrencyNumber(gt?.revenue || 0)}
                                </td>
                              </React.Fragment>
                            );
                          })}
                          <td className="px-2 py-2 border border-blue-900/50 text-center font-mono text-xs text-yellow-300 font-black">
                            {lapGrandTotal.totalCoin.toLocaleString('id-ID')}
                          </td>
                          <td className="px-2 py-2 border border-blue-900/50 text-right font-mono text-xs text-yellow-300 font-black">
                            {formatCurrencyNumber(lapGrandTotal.totalRevenue)}
                          </td>
                          <td className="px-2 py-2 border border-blue-900/50 text-center text-white">
                            -
                          </td>
                        </tr>
                      </tfoot>
                    )}
                  </table>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
