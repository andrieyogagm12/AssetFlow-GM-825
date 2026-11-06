import React, { useState, useRef, useMemo, useEffect } from 'react';
import { useAssets } from '../context/AssetContext';
import { Asset, AssetCategory } from '../types/asset';
import {
  parseExcelFileWithImages,
  parseExcelDate,
  downloadTemplateHapusAset,
  downloadTemplateRotasiKeluar,
} from '../utils/excelExport';
import { PhotoModal } from '../components/PhotoModal';
import { formatDdMmmYy, formatCurrencyDecimal2, formatRupiahDecimal2 } from '../utils/dateFormatter';
import { useResizableTable } from '../utils/useResizableTable';
import { YearFilterInput } from '../components/YearFilterInput';
import {
  Plus,
  Trash2,
  Upload,
  Lock,
  Unlock,
  Check,
  X,
  Search,
  RotateCw,
  FileSpreadsheet,
  AlertTriangle,
  FileDown,
  FileCheck,
} from 'lucide-react';

interface ViewAktivitasProps {
  initialSubTab?: 'input' | 'edit' | 'hapus' | 'rotasi' | 'tutup';
  initialAssetCode?: string;
}

interface InputRowState {
  id: string;
  locationCode: string;
  name: string;
  photoUrl?: string;
  typeCode: string;
  code: string;
  costActual: string;
  costExcel: string;
  supplier: string;
  buyDate: string;
  readerTap: string;
  readerSwipe: string;
  playPrice: string;
  entryDate: string;
  notes: string;
}

interface EditRowState {
  id: string;
  code: string;
  locationCode: string;
  name: string;
  photoUrl?: string;
  typeCode: string;
  costActual: string;
  costExcel: string;
  supplier: string;
  buyDate: string;
  readerTap: string;
  readerSwipe: string;
  playPrice: string;
  entryDate: string;
  notes: string;
}

interface DeleteRowState {
  id: string;
  code: string;
  locationCode: string;
  name: string;
  typeCode: string;
  costActual: string;
  costExcel: string;
  supplier: string;
  buyDate: string;
  readerTap: string;
  readerSwipe: string;
  playPrice: string;
  entryDate: string;
  deleteDate: string;
  notes: string;
}

interface RotationOutRowState {
  id: string;
  code: string;
  name: string;
  typeCode: string;
  fromLocationCode: string;
  toLocationCode: string;
  exitDate: string;
  readerTap: string;
  readerSwipe: string;
}

const MONTH_NAMES = [
  'JANUARI', 'FEBRUARI', 'MARET', 'APRIL', 'MEI', 'JUNI',
  'JULI', 'AGUSTUS', 'SEPTEMBER', 'OKTOBER', 'NOVEMBER', 'DESEMBER'
];

export const ViewAktivitas: React.FC<ViewAktivitasProps> = ({
  initialSubTab = 'input',
  initialAssetCode = '',
}) => {
  const {
    locations,
    assetTypes,
    assets,
    rotations,
    periodLocks,
    gridLines,
    toggleGridLines,
    addToast,
    addAssets,
    updateAsset,
    deleteAsset,
    createRotationOut,
    confirmRotationIn,
    deleteRotationHistory,
    setPeriodLock,
    isPeriodLocked,
    currentUser,
    hasMenuAccess,
    hasButtonAccess,
    allowedLocations,
    validateAssetAccess,
    isLocationAllowed,
    isSuperAdmin,
    hasColumnAccess,
  } = useAssets();

  const showNilaiPasti42 = hasColumnAccess('col-nilai-pasti-4.2');
  const showNilaiExcel42 = hasColumnAccess('col-nilai-excel-4.2');
  const showSupplier42 = hasColumnAccess('col-supplier-4.2');
  const canAksi45 = hasButtonAccess('btn-buka-aksi-4.5') && hasColumnAccess('col-aksi-4.5');

  const isAdmin = currentUser?.akses === 'ADMIN' || currentUser?.akses === 'ADMINISTRATOR';

  // Role check: Only "Akunting" or "Akunting Pusat" or "ADMIN" can see and access "Isi tabel dari Excel"
  const isAkuntingRole = useMemo(() => {
    if (!currentUser) return false;
    const akses = (currentUser.akses || '').toUpperCase();
    const nama = (currentUser.namaUser || '').toUpperCase();
    return (
      akses === 'ADMIN' ||
      akses === 'ADMINISTRATOR' ||
      akses === 'AKUNTING' ||
      akses === 'AKUNTING PUSAT' ||
      nama === 'ADMIN' ||
      nama === 'AKUNTING' ||
      nama === 'AKUNTING PUSAT' ||
      nama.includes('AKUNTING')
    );
  }, [currentUser]);

  const can41 = isAdmin || hasMenuAccess('menu-4.1');
  const can42 = isAdmin || hasMenuAccess('menu-4.2');
  const can43 = isAdmin || hasMenuAccess('menu-4.3');
  const can44 = isAdmin || hasMenuAccess('menu-4.4');
  const can45 = isAdmin || hasMenuAccess('menu-4.5');

  const getFirstAllowedSubTab = (): 'input' | 'edit' | 'hapus' | 'rotasi' | 'tutup' => {
    if (initialSubTab === 'input' && can41) return 'input';
    if (initialSubTab === 'edit' && can42) return 'edit';
    if (initialSubTab === 'hapus' && can43) return 'hapus';
    if (initialSubTab === 'rotasi' && can44) return 'rotasi';
    if (initialSubTab === 'tutup' && can45) return 'tutup';
    if (can41) return 'input';
    if (can42) return 'edit';
    if (can43) return 'hapus';
    if (can44) return 'rotasi';
    if (can45) return 'tutup';
    return 'input';
  };

  const [activeSubTab, setActiveSubTab] = useState<'input' | 'edit' | 'hapus' | 'rotasi' | 'tutup'>(
    getFirstAllowedSubTab
  );

  useEffect(() => {
    if (activeSubTab === 'input' && !can41) {
      if (can42) setActiveSubTab('edit');
      else if (can43) setActiveSubTab('hapus');
      else if (can44) setActiveSubTab('rotasi');
      else if (can45) setActiveSubTab('tutup');
    } else if (activeSubTab === 'edit' && !can42) {
      if (can41) setActiveSubTab('input');
      else if (can43) setActiveSubTab('hapus');
      else if (can44) setActiveSubTab('rotasi');
      else if (can45) setActiveSubTab('tutup');
    } else if (activeSubTab === 'hapus' && !can43) {
      if (can41) setActiveSubTab('input');
      else if (can42) setActiveSubTab('edit');
      else if (can44) setActiveSubTab('rotasi');
      else if (can45) setActiveSubTab('tutup');
    } else if (activeSubTab === 'rotasi' && !can44) {
      if (can41) setActiveSubTab('input');
      else if (can42) setActiveSubTab('edit');
      else if (can43) setActiveSubTab('hapus');
      else if (can45) setActiveSubTab('tutup');
    } else if (activeSubTab === 'tutup' && !can45) {
      if (can41) setActiveSubTab('input');
      else if (can42) setActiveSubTab('edit');
      else if (can43) setActiveSubTab('hapus');
      else if (can44) setActiveSubTab('rotasi');
    }
  }, [activeSubTab, can41, can42, can43, can44, can45]);
  const [activeRotationSubTab, setActiveRotationSubTab] = useState<'keluar' | 'masuk'>('keluar');

  // Resizable table hooks for all subtabs
  const { tableRef: tableRefInput, ResetButton: ResetButtonInput } = useResizableTable({
    storageKey: 'assetflow_table_resize_4_1_input',
  });
  const { tableRef: tableRefEdit, ResetButton: ResetButtonEdit } = useResizableTable({
    storageKey: 'assetflow_table_resize_4_2_edit',
  });
  const { tableRef: tableRefHapus, ResetButton: ResetButtonHapus } = useResizableTable({
    storageKey: 'assetflow_table_resize_4_3_hapus',
  });
  const { tableRef: tableRefRotOut, ResetButton: ResetButtonRotOut } = useResizableTable({
    storageKey: 'assetflow_table_resize_4_4_rotout',
  });
  const { tableRef: tableRefRotHist, ResetButton: ResetButtonRotHist } = useResizableTable({
    storageKey: 'assetflow_table_resize_4_4_rothist',
  });
  const { tableRef: tableRefRotIn, ResetButton: ResetButtonRotIn } = useResizableTable({
    storageKey: 'assetflow_table_resize_4_4_rotin',
  });
  const { tableRef: tableRefTutup, ResetButton: ResetButtonTutup } = useResizableTable({
    storageKey: 'assetflow_table_resize_4_5_tutup',
  });

  const todayStr = useMemo(() => new Date().toISOString().slice(0, 10), []);

  const [previewPhoto, setPreviewPhoto] = useState<{ url: string; title: string; code?: string } | null>(null);

  // ----------------------------------------------------
  // 4.1 INPUT STATE
  // ----------------------------------------------------
  const [inputRows, setInputRows] = useState<InputRowState[]>(() => [
    {
      id: 'row-1',
      locationCode: allowedLocations[0]?.code || 'BECO',
      name: '',
      photoUrl: '',
      typeCode: '',
      code: '',
      costActual: '',
      costExcel: '',
      supplier: '',
      buyDate: '',
      readerTap: '',
      readerSwipe: '',
      playPrice: '',
      entryDate: todayStr,
      notes: '',
    },
  ]);
  const [overwriteCode, setOverwriteCode] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleAddInputRow = () => {
    setInputRows((prev) => [
      ...prev,
      {
        id: 'row-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5),
        locationCode: prev[prev.length - 1]?.locationCode || 'BECO',
        name: '',
        photoUrl: '',
        typeCode: '',
        code: '',
        costActual: '',
        costExcel: '',
        supplier: '',
        buyDate: '',
        readerTap: '',
        readerSwipe: '',
        playPrice: '',
        entryDate: todayStr,
        notes: '',
      },
    ]);
  };

  const handleRemoveInputRow = (id?: string) => {
    if (inputRows.length <= 1) {
      addToast('Minimal harus ada 1 baris input', 'warning');
      return;
    }
    if (id) {
      setInputRows((prev) => prev.filter((r) => r.id !== id));
    } else {
      setInputRows((prev) => prev.slice(0, -1));
    }
  };

  const updateInputRow = (id: string, field: keyof InputRowState, value: string) => {
    setInputRows((prev) =>
      prev.map((row) => {
        if (row.id !== id) return row;
        const updated = { ...row, [field]: value };

        // Auto generate asset code suggestion if location or type changes and code is empty or generated
        if ((field === 'locationCode' || field === 'typeCode') && updated.locationCode && updated.typeCode) {
          if (!row.code || row.code.startsWith(row.locationCode)) {
            const loc = updated.locationCode;
            const typ = updated.typeCode;
            const existingCount = assets.filter((a) => a.locationCode === loc && a.typeCode === typ).length + 1;
            const seqStr = String(existingCount).padStart(3, '0');
            updated.code = `${loc}${typ}${seqStr}`;
          }
        }
        return updated;
      })
    );
  };

  const handleSaveInput = () => {
    const validRows = inputRows.filter((r) => r.name.trim() !== '' && r.code.trim() !== '');
    if (validRows.length === 0) {
      addToast('Harap isi minimal Nama Aset dan Kode Aset sebelum menyimpan', 'warning');
      return;
    }

    const itemsToSave = validRows.map((r) => {
      const typeObj = assetTypes.find((t) => t.code === r.typeCode);
      const category: AssetCategory = typeObj ? typeObj.category : 'MESIN';

      return {
        locationCode: r.locationCode || 'BECO',
        name: r.name.trim(),
        photoUrl: r.photoUrl || undefined,
        typeCode: r.typeCode || 'OT',
        category,
        code: r.code.trim().toUpperCase(),
        costActual:
          r.costActual && r.costActual.trim() !== ''
            ? (() => {
                const n = parseFloat(r.costActual.replace(/\./g, '').replace(/,/g, '.').replace(/[^0-9.-]/g, ''));
                return isNaN(n) || n <= 0 ? undefined : n;
              })()
            : undefined,
        costExcel:
          r.costExcel && r.costExcel.trim() !== ''
            ? (() => {
                const n = parseFloat(r.costExcel.replace(/\./g, '').replace(/,/g, '.').replace(/[^0-9.-]/g, ''));
                return isNaN(n) || n <= 0 ? undefined : n;
              })()
            : undefined,
        supplier: r.supplier && r.supplier.trim() !== '-' ? r.supplier.trim() : undefined,
        buyDate: r.buyDate && r.buyDate.trim() !== '-' ? r.buyDate : undefined,
        readerTap: r.readerTap && r.readerTap.trim() !== '-' ? r.readerTap.trim() : undefined,
        readerSwipe: r.readerSwipe && r.readerSwipe.trim() !== '-' ? r.readerSwipe.trim() : undefined,
        playPrice:
          r.playPrice && r.playPrice.trim() !== ''
            ? (() => {
                const n = parseFloat(r.playPrice.replace(/\./g, '').replace(/,/g, '.').replace(/[^0-9.-]/g, ''));
                return isNaN(n) ? undefined : n;
              })()
            : undefined,
        entryDate: r.entryDate || todayStr,
        notes: r.notes.trim() || undefined,
      };
    });

    addAssets(itemsToSave, overwriteCode);

    // Reset rows to 1 fresh row
    setInputRows([
      {
        id: 'row-1',
        locationCode: validRows[0].locationCode,
        name: '',
        photoUrl: '',
        typeCode: '',
        code: '',
        costActual: '',
        costExcel: '',
        supplier: '',
        buyDate: '',
        readerTap: '',
        readerSwipe: '',
        playPrice: '',
        entryDate: todayStr,
        notes: '',
      },
    ]);
  };

  const handleUploadImageForRow = (rowId: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (loadEvent) => {
      const dataUrl = loadEvent.target?.result as string;
      if (dataUrl) {
        updateInputRow(rowId, 'photoUrl', dataUrl);
      }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleUploadImageForEditRow = (rowId: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (loadEvent) => {
      const dataUrl = loadEvent.target?.result as string;
      if (dataUrl) {
        setEditRows((prev) =>
          prev.map((r) => (r.id === rowId ? { ...r, photoUrl: dataUrl } : r))
        );
      }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleImportExcelInput = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    try {
      const rows = await parseExcelFileWithImages(files[0]);
      if (rows.length === 0) {
        addToast('File Excel kosong atau format tidak sesuai', 'warning');
        return;
      }

      const parsed: InputRowState[] = rows.map((rowObj, idx) => {
        const item = rowObj.data || {};

        // Helper to find raw value by multiple possible key variations
        const getRawVal = (keys: string[]): unknown => {
          // 1. Direct match
          for (const k of keys) {
            if (item[k] !== undefined && item[k] !== null && item[k] !== '') return item[k];
          }
          // 2. Case-insensitive and trimmed match
          const itemKeys = Object.keys(item);
          for (const target of keys) {
            const cleanTarget = target.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
            const matchedKey = itemKeys.find(
              (k) =>
                k.trim().toUpperCase() === target.trim().toUpperCase() ||
                k.trim().toUpperCase().replace(/[^A-Z0-9]/g, '') === cleanTarget
            );
            if (matchedKey && item[matchedKey] !== undefined && item[matchedKey] !== null && item[matchedKey] !== '') {
              return item[matchedKey];
            }
          }
          return undefined;
        };

        const getVal = (keys: string[]): string => {
          const val = getRawVal(keys);
          if (val === undefined || val === null) return '';
          return String(val).trim();
        };

        // Helper to check if value is empty or placeholder ("-", "0", "Rp 0,00", "null", "undefined", etc.)
        const isBlankOrPlaceholder = (val: unknown): boolean => {
          if (val === undefined || val === null) return true;
          const str = String(val).trim();
          if (!str) return true;
          const upper = str.toUpperCase().replace(/\s+/g, '');
          if (
            upper === '-' ||
            upper === '--' ||
            upper === '---' ||
            upper === 'NULL' ||
            upper === 'UNDEFINED' ||
            upper === 'N/A' ||
            upper === 'NA' ||
            upper === 'NONE' ||
            upper === 'KOSONG' ||
            upper === '0' ||
            upper === '0,00' ||
            upper === '0.00' ||
            upper === 'RP0' ||
            upper === 'RP0,00' ||
            upper === 'RP0.00' ||
            upper === 'RP-' ||
            upper === 'RP.-' ||
            upper === 'RP.0' ||
            upper === 'RP.0,00' ||
            upper === 'IDR0' ||
            upper === 'IDR0.00'
          ) {
            return true;
          }
          return false;
        };

        const cleanCurrencyVal = (rawVal: unknown): string => {
          if (isBlankOrPlaceholder(rawVal)) return '';
          const str = String(rawVal).trim();
          const cleanNum = str.replace(/\./g, '').replace(/,/g, '.').replace(/[^0-9.-]/g, '');
          const num = parseFloat(cleanNum);
          if (isNaN(num) || num <= 0) return '';
          return str;
        };

        const cleanTextVal = (rawVal: unknown): string => {
          if (isBlankOrPlaceholder(rawVal)) return '';
          const str = String(rawVal).trim();
          return str;
        };

        const loc =
          getVal(['LOKASI', 'KODE LOKASI', 'KODE_LOKASI', 'locationCode', 'CABANG']) || 'BECO';
        const name =
          getVal(['NAMA', 'NAMA ASET', 'NAMA_ASET', 'NAMA ASSET', 'name', 'ASSET NAME']) ||
          `Aset Import ${idx + 1}`;
        const code =
          getVal(['KODE', 'KODE ASET', 'KODE_ASET', 'KODE ASSET', 'code', 'ASSET CODE']) ||
          `IMP${idx + 1}`;
        const typeCode =
          getVal(['JENIS', 'JENIS SPESIFIK', 'typeCode', 'TYPE']) || 'OT';

        // 1. NILAI PEROLEHAN PASTI / NILAI PEROLEHAN
        const rawCostActual = getRawVal([
          'NILAI PEROLEHAN PASTI',
          'NILAI PEROLEHAN',
          'NILAI_PEROLEHAN_PASTI',
          'NILAI_PEROLEHAN',
          'costActual',
          'HARGA PEROLEHAN',
          'HARGA_PEROLEHAN',
          'PEROLEHAN PASTI',
        ]);
        const costActual = cleanCurrencyVal(rawCostActual);

        // 2. NILAI PEROLEHAN EXCEL
        const rawCostExcel = getRawVal([
          'NILAI PEROLEHAN EXCEL',
          'NILAI EXCEL',
          'NILAI_PEROLEHAN_EXCEL',
          'NILAI_EXCEL',
          'costExcel',
          'PEROLEHAN EXCEL',
        ]);
        const costExcel = cleanCurrencyVal(rawCostExcel);

        // 3. SUPPLIER
        const rawSupplier = getRawVal([
          'SUPPLIER',
          'VENDOR',
          'supplier',
          'PEMASOK',
          'DISTRIBUTOR',
        ]);
        const supplier = cleanTextVal(rawSupplier);

        // 4. TANGGAL BELI: jika kosong / '-' dikosongkan (jangan diisi tanggal hari ini)
        const rawBuyDate = getRawVal([
          'TANGGAL BELI',
          'TGL BELI',
          'TGL. BELI',
          'TGL_BELI',
          'TANGGAL PEMBELIAN',
          'buyDate',
          'BUY DATE',
          'TGL BELI ASET',
        ]);
        const buyDate = isBlankOrPlaceholder(rawBuyDate) ? '' : parseExcelDate(rawBuyDate, '');

        // TANGGAL MASUK: jika tidak ada tanggal masuk di Excel, default ke todayStr
        const rawEntryDate = getRawVal([
          'TANGGAL MASUK',
          'TGL MASUK',
          'TGL. MASUK',
          'TGL_MASUK',
          'entryDate',
          'ENTRY DATE',
          'TGL MASUK ASET',
        ]);
        const entryDate = parseExcelDate(rawEntryDate, todayStr);

        // 5. READER TAP
        const rawReaderTap = getRawVal([
          'READER TAP',
          'TAP',
          'readerTap',
          'TAP READER',
          'TAP_READER',
        ]);
        const readerTap = cleanTextVal(rawReaderTap);

        // 6. READER SWIPE
        const rawReaderSwipe = getRawVal([
          'READER SWIPE',
          'SWIPE',
          'readerSwipe',
          'SWP',
          'SWIPE READER',
          'SWIPE_READER',
        ]);
        const readerSwipe = cleanTextVal(rawReaderSwipe);

        // HARGA BERMAIN
        const rawPlayPrice = getRawVal([
          'HARGA BERMAIN',
          'HARGA BERMAIN (RP)',
          'HARGA BERMAIN (IDR)',
          'HARGA_BERMAIN',
          'HARGA MAIN',
          'HARGA MAIN (RP)',
          'HARGA_MAIN',
          'playPrice',
          'PLAY PRICE',
          'PLAY_PRICE',
          'TARIF BERMAIN',
          'TARIF MAIN',
          'TARIF',
        ]);
        const playPrice = cleanCurrencyVal(rawPlayPrice);

        // 7. KETERANGAN
        const rawNotes = getRawVal([
          'KETERANGAN',
          'KET',
          'notes',
          'NOTES',
          'REMARKS',
          'CATATAN',
        ]);
        const notes = cleanTextVal(rawNotes);

        // Extract photo from Embed into cell / drawing or text
        const photoUrl =
          rowObj.photoUrl ||
          getVal(['FOTO', 'FOTO FISIK', 'GAMBAR', 'PHOTO', 'IMAGE', 'PICTURE', 'photoUrl']) ||
          '';

        return {
          id: 'imp-' + idx + '-' + Date.now(),
          locationCode: loc,
          name,
          photoUrl,
          typeCode,
          code,
          costActual,
          costExcel,
          supplier,
          buyDate,
          readerTap,
          readerSwipe,
          playPrice,
          entryDate,
          notes,
        };
      });

      setInputRows(parsed);
      const withPhotos = parsed.filter((r) => !!r.photoUrl).length;
      addToast(
        `Berhasil membaca ${parsed.length} baris data dari Excel${withPhotos > 0 ? ` (${withPhotos} foto fisik terdeteksi)` : ''}`,
        'success'
      );
    } catch (err) {
      console.error(err);
      addToast('Gagal memproses file Excel', 'error');
    } finally {
      if (e.target) e.target.value = '';
    }
  };

  // ----------------------------------------------------
  // 4.2 EDIT STATE
  // ----------------------------------------------------
  const [editRows, setEditRows] = useState<EditRowState[]>([
    {
      id: 'edit-1',
      code: initialAssetCode,
      locationCode: '',
      name: '',
      photoUrl: '',
      typeCode: '',
      costActual: '',
      costExcel: '',
      supplier: '',
      buyDate: '',
      readerTap: '',
      readerSwipe: '',
      playPrice: '',
      entryDate: '',
      notes: '',
    },
  ]);

  const handleEditCodeLookup = (id: string, codeVal: string) => {
    const trimmed = codeVal.trim().toUpperCase();
    if (trimmed.length >= 6) {
      const check = validateAssetAccess(trimmed);
      if (!check.allowed) {
        setEditRows((prev) =>
          prev.map((row) => (row.id === id ? { ...row, code: '' } : row))
        );
        return;
      }
    }

    const match = assets.find((a) => a.code.toUpperCase() === trimmed && a.status === 'ACTIVE');

    setEditRows((prev) =>
      prev.map((row) => {
        if (row.id !== id) return row;
        if (match) {
          return {
            ...row,
            code: trimmed,
            locationCode: match.locationCode,
            name: match.name,
            photoUrl: match.photoUrl || '',
            typeCode: match.typeCode,
            costActual: match.costActual != null ? formatCurrencyDecimal2(match.costActual) : '',
            costExcel: match.costExcel != null ? formatCurrencyDecimal2(match.costExcel) : '',
            supplier: match.supplier || '',
            buyDate: match.buyDate || '',
            readerTap: match.readerTap || '',
            readerSwipe: match.readerSwipe || '',
            playPrice: match.playPrice != null ? formatCurrencyDecimal2(match.playPrice) : '',
            entryDate: match.entryDate || '',
            notes: match.notes || '',
          };
        }
        return { ...row, code: codeVal };
      })
    );
  };

  const handleSaveEdit = () => {
    let successCount = 0;
    editRows.forEach((r) => {
      if (!r.code.trim()) return;
      const typeObj = assetTypes.find((t) => t.code === r.typeCode);
      const parseVal = (str?: string) => {
        if (!str || !str.trim()) return undefined;
        const n = parseFloat(str.replace(/\./g, '').replace(/,/g, '.').replace(/[^0-9.-]/g, ''));
        return isNaN(n) ? undefined : n;
      };
      const ok = updateAsset(r.code, {
        name: r.name,
        photoUrl: r.photoUrl || undefined,
        typeCode: r.typeCode,
        category: typeObj ? typeObj.category : 'MESIN',
        costActual: parseVal(r.costActual),
        costExcel: parseVal(r.costExcel),
        supplier: r.supplier || undefined,
        buyDate: r.buyDate || undefined,
        readerTap: r.readerTap || undefined,
        readerSwipe: r.readerSwipe || undefined,
        playPrice: parseVal(r.playPrice),
        notes: r.notes || undefined,
      });
      if (ok) successCount++;
    });

    if (successCount > 0) {
      addToast(`${successCount} data aset berhasil diubah`, 'success');
    }
  };

  // ----------------------------------------------------
  // 4.3 HAPUS STATE
  // ----------------------------------------------------
  const [deleteRows, setDeleteRows] = useState<DeleteRowState[]>([
    {
      id: 'del-1',
      code: '',
      locationCode: '',
      name: '',
      typeCode: '',
      costActual: '',
      costExcel: '',
      supplier: '',
      buyDate: '',
      readerTap: '',
      readerSwipe: '',
      playPrice: '',
      entryDate: '',
      deleteDate: todayStr,
      notes: '',
    },
  ]);

  const handleDeleteCodeLookup = (id: string, codeVal: string) => {
    const trimmed = codeVal.trim().toUpperCase();
    if (trimmed.length >= 6) {
      const check = validateAssetAccess(trimmed);
      if (!check.allowed) {
        setDeleteRows((prev) =>
          prev.map((row) => (row.id === id ? { ...row, code: '' } : row))
        );
        return;
      }
    }

    const match = assets.find((a) => a.code.toUpperCase() === trimmed && a.status === 'ACTIVE');

    setDeleteRows((prev) =>
      prev.map((row) => {
        if (row.id !== id) return row;
        if (match) {
          return {
            ...row,
            code: trimmed,
            locationCode: match.locationCode,
            name: match.name,
            typeCode: match.typeCode,
            costActual: match.costActual != null ? formatCurrencyDecimal2(match.costActual) : '',
            costExcel: match.costExcel != null ? formatCurrencyDecimal2(match.costExcel) : '',
            supplier: match.supplier || '',
            buyDate: match.buyDate || '',
            readerTap: match.readerTap || '',
            readerSwipe: match.readerSwipe || '',
            playPrice: match.playPrice != null ? formatCurrencyDecimal2(match.playPrice) : '',
            entryDate: match.entryDate || '',
            deleteDate: row.deleteDate || todayStr,
            notes: match.notes || '',
          };
        }
        return { ...row, code: codeVal };
      })
    );
  };

  const handleConfirmDelete = () => {
    const valid = deleteRows.filter((r) => r.code.trim() !== '');
    if (valid.length === 0) {
      addToast('Pilih atau masukkan kode aset yang akan dihapus', 'warning');
      return;
    }

    let delCount = 0;
    valid.forEach((r) => {
      const ok = deleteAsset(r.code, r.deleteDate || todayStr, r.notes);
      if (ok) delCount++;
    });

    if (delCount > 0) {
      setDeleteRows([
        {
          id: 'del-1',
          code: '',
          locationCode: '',
          name: '',
          typeCode: '',
          costActual: '',
          costExcel: '',
          supplier: '',
          buyDate: '',
          readerTap: '',
          readerSwipe: '',
          playPrice: '',
          entryDate: '',
          deleteDate: todayStr,
          notes: '',
        },
      ]);
    }
  };

  // ----------------------------------------------------
  // 4.3 HAPUS - EXCEL IMPORT STATE & HANDLERS
  // ----------------------------------------------------
  const deleteFileInputRef = useRef<HTMLInputElement>(null);
  const [deleteImportModalOpen, setDeleteImportModalOpen] = useState(false);
  const [deleteImportResult, setDeleteImportResult] = useState<{
    successCount: number;
    errors: string[];
  } | null>(null);

  const handleImportExcelHapus = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    try {
      const rows = await parseExcelFileWithImages(files[0]);
      if (rows.length === 0) {
        addToast('File Excel kosong atau format tidak sesuai', 'warning');
        return;
      }

      const errors: string[] = [];
      const validRows: DeleteRowState[] = [];

      rows.forEach((rowObj, idx) => {
        const item = rowObj.data || {};
        const rowNum = idx + 2;

        const getRawVal = (keys: string[]): unknown => {
          for (const k of keys) {
            if (item[k] !== undefined && item[k] !== null && item[k] !== '') return item[k];
          }
          const itemKeys = Object.keys(item);
          for (const target of keys) {
            const cleanTarget = target.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
            const matchedKey = itemKeys.find(
              (k) =>
                k.trim().toUpperCase() === target.trim().toUpperCase() ||
                k.trim().toUpperCase().replace(/[^A-Z0-9]/g, '') === cleanTarget
            );
            if (matchedKey && item[matchedKey] !== undefined && item[matchedKey] !== null && item[matchedKey] !== '') {
              return item[matchedKey];
            }
          }
          return undefined;
        };

        const getVal = (keys: string[]): string => {
          const val = getRawVal(keys);
          if (val === undefined || val === null) return '';
          return String(val).trim();
        };

        const kodeLokasi = getVal(['KODE LOKASI', 'KODELOKASI', 'LOKASI', 'locationCode', 'CABANG']).toUpperCase();
        const kodeAset = getVal(['KODE ASET', 'KODEASET', 'KODE', 'KODE ASSET', 'code', 'ASSET CODE']).toUpperCase();

        if (!kodeLokasi && !kodeAset) return;

        if (!kodeAset) {
          errors.push(`Baris ${rowNum}: KODE ASET wajib diisi`);
          return;
        }

        if (!kodeLokasi) {
          errors.push(`Baris ${rowNum} (KODE: ${kodeAset}): KODE LOKASI wajib diisi`);
          return;
        }

        // Validate location exists
        const locExists = locations.some((l) => l.code.toUpperCase() === kodeLokasi);
        if (!locExists) {
          errors.push(`Baris ${rowNum} (KODE: ${kodeAset}): KODE LOKASI '${kodeLokasi}' tidak valid / tidak terdaftar di master lokasi`);
          return;
        }

        // Validate asset exists in database
        const matchedAsset = assets.find(
          (a) => a.code.toUpperCase() === kodeAset && a.status === 'ACTIVE'
        );
        if (!matchedAsset) {
          errors.push(`Baris ${rowNum}: KODE ASET '${kodeAset}' tidak ditemukan di database`);
          return;
        }

        // Validate asset location matches
        if (matchedAsset.locationCode.toUpperCase() !== kodeLokasi) {
          errors.push(
            `Baris ${rowNum}: KODE LOKASI '${kodeLokasi}' tidak cocok dengan lokasi aset '${kodeAset}' saat ini (lokasi di database: ${matchedAsset.locationCode})`
          );
          return;
        }

        // Extract delete date & notes
        const rawDeleteDate = getRawVal(['TANGGAL HAPUS', 'TGL HAPUS', 'TGL_HAPUS', 'TANGGAL_HAPUS', 'deleteDate']);
        const deleteDate = rawDeleteDate ? parseExcelDate(rawDeleteDate, todayStr) : todayStr;
        const notes = getVal(['KETERANGAN', 'NOTES', 'ALASAN', 'CATATAN', 'notes']) || matchedAsset.notes || '';

        validRows.push({
          id: 'del-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6) + '-' + idx,
          code: matchedAsset.code,
          locationCode: matchedAsset.locationCode,
          name: matchedAsset.name,
          typeCode: matchedAsset.typeCode,
          costActual: matchedAsset.costActual != null ? formatCurrencyDecimal2(matchedAsset.costActual) : '',
          costExcel: matchedAsset.costExcel != null ? formatCurrencyDecimal2(matchedAsset.costExcel) : '',
          supplier: matchedAsset.supplier || '',
          buyDate: matchedAsset.buyDate || '',
          readerTap: matchedAsset.readerTap || '',
          readerSwipe: matchedAsset.readerSwipe || '',
          playPrice: matchedAsset.playPrice != null ? formatCurrencyDecimal2(matchedAsset.playPrice) : '',
          entryDate: matchedAsset.entryDate || '',
          deleteDate,
          notes,
        });
      });

      if (validRows.length > 0) {
        setDeleteRows((prev) => {
          const hasOnlyEmptyRow = prev.length === 1 && !prev[0].code.trim();
          if (hasOnlyEmptyRow) return validRows;
          const filteredPrev = prev.filter((r) => r.code.trim() !== '');
          return [...filteredPrev, ...validRows];
        });
      }

      setDeleteImportResult({
        successCount: validRows.length,
        errors,
      });

      if (validRows.length > 0) {
        addToast(
          `Berhasil: ${validRows.length} data masuk ke tabel HAPUS. ${errors.length > 0 ? `(${errors.length} data ditolak)` : ''}`,
          errors.length > 0 ? 'warning' : 'success'
        );
      } else {
        addToast(`Gagal: Seluruh data (${errors.length}) ditolak`, 'error');
      }

      setDeleteImportModalOpen(false);
    } catch (err: any) {
      addToast(`Gagal membaca file Excel: ${err?.message || 'Error'}`, 'error');
    } finally {
      e.target.value = '';
    }
  };

  // ----------------------------------------------------
  // 4.4 ROTASI KELUAR - EXCEL IMPORT STATE & HANDLERS
  // ----------------------------------------------------
  const rotOutFileInputRef = useRef<HTMLInputElement>(null);
  const [rotOutImportModalOpen, setRotOutImportModalOpen] = useState(false);
  const [rotOutImportResult, setRotOutImportResult] = useState<{
    successCount: number;
    errors: string[];
  } | null>(null);

  const handleImportExcelRotOut = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    try {
      const rows = await parseExcelFileWithImages(files[0]);
      if (rows.length === 0) {
        addToast('File Excel kosong atau format tidak sesuai', 'warning');
        return;
      }

      const errors: string[] = [];
      const validRows: RotationOutRowState[] = [];

      rows.forEach((rowObj, idx) => {
        const item = rowObj.data || {};
        const rowNum = idx + 2;

        const getRawVal = (keys: string[]): unknown => {
          for (const k of keys) {
            if (item[k] !== undefined && item[k] !== null && item[k] !== '') return item[k];
          }
          const itemKeys = Object.keys(item);
          for (const target of keys) {
            const cleanTarget = target.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
            const matchedKey = itemKeys.find(
              (k) =>
                k.trim().toUpperCase() === target.trim().toUpperCase() ||
                k.trim().toUpperCase().replace(/[^A-Z0-9]/g, '') === cleanTarget
            );
            if (matchedKey && item[matchedKey] !== undefined && item[matchedKey] !== null && item[matchedKey] !== '') {
              return item[matchedKey];
            }
          }
          return undefined;
        };

        const getVal = (keys: string[]): string => {
          const val = getRawVal(keys);
          if (val === undefined || val === null) return '';
          return String(val).trim();
        };

        const kodeAset = getVal(['KODE ASET', 'KODEASET', 'KODE', 'KODE ASSET', 'code', 'ASSET CODE']).toUpperCase();
        const dariLokasi = getVal(['DARI LOKASI', 'DARILOKASI', 'DARI', 'LOKASI ASAL', 'fromLocationCode', 'FROM']).toUpperCase();
        const keLokasi = getVal(['KE LOKASI', 'KELOKASI', 'KE', 'LOKASI TUJUAN', 'toLocationCode', 'TO']).toUpperCase();
        const rawExitDate = getRawVal(['TANGGAL KELUAR', 'TGL KELUAR', 'TGL_KELUAR', 'TANGGAL_KELUAR', 'exitDate']);

        if (!kodeAset && !dariLokasi && !keLokasi) return;

        if (!kodeAset) {
          errors.push(`Baris ${rowNum}: KODE ASET wajib diisi`);
          return;
        }

        // Find asset in database
        const matchedAsset = assets.find(
          (a) => a.code.toUpperCase() === kodeAset && a.status === 'ACTIVE'
        );
        if (!matchedAsset) {
          errors.push(`Baris ${rowNum} (KODE: ${kodeAset}): Kode aset tidak ditemukan di database`);
          return;
        }

        // Cek apakah aset sedang dalam proses rotasi keluar (status MENUNGGU)
        const pendingRot = rotations.find(
          (r) => r.assetCode.toUpperCase() === kodeAset && r.status === 'MENUNGGU'
        );
        if (pendingRot) {
          errors.push(
            `Baris ${rowNum} (KODE: ${kodeAset}): Aset masih MENUNGGU konfirmasi rotasi di lokasi ${pendingRot.toLocationCode}. Tidak dapat dirotasi lagi sebelum diselesaikan.`
          );
          return;
        }

        // Check DARI LOKASI
        if (!dariLokasi) {
          errors.push(`Baris ${rowNum} (KODE: ${kodeAset}): DARI LOKASI wajib diisi`);
          return;
        }
        if (matchedAsset.locationCode.toUpperCase() !== dariLokasi) {
          errors.push(
            `Baris ${rowNum} (KODE: ${kodeAset}): Dari Lokasi '${dariLokasi}' tidak sesuai data aset saat ini (saat ini di: ${matchedAsset.locationCode})`
          );
          return;
        }

        // Check KE LOKASI
        if (!keLokasi) {
          errors.push(`Baris ${rowNum} (KODE: ${kodeAset}): KE LOKASI tidak boleh kosong`);
          return;
        }
        const destLocExists = locations.some((l) => l.code.toUpperCase() === keLokasi);
        if (!destLocExists) {
          errors.push(`Baris ${rowNum} (KODE: ${kodeAset}): Ke Lokasi '${keLokasi}' tidak terdaftar di master lokasi`);
          return;
        }
        if (keLokasi === dariLokasi) {
          errors.push(`Baris ${rowNum} (KODE: ${kodeAset}): Ke Lokasi tidak boleh sama dengan lokasi asal (${dariLokasi})`);
          return;
        }

        const exitDate = rawExitDate ? parseExcelDate(rawExitDate, todayStr) : todayStr;

        validRows.push({
          id: 'rotout-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6) + '-' + idx,
          code: matchedAsset.code,
          name: matchedAsset.name,
          typeCode: matchedAsset.typeCode,
          fromLocationCode: matchedAsset.locationCode,
          toLocationCode: keLokasi,
          exitDate,
          readerTap: matchedAsset.readerTap || '',
          readerSwipe: matchedAsset.readerSwipe || '',
        });
      });

      if (validRows.length > 0) {
        setRotationOutRows((prev) => {
          const hasOnlyEmptyRow = prev.length === 1 && !prev[0].code.trim();
          if (hasOnlyEmptyRow) return validRows;
          const filteredPrev = prev.filter((r) => r.code.trim() !== '');
          return [...filteredPrev, ...validRows];
        });
      }

      setRotOutImportResult({
        successCount: validRows.length,
        errors,
      });

      if (validRows.length > 0) {
        addToast(
          `Berhasil: ${validRows.length} data masuk ke tabel Rotasi Keluar. ${errors.length > 0 ? `(${errors.length} baris ditolak)` : ''}`,
          errors.length > 0 ? 'warning' : 'success'
        );
      } else {
        addToast(`Gagal: Seluruh baris (${errors.length}) ditolak`, 'error');
      }

      setRotOutImportModalOpen(false);
    } catch (err: any) {
      addToast(`Gagal membaca file Excel: ${err?.message || 'Error'}`, 'error');
    } finally {
      e.target.value = '';
    }
  };

  // ----------------------------------------------------
  // 4.4 ROTASI KELUAR STATE
  // ----------------------------------------------------
  const [rotationOutRows, setRotationOutRows] = useState<RotationOutRowState[]>([
    {
      id: 'rotout-1',
      code: '',
      name: '',
      typeCode: '',
      fromLocationCode: '',
      toLocationCode: '',
      exitDate: todayStr,
      readerTap: '',
      readerSwipe: '',
    },
  ]);

  const [rotHistorySearch, setRotHistorySearch] = useState('');
  const [rotHistoryStatus, setRotHistoryStatus] = useState('SEMUA');
  const [rotHistoryDateFrom, setRotHistoryDateFrom] = useState('');
  const [rotHistoryDateTo, setRotHistoryDateTo] = useState('');
  const [showHistory, setShowHistory] = useState(true);

  // Track last handled initial props to prevent re-triggering tab jumps on data mutation
  const lastHandledNavRef = useRef<{ code?: string; subTab?: string }>({
    code: undefined,
    subTab: undefined,
  });

  // If initialAssetCode / initialSubTab was passed (e.g. from opening in a new tab), pre-populate
  React.useEffect(() => {
    // Only react when navigation intent from props actually changes
    if (
      lastHandledNavRef.current.code === initialAssetCode &&
      lastHandledNavRef.current.subTab === initialSubTab
    ) {
      return;
    }

    if (initialAssetCode) {
      const match = assets.find((a) => a.code.toUpperCase() === initialAssetCode.toUpperCase());
      if (match) {
        lastHandledNavRef.current = { code: initialAssetCode, subTab: initialSubTab };
        if (initialSubTab === 'rotasi') {
          setRotationOutRows([
            {
              id: 'rotout-1',
              code: match.code,
              name: match.name,
              typeCode: match.typeCode,
              fromLocationCode: match.locationCode,
              toLocationCode: '',
              exitDate: todayStr,
              readerTap: match.readerTap || '',
              readerSwipe: match.readerSwipe || '',
            },
          ]);
          setActiveSubTab('rotasi');
          setActiveRotationSubTab('keluar');
        } else {
          setEditRows([
            {
              id: 'edit-1',
              code: match.code,
              locationCode: match.locationCode,
              name: match.name,
              photoUrl: match.photoUrl || '',
              typeCode: match.typeCode,
              costActual: match.costActual != null ? formatCurrencyDecimal2(match.costActual) : '',
              costExcel: match.costExcel != null ? formatCurrencyDecimal2(match.costExcel) : '',
              supplier: match.supplier || '',
              buyDate: match.buyDate || '',
              readerTap: match.readerTap || '',
              readerSwipe: match.readerSwipe || '',
              playPrice: match.playPrice != null ? formatCurrencyDecimal2(match.playPrice) : '',
              entryDate: match.entryDate || '',
              notes: match.notes || '',
            },
          ]);
          setActiveSubTab('edit');
        }
      }
    } else if (initialSubTab) {
      lastHandledNavRef.current = { code: initialAssetCode, subTab: initialSubTab };
      setActiveSubTab(initialSubTab);
    }
  }, [initialAssetCode, initialSubTab, assets, todayStr]);

  const handleRotOutLookup = (id: string, codeVal: string) => {
    const trimmed = codeVal.trim().toUpperCase();
    if (trimmed.length >= 6) {
      const check = validateAssetAccess(trimmed);
      if (!check.allowed) {
        setRotationOutRows((prev) =>
          prev.map((row) => (row.id === id ? { ...row, code: '' } : row))
        );
        return;
      }
    }

    const match = assets.find((a) => a.code.toUpperCase() === trimmed && a.status === 'ACTIVE');

    // Cek apakah aset masih memiliki rotasi keluar dengan status MENUNGGU
    const pendingRot = rotations.find(
      (r) => r.assetCode.toUpperCase() === trimmed && r.status === 'MENUNGGU'
    );
    if (pendingRot) {
      addToast(
        `Aset ${trimmed} masih memiliki rotasi keluar yang MENUNGGU konfirmasi di lokasi ${pendingRot.toLocationCode}. Selesaikan atau tolak terlebih dahulu sebelum melakukan rotasi baru.`,
        'warning'
      );
      setRotationOutRows((prev) =>
        prev.map((row) => (row.id === id ? { ...row, code: '' } : row))
      );
      return;
    }

    setRotationOutRows((prev) =>
      prev.map((row) => {
        if (row.id !== id) return row;
        if (match) {
          return {
            ...row,
            code: trimmed,
            name: match.name,
            typeCode: match.typeCode,
            fromLocationCode: match.locationCode,
            readerTap: match.readerTap || '',
            readerSwipe: match.readerSwipe || '',
          };
        }
        return { ...row, code: codeVal };
      })
    );
  };

  const handleSaveRotOut = () => {
    const valid = rotationOutRows.filter((r) => r.code && r.toLocationCode);
    if (valid.length === 0) {
      addToast('Masukkan kode aset dan pilih lokasi tujuan rotasi', 'warning');
      return;
    }

    let count = 0;
    valid.forEach((r) => {
      const ok = createRotationOut(
        r.code,
        r.toLocationCode,
        r.exitDate || todayStr,
        undefined,
        r.readerTap,
        r.readerSwipe
      );
      if (ok) count++;
    });

    if (count > 0) {
      setRotationOutRows([
        {
          id: 'rotout-1',
          code: '',
          name: '',
          typeCode: '',
          fromLocationCode: '',
          toLocationCode: '',
          exitDate: todayStr,
          readerTap: '',
          readerSwipe: '',
        },
      ]);
    }
  };

  // Filtered Rotation Out History
  const filteredRotOutHistory = useMemo(() => {
    return rotations.filter((r) => {
      if (r.fromLocationCode === 'BARU') return false; // Not a rotation out transfer

      if (rotHistoryStatus !== 'SEMUA') {
        if (r.status !== rotHistoryStatus) return false;
      }

      if (rotHistoryDateFrom && r.exitDate < rotHistoryDateFrom) return false;
      if (rotHistoryDateTo && r.exitDate > rotHistoryDateTo) return false;

      if (rotHistorySearch.trim()) {
        const q = rotHistorySearch.toLowerCase();
        if (!r.assetCode.toLowerCase().includes(q) && !r.assetName.toLowerCase().includes(q)) {
          return false;
        }
      }

      return true;
    });
  }, [rotations, rotHistoryStatus, rotHistoryDateFrom, rotHistoryDateTo, rotHistorySearch]);

  // ----------------------------------------------------
  // 4.4.2 ROTASI MASUK STATE
  // ----------------------------------------------------
  const [rotInLocationFilter, setRotInLocationFilter] = useState('ALL');

  const incomingRotations = useMemo(() => {
    return rotations.filter((r) => {
      if (r.status !== 'MENUNGGU') return false;
      if (rotInLocationFilter !== 'ALL' && r.toLocationCode !== rotInLocationFilter) {
        return false;
      }
      return true;
    });
  }, [rotations, rotInLocationFilter]);

  // ----------------------------------------------------
  // 4.5 TUTUP PERIODE STATE
  // ----------------------------------------------------
  const [tutupLocation, setTutupLocation] = useState(() => allowedLocations[0]?.code || 'BECO');
  const [tutupMonth, setTutupMonth] = useState<string>(() => String(new Date().getMonth() + 1));
  const [tutupYear, setTutupYear] = useState<string>(() => String(new Date().getFullYear()));

  useEffect(() => {
    if (allowedLocations.length > 0 && !allowedLocations.some((l) => l.code === tutupLocation)) {
      setTutupLocation(allowedLocations[0].code);
    }
  }, [allowedLocations, tutupLocation]);

  // Check period locking across 4.1, 4.2, 4.3, 4.4
  const inputLockedInfo = useMemo(() => {
    for (const r of inputRows) {
      if (!r.locationCode) continue;
      const d = new Date(r.entryDate || todayStr);
      const m = d.getMonth() + 1;
      const y = d.getFullYear();
      if (isPeriodLocked(r.locationCode, m, y)) {
        return { isLocked: true, locationCode: r.locationCode, month: m, year: y };
      }
    }
    return { isLocked: false, locationCode: '', month: 0, year: 0 };
  }, [inputRows, todayStr, isPeriodLocked]);

  const editLockedInfo = useMemo(() => {
    for (const r of editRows) {
      if (!r.code || !r.locationCode) continue;
      const d = new Date(r.entryDate || todayStr);
      const m = d.getMonth() + 1;
      const y = d.getFullYear();
      if (isPeriodLocked(r.locationCode, m, y)) {
        return { isLocked: true, locationCode: r.locationCode, month: m, year: y, assetCode: r.code };
      }
    }
    return { isLocked: false, locationCode: '', month: 0, year: 0, assetCode: '' };
  }, [editRows, todayStr, isPeriodLocked]);

  const deleteLockedInfo = useMemo(() => {
    for (const r of deleteRows) {
      if (!r.code || !r.locationCode) continue;
      const d = new Date(r.deleteDate || todayStr);
      const m = d.getMonth() + 1;
      const y = d.getFullYear();
      if (isPeriodLocked(r.locationCode, m, y)) {
        return { isLocked: true, locationCode: r.locationCode, month: m, year: y, assetCode: r.code };
      }
    }
    return { isLocked: false, locationCode: '', month: 0, year: 0, assetCode: '' };
  }, [deleteRows, todayStr, isPeriodLocked]);

  const rotOutLockedInfo = useMemo(() => {
    for (const r of rotationOutRows) {
      if (!r.code || !r.fromLocationCode) continue;
      const d = new Date(r.exitDate || todayStr);
      const m = d.getMonth() + 1;
      const y = d.getFullYear();
      if (isPeriodLocked(r.fromLocationCode, m, y)) {
        return { isLocked: true, locationCode: r.fromLocationCode, month: m, year: y, assetCode: r.code };
      }
    }
    return { isLocked: false, locationCode: '', month: 0, year: 0, assetCode: '' };
  }, [rotationOutRows, todayStr, isPeriodLocked]);

  return (
    <div className="h-full flex flex-col p-2 sm:p-2.5 min-h-0 overflow-hidden">
      <div className="flex flex-col flex-1 min-h-0 overflow-hidden space-y-2">
        {/* Sub-tabs 4.1 to 4.5 */}
        <div className="shrink-0 flex flex-wrap gap-2" role="tablist">
          {can41 && (
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
              4.1 INPUT
            </button>
          )}
          {can42 && (
            <button
              type="button"
              role="tab"
              aria-selected={activeSubTab === 'edit'}
              onClick={() => setActiveSubTab('edit')}
              className={`px-4 h-9 rounded-full text-xs font-bold transition whitespace-nowrap cursor-pointer ${
                activeSubTab === 'edit'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'bg-zinc-100 text-zinc-700 hover:bg-zinc-200'
              }`}
            >
              4.2 EDIT
            </button>
          )}
          {can43 && (
            <button
              type="button"
              role="tab"
              aria-selected={activeSubTab === 'hapus'}
              onClick={() => setActiveSubTab('hapus')}
              className={`px-4 h-9 rounded-full text-xs font-bold transition whitespace-nowrap cursor-pointer ${
                activeSubTab === 'hapus'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'bg-zinc-100 text-zinc-700 hover:bg-zinc-200'
              }`}
            >
              4.3 HAPUS
            </button>
          )}
          {can44 && (
            <button
              type="button"
              role="tab"
              aria-selected={activeSubTab === 'rotasi'}
              onClick={() => setActiveSubTab('rotasi')}
              className={`px-4 h-9 rounded-full text-xs font-bold transition whitespace-nowrap cursor-pointer ${
                activeSubTab === 'rotasi'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'bg-zinc-100 text-zinc-700 hover:bg-zinc-200'
              }`}
            >
              4.4 ROTASI
            </button>
          )}
          {can45 && (
            <button
              type="button"
              role="tab"
              aria-selected={activeSubTab === 'tutup'}
              onClick={() => setActiveSubTab('tutup')}
              className={`px-4 h-9 rounded-full text-xs font-bold transition whitespace-nowrap cursor-pointer ${
                activeSubTab === 'tutup'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'bg-zinc-100 text-zinc-700 hover:bg-zinc-200'
              }`}
            >
              4.5 TUTUP PERIODE
            </button>
          )}
        </div>

        {!can41 && !can42 && !can43 && !can44 && !can45 && (
          <div className="p-8 text-center bg-white rounded-xl border border-zinc-200 text-zinc-500 font-semibold text-xs">
            Akses Terbatas: Anda tidak memiliki izin untuk mengakses sub-menu pada Aktivitas.
          </div>
        )}

        {/* ==================================================== */}
        {/* 4.1 INPUT TAB                                       */}
        {/* ==================================================== */}
        {activeSubTab === 'input' && can41 && (
          <div className="bg-white border border-zinc-200 rounded-xl shadow-xs flex flex-col flex-1 min-h-0 overflow-hidden">
            <div className="shrink-0 p-2.5 sm:p-3 flex flex-wrap items-center justify-between gap-2 border-b border-zinc-200">
              <div className="font-bold text-sm text-zinc-900">
                4.1 INPUT :{' '}
                <span className="font-normal text-zinc-500 text-xs">
                  *data aset yang akan ditambahkan ke database
                </span>
              </div>
              <div className="flex gap-2 flex-wrap items-center">
                <button
                  type="button"
                  onClick={handleAddInputRow}
                  className="inline-flex items-center justify-center gap-1.5 rounded-lg font-semibold transition whitespace-nowrap h-9 px-3 text-xs border border-zinc-300 hover:bg-zinc-50 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" /> Tambah Baris
                </button>
                <button
                  type="button"
                  onClick={() => handleRemoveInputRow()}
                  className="inline-flex items-center justify-center gap-1.5 rounded-lg font-semibold transition whitespace-nowrap h-9 px-3 text-xs border border-red-200 bg-red-50 text-red-700 hover:bg-red-100 cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" /> Hapus Baris
                </button>

                {/* Excel Import */}
                <input
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  ref={fileInputRef}
                  className="hidden"
                  onChange={handleImportExcelInput}
                />
                {hasButtonAccess('btn-import-excel-4.1') && (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="inline-flex items-center justify-center gap-1.5 rounded-lg font-semibold transition whitespace-nowrap h-9 px-3 text-xs bg-emerald-700 text-white hover:bg-emerald-800 cursor-pointer"
                  >
                    <Upload className="w-3.5 h-3.5" /> Tambah data dari Excel
                  </button>
                )}

                <label className="flex items-center gap-2 text-[11px] font-semibold px-2 cursor-pointer select-none text-zinc-700">
                  <input
                    type="checkbox"
                    checked={overwriteCode}
                    onChange={(e) => setOverwriteCode(e.target.checked)}
                    className="rounded text-indigo-600 focus:ring-indigo-500"
                  />
                  Timpa data yang sudah ada (berdasarkan KODE)
                </label>

                {hasButtonAccess('btn-simpan-aset-4.1') && (
                  <button
                    type="button"
                    onClick={handleSaveInput}
                    disabled={inputLockedInfo.isLocked}
                    className={`inline-flex items-center justify-center gap-1.5 rounded-lg font-semibold transition whitespace-nowrap h-9 text-xs px-4 shadow-xs ${
                      inputLockedInfo.isLocked
                        ? 'bg-zinc-300 text-zinc-500 cursor-not-allowed border border-zinc-300'
                        : 'bg-blue-600 text-white hover:bg-blue-700 cursor-pointer'
                    }`}
                    title={inputLockedInfo.isLocked ? 'Periode terkunci di menu 4.5' : 'Simpan data aset'}
                  >
                    {inputLockedInfo.isLocked ? <Lock className="w-3.5 h-3.5 inline mr-1 text-zinc-500" /> : null} Simpan data
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
                <ResetButtonInput />
              </div>
            </div>

            {/* Banner Periode Terkunci di 4.1 */}
            {inputLockedInfo.isLocked && (
              <div className="mx-4 mt-3 mb-2 p-3.5 bg-red-50 border-2 border-red-500 rounded-xl flex items-start gap-3 shadow-xs animate-in fade-in duration-150">
                <div className="p-2 bg-red-100 text-red-700 rounded-lg shrink-0 mt-0.5">
                  <Lock className="w-5 h-5 text-red-600" />
                </div>
                <div className="flex-1 text-xs">
                  <div className="font-bold text-red-900 text-sm flex items-center gap-2">
                    PERIODE TERKUNCI ({inputLockedInfo.locationCode} - {MONTH_NAMES[inputLockedInfo.month - 1]} {inputLockedInfo.year})
                  </div>
                  <div className="text-red-800 mt-1 leading-relaxed">
                    Lokasi <strong>{inputLockedInfo.locationCode}</strong> pada periode ini telah <strong>DITUTUP</strong> di <strong>Menu 4.5 TUTUP PERIODE</strong>.
                    Anda tidak bisa melakukan input aset baru pada periode yang ditutup. Silakan lakukan <strong>BUKA PERIODE</strong> terlebih dahulu di menu 4.5 jika ingin menambah data.
                  </div>
                </div>
              </div>
            )}

            {/* Input Table */}
            <div className="table-wrapper flex-1 min-h-0 overflow-auto relative">
              <table
                ref={tableRefInput}
                className={`w-full text-xs table-assetflow table-padat table-entri resizable-table ${
                  gridLines ? 'table-gridlines-active' : ''
                }`}
              >
                <thead className="sticky top-0 z-20 bg-[#1e40af] text-white shadow-xs">
                  <tr>
                    <th className="px-3 py-2 font-semibold min-w-[120px]">LOKASI</th>
                    <th className="px-3 py-2 font-semibold min-w-[45px] text-center">NO</th>
                    <th className="px-3 py-2 font-semibold min-w-[280px]">NAMA ASET</th>
                    <th className="px-3 py-2 font-semibold min-w-[120px] max-w-[150px]">FOTO FISIK</th>
                    <th className="px-3 py-2 font-semibold min-w-[90px]">JENIS</th>
                    <th className="px-3 py-2 font-semibold min-w-[140px]">KODE</th>
                    <th className="px-3 py-2 font-semibold min-w-[140px] text-right">NILAI PEROLEHAN PASTI</th>
                    <th className="px-3 py-2 font-semibold min-w-[140px] text-right">NILAI PEROLEHAN EXCEL</th>
                    <th className="px-3 py-2 font-semibold min-w-[140px]">SUPPLIER</th>
                    <th className="px-3 py-2 font-semibold min-w-[110px]">TANGGAL BELI</th>
                    <th className="px-3 py-2 font-semibold min-w-[100px]">READER TAP/SWIPE</th>
                    <th className="px-3 py-2 font-semibold min-w-[110px] text-right">HARGA BERMAIN</th>
                    <th className="px-3 py-2 font-semibold min-w-[110px]">TANGGAL MASUK</th>
                    <th className="px-3 py-2 font-semibold min-w-[180px]">KETERANGAN</th>
                    <th className="px-3 py-2 font-semibold min-w-[70px] text-center">AKSI</th>
                  </tr>
                </thead>
                <tbody>
                  {inputRows.map((row, idx) => (
                    <tr key={row.id} className="border-b border-zinc-200/70 hover:bg-zinc-50/60">
                      <td className="px-2 py-1.5 min-w-[120px]">
                        <select
                          value={row.locationCode}
                          onChange={(e) => updateInputRow(row.id, 'locationCode', e.target.value)}
                          className="bg-white border-zinc-300 text-zinc-900 w-full px-2 py-1 rounded border text-xs"
                        >
                          {allowedLocations.map((l) => (
                            <option key={l.code} value={l.code}>
                              {l.code} - {l.name}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="px-2 py-1.5 text-center text-zinc-400 font-mono text-[11px]">{idx + 1}</td>
                      <td className="px-2 py-1.5 min-w-[280px]">
                        <input
                          type="text"
                          value={row.name}
                          onChange={(e) => updateInputRow(row.id, 'name', e.target.value)}
                          placeholder="Nama aset (cth: WANGAN MIDNIGHT 6RR)"
                          className="bg-white border-zinc-300 text-zinc-900 w-full px-2 py-1 rounded border text-xs"
                        />
                      </td>
                      <td className="px-2 py-1.5 min-w-[120px] max-w-[150px]">
                        {row.photoUrl ? (
                          <div className="flex items-center gap-2">
                            <img
                              src={row.photoUrl}
                              alt="Foto Aset"
                              onClick={() =>
                                setPreviewPhoto({
                                  url: row.photoUrl!,
                                  title: row.name || row.code,
                                  code: row.code,
                                })
                              }
                              className="w-10 h-10 object-cover rounded border border-zinc-300 shadow-xs cursor-pointer hover:opacity-80 transition shrink-0 bg-zinc-50"
                              title="Klik untuk memperbesar foto"
                            />
                            <div className="flex flex-col text-[10px] leading-tight min-w-0">
                              <label className="text-blue-600 hover:underline cursor-pointer font-medium whitespace-nowrap">
                                Ganti
                                <input
                                  type="file"
                                  accept="image/*"
                                  className="hidden"
                                  onChange={(e) => handleUploadImageForRow(row.id, e)}
                                />
                              </label>
                              <button
                                type="button"
                                onClick={() => updateInputRow(row.id, 'photoUrl', '')}
                                className="text-red-500 hover:underline text-left mt-0.5 cursor-pointer font-medium whitespace-nowrap"
                              >
                                Hapus
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <label className="text-[11px] text-blue-600 underline leading-tight text-left cursor-pointer hover:text-blue-800">
                              <span className="block">Browse /</span>
                              <span className="block">ambil gambar</span>
                              <input
                                type="file"
                                accept="image/*"
                                className="hidden"
                                onChange={(e) => handleUploadImageForRow(row.id, e)}
                              />
                            </label>
                          </div>
                        )}
                      </td>
                      <td className="px-2 py-1.5 min-w-[90px]">
                        <select
                          value={row.typeCode}
                          onChange={(e) => updateInputRow(row.id, 'typeCode', e.target.value)}
                          className="bg-white border-zinc-300 text-zinc-900 w-full px-2 py-1 rounded border text-xs font-bold"
                        >
                          <option value="">Pilih</option>
                          {assetTypes.map((t) => (
                            <option key={t.code} value={t.code}>
                              {t.code} — {t.name}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="px-2 py-1.5 min-w-[140px]">
                        <input
                          type="text"
                          value={row.code}
                          onChange={(e) => updateInputRow(row.id, 'code', e.target.value)}
                          placeholder="Kode Aset"
                          className="bg-white border-zinc-300 text-zinc-900 w-full px-2 py-1 rounded border text-xs font-mono font-medium uppercase"
                        />
                      </td>
                      <td className="px-2 py-1.5 min-w-[140px]">
                        <input
                          type="text"
                          value={row.costActual}
                          onChange={(e) => updateInputRow(row.id, 'costActual', e.target.value)}
                          placeholder=""
                          className="bg-white border-zinc-300 text-zinc-900 w-full px-2 py-1 rounded border text-xs text-right font-mono"
                        />
                      </td>
                      <td className="px-2 py-1.5 min-w-[140px]">
                        <input
                          type="text"
                          value={row.costExcel}
                          onChange={(e) => updateInputRow(row.id, 'costExcel', e.target.value)}
                          placeholder=""
                          className="bg-white border-zinc-300 text-zinc-900 w-full px-2 py-1 rounded border text-xs text-right font-mono"
                        />
                      </td>
                      <td className="px-2 py-1.5 min-w-[140px]">
                        <input
                          type="text"
                          value={row.supplier}
                          onChange={(e) => updateInputRow(row.id, 'supplier', e.target.value)}
                          placeholder=""
                          className="bg-white border-zinc-300 text-zinc-900 w-full px-2 py-1 rounded border text-xs"
                        />
                      </td>
                      <td className="px-2 py-1.5 min-w-[110px]">
                        <input
                          type="date"
                          value={row.buyDate}
                          onChange={(e) => updateInputRow(row.id, 'buyDate', e.target.value)}
                          className="bg-white border-zinc-300 text-zinc-900 w-full px-1.5 py-1 rounded border text-xs font-mono"
                        />
                      </td>
                      <td className="px-2 py-1.5 min-w-[100px]">
                        <div className="flex gap-1">
                          <input
                            type="text"
                            value={row.readerTap}
                            onChange={(e) => updateInputRow(row.id, 'readerTap', e.target.value)}
                            placeholder=""
                            className="bg-white border-zinc-300 text-zinc-900 w-1/2 px-1.5 py-1 rounded border text-[11px] font-mono"
                          />
                          <input
                            type="text"
                            value={row.readerSwipe}
                            onChange={(e) => updateInputRow(row.id, 'readerSwipe', e.target.value)}
                            placeholder=""
                            className="bg-white border-zinc-300 text-zinc-900 w-1/2 px-1.5 py-1 rounded border text-[11px] font-mono"
                          />
                        </div>
                      </td>
                      <td className="px-2 py-1.5 min-w-[110px]">
                        <input
                          type="text"
                          value={row.playPrice}
                          onChange={(e) => updateInputRow(row.id, 'playPrice', e.target.value)}
                          placeholder=""
                          className="bg-white border-zinc-300 text-zinc-900 w-full px-2 py-1 rounded border text-xs text-right font-mono"
                        />
                      </td>
                      <td className="px-2 py-1.5 min-w-[110px]">
                        <input
                          type="date"
                          value={row.entryDate}
                          onChange={(e) => updateInputRow(row.id, 'entryDate', e.target.value)}
                          className="bg-white border-zinc-300 text-zinc-900 w-full px-1.5 py-1 rounded border text-xs font-mono"
                        />
                      </td>
                      <td className="px-2 py-1.5 min-w-[180px]">
                        <textarea
                          rows={1}
                          value={row.notes}
                          placeholder=""
                          onChange={(e) => updateInputRow(row.id, 'notes', e.target.value)}
                          onInput={(e) => {
                            const target = e.currentTarget;
                            target.style.height = 'auto';
                            target.style.height = `${target.scrollHeight}px`;
                          }}
                          className="bg-white border-zinc-300 text-zinc-900 w-full px-2 py-1 rounded border text-xs resize-none overflow-hidden leading-snug whitespace-pre-wrap block"
                        />
                      </td>
                      <td className="px-2 py-1.5 text-center min-w-[70px]">
                        <button
                          type="button"
                          onClick={() => handleRemoveInputRow(row.id)}
                          className="px-2 py-1 rounded bg-red-600 text-white text-[11px] font-semibold hover:bg-red-700 transition cursor-pointer"
                        >
                          Hapus
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="shrink-0 p-2 sm:p-2.5 text-[11px] bg-blue-50/95 text-blue-700 border-t border-blue-100 shadow-xs flex items-center justify-between">
              <span>
                💡 <strong>Catatan:</strong> Aktivitas INPUT otomatis akan terkoneksi di{' '}
                <strong>2. LAPORAN ROTASI ASET</strong> sesuai periode bulan yang di input dengan keterangan DARI LOKASI
                'BARU'.
              </span>
              <span className="font-semibold">{inputRows.length} baris siap disimpan</span>
            </div>
          </div>
        )}

        {/* ==================================================== */}
        {/* 4.2 EDIT TAB                                         */}
        {/* ==================================================== */}
        {activeSubTab === 'edit' && can42 && (
          <div className="bg-white border border-zinc-200 rounded-xl shadow-xs flex flex-col flex-1 min-h-0 overflow-hidden">
            <div className="shrink-0 p-2.5 sm:p-3 flex flex-wrap items-center justify-between gap-2 border-b border-zinc-200">
              <div className="font-bold text-sm text-zinc-900">
                4.2 EDIT : <span className="font-normal text-zinc-500 text-xs">*data aset yang akan dirubah</span>
              </div>
              <div className="flex gap-2 flex-wrap items-center">
                <button
                  type="button"
                  onClick={() =>
                    setEditRows((prev) => [
                      ...prev,
                      {
                        id: 'edit-' + Date.now().toString(36),
                        code: '',
                        locationCode: '',
                        name: '',
                        photoUrl: '',
                        typeCode: '',
                        costActual: '',
                        costExcel: '',
                        supplier: '',
                        buyDate: '',
                        readerTap: '',
                        readerSwipe: '',
                        playPrice: '',
                        entryDate: '',
                        notes: '',
                      },
                    ])
                  }
                  className="inline-flex items-center justify-center gap-1.5 rounded-lg font-semibold transition whitespace-nowrap h-9 px-3 text-xs border border-zinc-300 hover:bg-zinc-50 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" /> Tambah Baris
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (editRows.length > 1) setEditRows((prev) => prev.slice(0, -1));
                  }}
                  className="inline-flex items-center justify-center gap-1.5 rounded-lg font-semibold transition whitespace-nowrap h-9 px-3 text-xs border border-red-200 bg-red-50 text-red-700 hover:bg-red-100 cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" /> Hapus Baris
                </button>
                {hasButtonAccess('btn-simpan-edit-4.2') && (
                  <button
                    type="button"
                    onClick={handleSaveEdit}
                    disabled={editLockedInfo.isLocked}
                    className={`inline-flex items-center justify-center gap-1.5 rounded-lg font-semibold transition whitespace-nowrap h-9 text-xs px-4 shadow-xs ${
                      editLockedInfo.isLocked
                        ? 'bg-zinc-300 text-zinc-500 cursor-not-allowed border border-zinc-300'
                        : 'bg-blue-600 text-white hover:bg-blue-700 cursor-pointer'
                    }`}
                    title={editLockedInfo.isLocked ? 'Periode terkunci di menu 4.5' : 'Rubah data aset'}
                  >
                    {editLockedInfo.isLocked ? <Lock className="w-3.5 h-3.5 inline mr-1 text-zinc-500" /> : null} Rubah data
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
                <ResetButtonEdit />
              </div>
            </div>

            {/* Banner Periode Terkunci di 4.2 */}
            {editLockedInfo.isLocked && (
              <div className="mx-4 mt-3 mb-2 p-3.5 bg-red-50 border-2 border-red-500 rounded-xl flex items-start gap-3 shadow-xs animate-in fade-in duration-150">
                <div className="p-2 bg-red-100 text-red-700 rounded-lg shrink-0 mt-0.5">
                  <Lock className="w-5 h-5 text-red-600" />
                </div>
                <div className="flex-1 text-xs">
                  <div className="font-bold text-red-900 text-sm flex items-center gap-2">
                    PERIODE TERKUNCI ({editLockedInfo.locationCode} - {MONTH_NAMES[editLockedInfo.month - 1]} {editLockedInfo.year})
                  </div>
                  <div className="text-red-800 mt-1 leading-relaxed">
                    Aset <strong>{editLockedInfo.assetCode}</strong> berada di lokasi <strong>{editLockedInfo.locationCode}</strong> pada periode yang telah <strong>DITUTUP</strong> di <strong>Menu 4.5 TUTUP PERIODE</strong>.
                    Anda tidak bisa melakukan perubahan data aset pada periode yang ditutup. Silakan lakukan <strong>BUKA PERIODE</strong> terlebih dahulu di menu 4.5 jika ingin mengubah data.
                  </div>
                </div>
              </div>
            )}

            <div className="table-wrapper flex-1 min-h-0 overflow-auto relative">
              <table
                ref={tableRefEdit}
                className={`w-full text-xs table-assetflow table-padat table-entri resizable-table ${
                  gridLines ? 'table-gridlines-active' : ''
                }`}
              >
                <thead className="sticky top-0 z-20 bg-[#1e40af] text-white shadow-xs">
                  <tr>
                    <th className="px-3 py-2 font-semibold min-w-[110px] bg-[#1e40af]">LOKASI (readonly)</th>
                    <th className="px-3 py-2 font-semibold min-w-[45px] text-center bg-[#1e40af]">NO</th>
                    <th className="px-3 py-2 font-semibold min-w-[260px] bg-[#1e40af]">NAMA ASET</th>
                    <th className="px-3 py-2 font-semibold min-w-[120px] max-w-[150px] bg-[#1e40af]">FOTO FISIK</th>
                    <th className="px-3 py-2 font-semibold min-w-[90px] bg-[#1e40af]">JENIS</th>
                    <th className="px-3 py-2 font-semibold min-w-[160px] bg-[#1e40af]">KODE (kunci pencarian)</th>
                    {showNilaiPasti42 && (
                      <th className="px-3 py-2 font-semibold min-w-[140px] text-right bg-[#1e40af]">NILAI PEROLEHAN PASTI</th>
                    )}
                    {showNilaiExcel42 && (
                      <th className="px-3 py-2 font-semibold min-w-[140px] text-right bg-[#1e40af]">NILAI PEROLEHAN EXCEL</th>
                    )}
                    {showSupplier42 && (
                      <th className="px-3 py-2 font-semibold min-w-[140px]">SUPPLIER</th>
                    )}
                    <th className="px-3 py-2 font-semibold min-w-[110px]">TANGGAL BELI</th>
                    <th className="px-3 py-2 font-semibold min-w-[100px]">READER TAP/SWIPE</th>
                    <th className="px-3 py-2 font-semibold min-w-[110px] text-right">HARGA BERMAIN</th>
                    <th className="px-3 py-2 font-semibold min-w-[110px]">TGL MASUK (readonly)</th>
                    <th className="px-3 py-2 font-semibold min-w-[180px]">KETERANGAN</th>
                    <th className="px-3 py-2 font-semibold min-w-[70px] text-center">AKSI</th>
                  </tr>
                </thead>
                <tbody>
                  {editRows.map((row, idx) => (
                    <tr key={row.id} className="border-b border-zinc-200/70 hover:bg-zinc-50/60">
                      <td className="px-2 py-1.5 min-w-[110px]">
                        <input
                          type="text"
                          value={row.locationCode}
                          readOnly
                          disabled
                          placeholder="otomatis terisi"
                          title="Pindah lokasi lewat 4.4 ROTASI KELUAR"
                          className="bg-zinc-100 border-zinc-200 text-zinc-600 w-full px-2 py-1 rounded border text-xs cursor-not-allowed font-semibold"
                        />
                      </td>
                      <td className="px-2 py-1.5 text-center text-zinc-400 font-mono text-[11px]">{idx + 1}</td>
                      <td className="px-2 py-1.5 min-w-[260px]">
                        <input
                          type="text"
                          value={row.name}
                          onChange={(e) =>
                            setEditRows((prev) =>
                              prev.map((r) => (r.id === row.id ? { ...r, name: e.target.value } : r))
                            )
                          }
                          placeholder="Otomatis terisi saat kode diisi"
                          className="bg-white border-zinc-300 text-zinc-900 w-full px-2 py-1 rounded border text-xs"
                        />
                      </td>
                      <td className="px-2 py-1.5 min-w-[120px] max-w-[150px]">
                        {row.photoUrl ? (
                          <div className="flex items-center gap-2">
                            <img
                              src={row.photoUrl}
                              alt="Foto Aset"
                              onClick={() =>
                                setPreviewPhoto({
                                  url: row.photoUrl!,
                                  title: row.name || row.code,
                                  code: row.code,
                                })
                              }
                              className="w-10 h-10 object-cover rounded border border-zinc-300 shadow-xs cursor-pointer hover:opacity-80 transition shrink-0 bg-zinc-50"
                              title="Klik untuk memperbesar foto"
                            />
                            <div className="flex flex-col text-[10px] leading-tight min-w-0">
                              <label className="text-blue-600 hover:underline cursor-pointer font-medium whitespace-nowrap">
                                Ganti
                                <input
                                  type="file"
                                  accept="image/*"
                                  className="hidden"
                                  onChange={(e) => handleUploadImageForEditRow(row.id, e)}
                                />
                              </label>
                              <button
                                type="button"
                                onClick={() =>
                                  setEditRows((prev) =>
                                    prev.map((r) => (r.id === row.id ? { ...r, photoUrl: '' } : r))
                                  )
                                }
                                className="text-red-500 hover:underline text-left mt-0.5 cursor-pointer font-medium whitespace-nowrap"
                              >
                                Hapus
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <label className="text-[11px] text-blue-600 underline leading-tight text-left cursor-pointer hover:text-blue-800">
                              <span className="block">Browse /</span>
                              <span className="block">ambil gambar</span>
                              <input
                                type="file"
                                accept="image/*"
                                className="hidden"
                                onChange={(e) => handleUploadImageForEditRow(row.id, e)}
                              />
                            </label>
                          </div>
                        )}
                      </td>
                      <td className="px-2 py-1.5 min-w-[90px]">
                        <select
                          value={row.typeCode}
                          onChange={(e) =>
                            setEditRows((prev) =>
                              prev.map((r) => (r.id === row.id ? { ...r, typeCode: e.target.value } : r))
                            )
                          }
                          className="bg-white border-zinc-300 text-zinc-900 w-full px-2 py-1 rounded border text-xs font-bold"
                        >
                          <option value="">-</option>
                          {assetTypes.map((t) => (
                            <option key={t.code} value={t.code}>
                              {t.code} — {t.name}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="px-2 py-1.5 min-w-[160px] bg-indigo-50/30">
                        <input
                          type="text"
                          value={row.code}
                          onChange={(e) => handleEditCodeLookup(row.id, e.target.value)}
                          placeholder="Masukkan kode aset"
                          className="bg-white border-indigo-400 text-indigo-900 font-mono font-bold w-full px-2 py-1 rounded border text-xs uppercase"
                        />
                      </td>
                      {showNilaiPasti42 && (
                        <td className="px-2 py-1.5 min-w-[140px]">
                          <input
                            type="text"
                            value={row.costActual}
                            onChange={(e) =>
                              setEditRows((prev) =>
                                prev.map((r) => (r.id === row.id ? { ...r, costActual: e.target.value } : r))
                              )
                            }
                            className="bg-white border-zinc-300 text-zinc-900 w-full px-2 py-1 rounded border text-xs text-right font-mono"
                          />
                        </td>
                      )}
                      {showNilaiExcel42 && (
                        <td className="px-2 py-1.5 min-w-[140px]">
                          <input
                            type="text"
                            value={row.costExcel}
                            onChange={(e) =>
                              setEditRows((prev) =>
                                prev.map((r) => (r.id === row.id ? { ...r, costExcel: e.target.value } : r))
                              )
                            }
                            className="bg-white border-zinc-300 text-zinc-900 w-full px-2 py-1 rounded border text-xs text-right font-mono"
                          />
                        </td>
                      )}
                      {showSupplier42 && (
                        <td className="px-2 py-1.5 min-w-[140px]">
                          <input
                            type="text"
                            value={row.supplier}
                            onChange={(e) =>
                              setEditRows((prev) =>
                                prev.map((r) => (r.id === row.id ? { ...r, supplier: e.target.value } : r))
                              )
                            }
                            className="bg-white border-zinc-300 text-zinc-900 w-full px-2 py-1 rounded border text-xs"
                          />
                        </td>
                      )}
                      <td className="px-2 py-1.5 min-w-[110px]">
                        <input
                          type="date"
                          value={row.buyDate}
                          onChange={(e) =>
                            setEditRows((prev) =>
                              prev.map((r) => (r.id === row.id ? { ...r, buyDate: e.target.value } : r))
                            )
                          }
                          className="bg-white border-zinc-300 text-zinc-900 w-full px-1.5 py-1 rounded border text-xs font-mono"
                        />
                      </td>
                      <td className="px-2 py-1.5 min-w-[100px]">
                        <div className="flex gap-1">
                          <input
                            type="text"
                            value={row.readerTap}
                            onChange={(e) =>
                              setEditRows((prev) =>
                                prev.map((r) => (r.id === row.id ? { ...r, readerTap: e.target.value } : r))
                              )
                            }
                            placeholder="TAP"
                            className="bg-white border-zinc-300 text-zinc-900 w-1/2 px-1.5 py-1 rounded border text-[11px] font-mono"
                          />
                          <input
                            type="text"
                            value={row.readerSwipe}
                            onChange={(e) =>
                              setEditRows((prev) =>
                                prev.map((r) => (r.id === row.id ? { ...r, readerSwipe: e.target.value } : r))
                              )
                            }
                            placeholder="SWP"
                            className="bg-white border-zinc-300 text-zinc-900 w-1/2 px-1.5 py-1 rounded border text-[11px] font-mono"
                          />
                        </div>
                      </td>
                      <td className="px-2 py-1.5 min-w-[110px]">
                        <input
                          type="text"
                          value={row.playPrice}
                          onChange={(e) =>
                            setEditRows((prev) =>
                              prev.map((r) => (r.id === row.id ? { ...r, playPrice: e.target.value } : r))
                            )
                          }
                          className="bg-white border-zinc-300 text-zinc-900 w-full px-2 py-1 rounded border text-xs text-right font-mono"
                        />
                      </td>
                      <td className="px-2 py-1.5 min-w-[110px]">
                        <input
                          type="date"
                          value={row.entryDate}
                          readOnly
                          disabled
                          title="Tanggal masuk hanya berubah lewat 4.4 ROTASI KELUAR"
                          className="bg-zinc-100 border-zinc-200 text-zinc-500 w-full px-1.5 py-1 rounded border text-xs font-mono cursor-not-allowed"
                        />
                      </td>
                      <td className="px-2 py-1.5 min-w-[180px]">
                        <textarea
                          rows={1}
                          value={row.notes}
                          placeholder="Ket - bisa isi banyak baris"
                          onChange={(e) =>
                            setEditRows((prev) =>
                              prev.map((r) => (r.id === row.id ? { ...r, notes: e.target.value } : r))
                            )
                          }
                          onInput={(e) => {
                            const target = e.currentTarget;
                            target.style.height = 'auto';
                            target.style.height = `${target.scrollHeight}px`;
                          }}
                          className="bg-white border-zinc-300 text-zinc-900 w-full px-2 py-1 rounded border text-xs resize-none overflow-hidden leading-snug whitespace-pre-wrap block"
                        />
                      </td>
                      <td className="px-2 py-1.5 text-center min-w-[70px]">
                        <button
                          type="button"
                          onClick={() => {
                            if (editRows.length > 1) {
                              setEditRows((prev) => prev.filter((r) => r.id !== row.id));
                            }
                          }}
                          className="px-2 py-1 rounded bg-red-600 text-white text-[11px] font-semibold hover:bg-red-700 transition cursor-pointer"
                        >
                          Hapus
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="shrink-0 p-2 sm:p-2.5 text-[11px] bg-blue-50/95 text-blue-700 border-t border-blue-100 shadow-xs">
              💡 <strong>Catatan:</strong> Aktivitas EDIT hanya merubah data aset. Untuk memindahkan aset ke lokasi lain,
              gunakan <strong>4.4 ROTASI</strong>.
            </div>
          </div>
        )}

        {/* ==================================================== */}
        {/* 4.3 HAPUS TAB                                        */}
        {/* ==================================================== */}
        {activeSubTab === 'hapus' && can43 && (
          <div className="bg-white border border-zinc-200 rounded-xl shadow-xs flex flex-col flex-1 min-h-0 overflow-hidden">
            <div className="shrink-0 p-2.5 sm:p-3 flex flex-wrap items-center justify-between gap-2 border-b border-zinc-200">
              <div className="font-bold text-sm text-zinc-900">
                4.3 HAPUS :{' '}
                <span className="font-normal text-zinc-500 text-xs">
                  *data aset yang akan dihapus dari database aktif
                </span>
              </div>
              <div className="flex gap-2 flex-wrap items-center">
                <button
                  type="button"
                  onClick={() =>
                    setDeleteRows((prev) => [
                      ...prev,
                      {
                        id: 'del-' + Date.now().toString(36),
                        code: '',
                        locationCode: '',
                        name: '',
                        typeCode: '',
                        costActual: '',
                        costExcel: '',
                        supplier: '',
                        buyDate: '',
                        readerTap: '',
                        readerSwipe: '',
                        playPrice: '',
                        entryDate: '',
                        deleteDate: todayStr,
                        notes: '',
                      },
                    ])
                  }
                  className="inline-flex items-center justify-center gap-1.5 rounded-lg font-semibold transition whitespace-nowrap h-9 px-3 text-xs border border-zinc-300 hover:bg-zinc-50 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" /> Tambah Baris
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (deleteRows.length > 1) setDeleteRows((prev) => prev.slice(0, -1));
                  }}
                  className="inline-flex items-center justify-center gap-1.5 rounded-lg font-semibold transition whitespace-nowrap h-9 px-3 text-xs border border-red-200 bg-red-50 text-red-700 hover:bg-red-100 cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" /> Hapus Baris
                </button>

                {/* Tombol Isi tabel dari Excel (Menu 4.3) */}
                {hasButtonAccess('btn-import-excel-4.3') && (
                  <>
                    <input
                      type="file"
                      accept=".xlsx,.xls,.csv"
                      ref={deleteFileInputRef}
                      className="hidden"
                      onChange={handleImportExcelHapus}
                    />
                    <button
                      type="button"
                      onClick={() => setDeleteImportModalOpen(true)}
                      className="inline-flex items-center justify-center gap-1.5 rounded-lg font-semibold transition whitespace-nowrap h-9 px-3 text-xs bg-emerald-700 text-white hover:bg-emerald-800 cursor-pointer shadow-xs"
                      title="Isi tabel Hapus dari file Excel (.xlsx / .xls)"
                    >
                      <Upload className="w-3.5 h-3.5" /> Isi tabel dari Excel
                    </button>
                  </>
                )}

                {hasButtonAccess('btn-hapus-aset-4.3') && (
                  <button
                    type="button"
                    onClick={handleConfirmDelete}
                    disabled={deleteLockedInfo.isLocked}
                    className={`inline-flex items-center justify-center gap-1.5 rounded-lg font-semibold transition whitespace-nowrap h-9 text-xs px-4 shadow-xs ${
                      deleteLockedInfo.isLocked
                        ? 'bg-zinc-300 text-zinc-500 cursor-not-allowed border border-zinc-300'
                        : 'bg-red-600 text-white hover:bg-red-700 cursor-pointer'
                    }`}
                    title={deleteLockedInfo.isLocked ? 'Periode terkunci di menu 4.5' : 'Hapus data aset'}
                  >
                    {deleteLockedInfo.isLocked ? <Lock className="w-3.5 h-3.5 inline mr-1 text-zinc-500" /> : null} Hapus data
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
                <ResetButtonHapus />
              </div>
            </div>

            {/* Banner Notifikasi Hasil Impor Excel di 4.3 HAPUS */}
            {deleteImportResult && (
              <div
                className={`mx-4 mt-3 mb-2 p-3.5 rounded-xl border flex items-start justify-between gap-3 shadow-xs animate-in fade-in duration-150 ${
                  deleteImportResult.errors.length > 0
                    ? 'bg-amber-50 border-amber-300 text-amber-900'
                    : 'bg-emerald-50 border-emerald-300 text-emerald-900'
                }`}
              >
                <div className="space-y-1 text-xs flex-1">
                  <div className="font-bold flex items-center gap-1.5">
                    {deleteImportResult.errors.length > 0 ? (
                      <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                    ) : (
                      <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                    )}
                    <span>Hasil Impor Excel Tabel Hapus Aset:</span>
                  </div>
                  <div className="text-zinc-700">
                    Berhasil: <strong>{deleteImportResult.successCount} data</strong> masuk ke tabel HAPUS sebagai draft.
                    {deleteImportResult.errors.length > 0 && (
                      <>
                        {' '}| Gagal: <strong className="text-red-700">{deleteImportResult.errors.length} data ditolak</strong>.
                      </>
                    )}
                  </div>
                  {deleteImportResult.errors.length > 0 && (
                    <div className="mt-2 max-h-36 overflow-y-auto bg-white/90 p-2.5 rounded-lg border border-amber-200 text-[11px] font-mono space-y-1">
                      <div className="font-sans font-bold text-red-700 text-[11px] mb-1">
                        Daftar Baris Ditolak:
                      </div>
                      {deleteImportResult.errors.map((err, idx) => (
                        <div key={idx} className="text-red-700">
                          • {err}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => setDeleteImportResult(null)}
                  className="text-zinc-400 hover:text-zinc-700 p-1 cursor-pointer shrink-0"
                  title="Tutup notifikasi"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* Banner Periode Terkunci di 4.3 */}
            {deleteLockedInfo.isLocked && (
              <div className="mx-4 mt-3 mb-2 p-3.5 bg-red-50 border-2 border-red-500 rounded-xl flex items-start gap-3 shadow-xs animate-in fade-in duration-150">
                <div className="p-2 bg-red-100 text-red-700 rounded-lg shrink-0 mt-0.5">
                  <Lock className="w-5 h-5 text-red-600" />
                </div>
                <div className="flex-1 text-xs">
                  <div className="font-bold text-red-900 text-sm flex items-center gap-2">
                    PERIODE TERKUNCI ({deleteLockedInfo.locationCode} - {MONTH_NAMES[deleteLockedInfo.month - 1]} {deleteLockedInfo.year})
                  </div>
                  <div className="text-red-800 mt-1 leading-relaxed">
                    Aset <strong>{deleteLockedInfo.assetCode}</strong> di lokasi <strong>{deleteLockedInfo.locationCode}</strong> berada pada periode yang telah <strong>DITUTUP</strong> di <strong>Menu 4.5 TUTUP PERIODE</strong>.
                    Anda tidak bisa menghapus aset pada periode yang ditutup. Silakan lakukan <strong>BUKA PERIODE</strong> terlebih dahulu di menu 4.5 jika ingin menghapus data.
                  </div>
                </div>
              </div>
            )}

            <div className="table-wrapper flex-1 min-h-0 overflow-auto relative">
              <table
                ref={tableRefHapus}
                className={`w-full text-xs table-assetflow table-padat table-entri resizable-table ${
                  gridLines ? 'table-gridlines-active' : ''
                }`}
              >
                <thead className="sticky top-0 z-20 bg-[#1e40af] text-white shadow-xs">
                  <tr>
                    <th className="px-3 py-2 font-semibold min-w-[110px] bg-[#1e40af]">LOKASI</th>
                    <th className="px-3 py-2 font-semibold min-w-[45px] text-center bg-[#1e40af]">NO</th>
                    <th className="px-3 py-2 font-semibold min-w-[260px] bg-[#1e40af]">NAMA ASET</th>
                    <th className="px-3 py-2 font-semibold min-w-[80px] text-center bg-[#1e40af]">JENIS</th>
                    <th className="px-3 py-2 font-semibold min-w-[160px] bg-[#1e40af]">KODE (kunci)</th>
                    <th className="px-3 py-2 font-semibold min-w-[130px] text-right bg-[#1e40af]">NILAI PEROLEHAN</th>
                    <th className="px-3 py-2 font-semibold min-w-[110px] bg-[#1e40af]">TGL MASUK</th>
                    <th className="px-3 py-2 font-semibold min-w-[120px] bg-[#1e40af]">TANGGAL HAPUS</th>
                    <th className="px-3 py-2 font-semibold min-w-[160px] bg-[#1e40af]">KETERANGAN HAPUS</th>
                    <th className="px-3 py-2 font-semibold min-w-[70px] text-center bg-[#1e40af]">AKSI</th>
                  </tr>
                </thead>
                <tbody>
                  {deleteRows.map((row, idx) => (
                    <tr key={row.id} className="border-b border-zinc-200/70 hover:bg-red-50/30">
                      <td className="px-2 py-1.5 min-w-[110px] font-bold text-zinc-700">{row.locationCode || '-'}</td>
                      <td className="px-2 py-1.5 text-center text-zinc-400 font-mono text-[11px]">{idx + 1}</td>
                      <td className="px-2 py-1.5 min-w-[260px] text-zinc-700">{row.name || '-'}</td>
                      <td className="px-2 py-1.5 text-center font-bold text-zinc-600">{row.typeCode || '-'}</td>
                      <td className="px-2 py-1.5 min-w-[160px]">
                        <input
                          type="text"
                          value={row.code}
                          onChange={(e) => handleDeleteCodeLookup(row.id, e.target.value)}
                          placeholder="Masukkan kode aset"
                          className="bg-white border-red-300 text-red-900 font-mono font-bold w-full px-2 py-1 rounded border text-xs uppercase"
                        />
                      </td>
                      <td className="px-2 py-1.5 text-right font-mono text-zinc-700 font-medium">
                        {row.costActual ? formatRupiahDecimal2(row.costActual) : '-'}
                      </td>
                      <td className="px-2 py-1.5 text-center font-mono text-zinc-500">{formatDdMmmYy(row.entryDate)}</td>
                      <td className="px-2 py-1.5 min-w-[120px]">
                        <input
                          type="date"
                          value={row.deleteDate}
                          onChange={(e) =>
                            setDeleteRows((prev) =>
                              prev.map((r) => (r.id === row.id ? { ...r, deleteDate: e.target.value } : r))
                            )
                          }
                          className="bg-white border-zinc-300 text-zinc-900 w-full px-1.5 py-1 rounded border text-xs font-mono font-semibold"
                        />
                      </td>
                      <td className="px-2 py-1.5 min-w-[160px]">
                        <input
                          type="text"
                          value={row.notes}
                          onChange={(e) =>
                            setDeleteRows((prev) =>
                              prev.map((r) => (r.id === row.id ? { ...r, notes: e.target.value } : r))
                            )
                          }
                          placeholder="Alasan / no berita acara..."
                          className="bg-white border-zinc-300 text-zinc-900 w-full px-2 py-1 rounded border text-xs"
                        />
                      </td>
                      <td className="px-2 py-1.5 text-center min-w-[70px]">
                        <button
                          type="button"
                          onClick={() => {
                            if (deleteRows.length > 1) {
                              setDeleteRows((prev) => prev.filter((r) => r.id !== row.id));
                            }
                          }}
                          className="px-2 py-1 rounded bg-zinc-200 text-zinc-700 text-[11px] font-semibold hover:bg-zinc-300 transition cursor-pointer"
                        >
                          Batal
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="shrink-0 p-2 sm:p-2.5 text-[11px] bg-red-50/95 text-red-700 border-t border-red-100 shadow-xs">
              ⚠️ <strong>Peringatan:</strong> Aktivitas HAPUS otomatis akan tercatat di riwayat mutasi dan menghilangkan
              data dari <strong>1. DATA RINCI ASET</strong>.
            </div>
          </div>
        )}

        {/* ==================================================== */}
        {/* 4.4 ROTASI TAB (KELUAR & MASUK)                      */}
        {/* ==================================================== */}
        {activeSubTab === 'rotasi' && can44 && (
          <div className="flex-1 min-h-0 overflow-y-auto space-y-4 pr-1">
            <div className="flex flex-wrap gap-2" role="tablist">
              <button
                type="button"
                role="tab"
                aria-selected={activeRotationSubTab === 'keluar'}
                onClick={() => setActiveRotationSubTab('keluar')}
                className={`px-4 h-9 rounded-full text-xs font-bold transition whitespace-nowrap cursor-pointer ${
                  activeRotationSubTab === 'keluar'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'bg-zinc-100 text-zinc-700 hover:bg-zinc-200'
                }`}
              >
                4.4.1 ROTASI KELUAR
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={activeRotationSubTab === 'masuk'}
                onClick={() => setActiveRotationSubTab('masuk')}
                className={`px-4 h-9 rounded-full text-xs font-bold transition whitespace-nowrap cursor-pointer ${
                  activeRotationSubTab === 'masuk'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'bg-zinc-100 text-zinc-700 hover:bg-zinc-200'
                }`}
              >
                4.4.2 ROTASI MASUK ({incomingRotations.length})
              </button>
            </div>

            {/* 4.4.1 ROTASI KELUAR */}
            {activeRotationSubTab === 'keluar' && (
              <div className="space-y-6">
                <div className="bg-white border border-zinc-200 rounded-xl shadow-xs overflow-hidden">
                  <div className="p-4 border-b border-zinc-200">
                    <div className="font-bold text-xs text-zinc-900">4.4.1 ROTASI KELUAR:</div>
                    <div className="text-[11px] text-zinc-500 mt-0.5">
                      *pindahkan aset dari LOKASI AWAL ke LOKASI LAIN
                    </div>
                    <div className="flex gap-2 mt-3 flex-wrap items-center">
                      <button
                        type="button"
                        onClick={() =>
                          setRotationOutRows((prev) => [
                            ...prev,
                            {
                              id: 'rotout-' + Date.now().toString(36),
                              code: '',
                              name: '',
                              typeCode: '',
                              fromLocationCode: '',
                              toLocationCode: '',
                              exitDate: todayStr,
                              readerTap: '',
                              readerSwipe: '',
                            },
                          ])
                        }
                        className="inline-flex items-center justify-center gap-1.5 rounded-lg font-semibold transition whitespace-nowrap h-9 px-3 text-xs border border-zinc-300 hover:bg-zinc-50 cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" /> Tambah Baris
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          if (rotationOutRows.length > 1) setRotationOutRows((prev) => prev.slice(0, -1));
                        }}
                        className="inline-flex items-center justify-center gap-1.5 rounded-lg font-semibold transition whitespace-nowrap h-9 px-3 text-xs border border-red-200 bg-red-50 text-red-700 hover:bg-red-100 cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" /> Hapus Baris
                      </button>

                      {/* Tombol Isi tabel dari Excel (Menu 4.4.1) */}
                      {hasButtonAccess('btn-import-excel-4.4.1') && (
                        <>
                          <input
                            type="file"
                            accept=".xlsx,.xls,.csv"
                            ref={rotOutFileInputRef}
                            className="hidden"
                            onChange={handleImportExcelRotOut}
                          />
                          <button
                            type="button"
                            onClick={() => setRotOutImportModalOpen(true)}
                            className="inline-flex items-center justify-center gap-1.5 rounded-lg font-semibold transition whitespace-nowrap h-9 px-3 text-xs bg-emerald-700 text-white hover:bg-emerald-800 cursor-pointer shadow-xs"
                            title="Isi tabel Rotasi Keluar dari file Excel (.xlsx / .xls)"
                          >
                            <Upload className="w-3.5 h-3.5" /> Isi tabel dari Excel
                          </button>
                        </>
                      )}

                      {hasButtonAccess('btn-eksekusi-rotasi-4.4') && (
                        <button
                          type="button"
                          onClick={handleSaveRotOut}
                          disabled={rotOutLockedInfo.isLocked}
                          className={`inline-flex items-center justify-center gap-1.5 rounded-lg font-semibold transition whitespace-nowrap h-9 px-3 text-xs shadow-xs ${
                            rotOutLockedInfo.isLocked
                              ? 'bg-zinc-300 text-zinc-500 cursor-not-allowed border border-zinc-300'
                              : 'bg-blue-600 text-white hover:bg-blue-700 cursor-pointer'
                          }`}
                          title={rotOutLockedInfo.isLocked ? 'Periode terkunci di menu 4.5' : 'Simpan Data Rotasi'}
                        >
                          {rotOutLockedInfo.isLocked ? <Lock className="w-3.5 h-3.5 inline mr-1 text-zinc-500" /> : null} Simpan Data
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
                      <ResetButtonRotOut />
                    </div>
                  </div>

                  {/* Banner Notifikasi Hasil Impor Excel di 4.4.1 ROTASI KELUAR */}
                  {rotOutImportResult && (
                    <div
                      className={`mx-4 mt-3 mb-2 p-3.5 rounded-xl border flex items-start justify-between gap-3 shadow-xs animate-in fade-in duration-150 ${
                        rotOutImportResult.errors.length > 0
                          ? 'bg-amber-50 border-amber-300 text-amber-900'
                          : 'bg-emerald-50 border-emerald-300 text-emerald-900'
                      }`}
                    >
                      <div className="space-y-1 text-xs flex-1">
                        <div className="font-bold flex items-center gap-1.5">
                          {rotOutImportResult.errors.length > 0 ? (
                            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                          ) : (
                            <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                          )}
                          <span>Hasil Impor Excel Tabel Rotasi Keluar:</span>
                        </div>
                        <div className="text-zinc-700">
                          Berhasil: <strong>{rotOutImportResult.successCount} data</strong> masuk ke tabel sebagai draft.
                          {rotOutImportResult.errors.length > 0 && (
                            <>
                              {' '}| Gagal: <strong className="text-red-700">{rotOutImportResult.errors.length} baris ditolak</strong>.
                            </>
                          )}
                        </div>
                        {rotOutImportResult.errors.length > 0 && (
                          <div className="mt-2 max-h-36 overflow-y-auto bg-white/90 p-2.5 rounded-lg border border-amber-200 text-[11px] font-mono space-y-1">
                            <div className="font-sans font-bold text-red-700 text-[11px] mb-1">
                              Daftar Baris Ditolak:
                            </div>
                            {rotOutImportResult.errors.map((err, idx) => (
                              <div key={idx} className="text-red-700">
                                • {err}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => setRotOutImportResult(null)}
                        className="text-zinc-400 hover:text-zinc-700 p-1 cursor-pointer shrink-0"
                        title="Tutup notifikasi"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  )}


                  {/* Banner Periode Terkunci di 4.4.1 */}
                  {rotOutLockedInfo.isLocked && (
                    <div className="mx-4 mt-3 mb-2 p-3.5 bg-red-50 border-2 border-red-500 rounded-xl flex items-start gap-3 shadow-xs animate-in fade-in duration-150">
                      <div className="p-2 bg-red-100 text-red-700 rounded-lg shrink-0 mt-0.5">
                        <Lock className="w-5 h-5 text-red-600" />
                      </div>
                      <div className="flex-1 text-xs">
                        <div className="font-bold text-red-900 text-sm flex items-center gap-2">
                          PERIODE TERKUNCI ({rotOutLockedInfo.locationCode} - {MONTH_NAMES[rotOutLockedInfo.month - 1]} {rotOutLockedInfo.year})
                        </div>
                        <div className="text-red-800 mt-1 leading-relaxed">
                          Lokasi asal <strong>{rotOutLockedInfo.locationCode}</strong> pada tanggal keluar ini telah <strong>DITUTUP</strong> di <strong>Menu 4.5 TUTUP PERIODE</strong>.
                          Anda tidak bisa melakukan rotasi keluar aset dari periode yang ditutup. Silakan lakukan <strong>BUKA PERIODE</strong> terlebih dahulu di menu 4.5 jika ingin merotasi data.
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="overflow-auto max-h-[70vh]">
                    <table
                      ref={tableRefRotOut}
                      className={`w-full text-xs table-assetflow table-padat resizable-table ${
                        gridLines ? 'table-gridlines-active' : ''
                      }`}
                    >
                      <thead className="sticky top-0 z-20 bg-[#1e40af] text-white shadow-xs">
                        <tr>
                          <th className="px-3 py-2 text-center font-semibold whitespace-nowrap w-[45px] bg-[#1e40af]">NO</th>
                          <th className="px-3 py-2 text-left font-semibold whitespace-nowrap min-w-[200px] bg-[#1e40af]">NAMA ASSET</th>
                          <th className="px-3 py-2 text-center font-semibold whitespace-nowrap w-[70px] bg-[#1e40af]">JENIS</th>
                          <th className="px-3 py-2 text-left font-semibold whitespace-nowrap min-w-[150px] bg-[#1e40af]">
                            KODE (kunci)
                          </th>
                          <th className="px-3 py-2 text-left font-semibold whitespace-nowrap min-w-[130px] bg-[#1e40af]">
                            READER TAP
                          </th>
                          <th className="px-3 py-2 text-left font-semibold whitespace-nowrap min-w-[130px] bg-[#1e40af]">
                            READER SWIPE
                          </th>
                          <th className="px-3 py-2 text-center font-semibold whitespace-nowrap min-w-[140px]">
                            TANGGAL KELUAR
                          </th>
                          <th className="px-3 py-2 text-center font-semibold whitespace-nowrap min-w-[120px]">
                            DARI LOKASI
                          </th>
                          <th className="px-3 py-2 text-left font-semibold whitespace-nowrap min-w-[200px]">
                            KE LOKASI
                          </th>
                          <th className="px-3 py-2 text-center font-semibold whitespace-nowrap w-[70px]">AKSI</th>
                        </tr>
                      </thead>
                      <tbody>
                        {rotationOutRows.map((row, idx) => (
                          <tr key={row.id} className="border-b border-zinc-200/70 hover:bg-zinc-50/60">
                            <td className="px-3 py-2 text-center text-zinc-400 font-mono text-[11px]">{idx + 1}</td>
                            <td className="px-3 py-2 font-medium text-zinc-800">{row.name || '-'}</td>
                            <td className="px-3 py-2 text-center font-bold text-zinc-600">{row.typeCode || '-'}</td>
                            <td className="px-3 py-2 min-w-[150px]">
                              <input
                                type="text"
                                value={row.code}
                                onChange={(e) => handleRotOutLookup(row.id, e.target.value)}
                                placeholder="Masukkan kode aset"
                                className="bg-white border-zinc-300 text-zinc-900 w-full px-2 py-1.5 rounded-lg border text-xs font-mono uppercase"
                              />
                            </td>
                            <td className="px-3 py-2 min-w-[130px]">
                              <input
                                type="text"
                                value={row.readerTap || ''}
                                onChange={(e) =>
                                  setRotationOutRows((prev) =>
                                    prev.map((r) => (r.id === row.id ? { ...r, readerTap: e.target.value } : r))
                                  )
                                }
                                placeholder="Reader Tap"
                                className="bg-white border-zinc-300 text-zinc-900 w-full px-2 py-1.5 rounded-lg border text-xs"
                              />
                            </td>
                            <td className="px-3 py-2 min-w-[130px]">
                              <input
                                type="text"
                                value={row.readerSwipe || ''}
                                onChange={(e) =>
                                  setRotationOutRows((prev) =>
                                    prev.map((r) => (r.id === row.id ? { ...r, readerSwipe: e.target.value } : r))
                                  )
                                }
                                placeholder="Reader Swipe"
                                className="bg-white border-zinc-300 text-zinc-900 w-full px-2 py-1.5 rounded-lg border text-xs"
                              />
                            </td>
                            <td className="px-3 py-2 min-w-[140px]">
                              <input
                                type="date"
                                value={row.exitDate}
                                onChange={(e) =>
                                  setRotationOutRows((prev) =>
                                    prev.map((r) => (r.id === row.id ? { ...r, exitDate: e.target.value } : r))
                                  )
                                }
                                className="bg-white border-zinc-300 text-zinc-900 w-full px-2 py-1.5 rounded-lg border text-xs font-mono"
                              />
                            </td>
                            <td className="px-3 py-2 text-center font-bold text-zinc-800">
                              {row.fromLocationCode || '-'}
                            </td>
                            <td className="px-3 py-2 min-w-[200px]">
                              <select
                                value={row.toLocationCode}
                                onChange={(e) =>
                                  setRotationOutRows((prev) =>
                                    prev.map((r) => (r.id === row.id ? { ...r, toLocationCode: e.target.value } : r))
                                  )
                                }
                                className="bg-white border-zinc-300 text-zinc-900 w-full px-2 py-1.5 rounded-lg border text-xs"
                              >
                                <option value="">Pilih lokasi tujuan</option>
                                {locations.map((loc) => (
                                  <option key={loc.code} value={loc.code}>
                                    {loc.code} - {loc.name}
                                  </option>
                                ))}
                              </select>
                            </td>
                            <td className="px-3 py-2 text-center">
                              <button
                                type="button"
                                onClick={() => {
                                  if (rotationOutRows.length > 1) {
                                    setRotationOutRows((prev) => prev.filter((r) => r.id !== row.id));
                                  }
                                }}
                                className="px-2 py-1 rounded bg-red-600 text-white text-[11px] font-semibold hover:bg-red-700 transition cursor-pointer"
                              >
                                Hapus
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div className="sticky bottom-0 z-20 p-3 text-[11px] bg-blue-50/95 backdrop-blur-xs text-blue-700 border-t border-blue-100 shadow-md">
                    💡 Saat melakukan rotasi, data aset akan berpindah secara resmi setelah Lokasi penerima melakukan
                    aktivitas <strong>4.4.2 ROTASI MASUK</strong> (konfirmasi diterima).
                  </div>
                </div>

                {/* Riwayat Rotasi Keluar Table */}
                <div className="bg-white border border-zinc-200 rounded-xl shadow-xs overflow-hidden">
                  <div className="p-4 border-b border-zinc-200">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <div className="font-bold text-sm text-zinc-900">
                          RIWAYAT ROTASI KELUAR ({filteredRotOutHistory.length}) —{' '}
                          <span className="font-normal text-zinc-500 text-xs">Pantau Status Pengiriman</span>
                        </div>
                        <div className="text-[11px] text-zinc-500 mt-0.5">
                          *status konfirmasi diisi oleh lokasi penerima lewat 4.4.2 ROTASI MASUK
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setShowHistory((prev) => !prev)}
                          className="inline-flex items-center justify-center gap-1.5 rounded-lg font-semibold transition whitespace-nowrap h-9 px-3 text-xs border border-zinc-300 hover:bg-zinc-50 cursor-pointer"
                        >
                          {showHistory ? '👁️ Sembunyikan Riwayat' : '👁️ Tampilkan Riwayat'}
                        </button>
                      </div>
                    </div>

                    {showHistory && (
                      <div className="flex flex-wrap items-end gap-2 mt-3">
                        <div className="min-w-[200px] flex-1 sm:flex-initial">
                          <label className="text-[11px] font-semibold text-zinc-500 block uppercase">CARI</label>
                          <input
                            type="text"
                            value={rotHistorySearch}
                            onChange={(e) => setRotHistorySearch(e.target.value)}
                            placeholder="Cari kode / nama aset..."
                            className="bg-white border-zinc-300 text-zinc-900 w-full mt-1 h-9 px-3 rounded-lg border text-xs"
                          />
                        </div>
                        <div className="min-w-[160px]">
                          <label className="text-[11px] font-semibold text-zinc-500 block uppercase">STATUS</label>
                          <select
                            value={rotHistoryStatus}
                            onChange={(e) => setRotHistoryStatus(e.target.value)}
                            className="bg-white border-zinc-300 text-zinc-900 w-full mt-1 h-9 px-3 rounded-lg border text-xs"
                          >
                            <option value="SEMUA">Semua Status</option>
                            <option value="MENUNGGU">MENUNGGU KONFIRMASI ⏳</option>
                            <option value="DITERIMA">SUDAH DITERIMA ✓</option>
                            <option value="DITOLAK">DITOLAK ✕</option>
                          </select>
                        </div>
                        <div className="min-w-[130px]">
                          <label className="text-[11px] font-semibold text-zinc-500 block uppercase">
                            DARI TANGGAL
                          </label>
                          <input
                            type="date"
                            value={rotHistoryDateFrom}
                            onChange={(e) => setRotHistoryDateFrom(e.target.value)}
                            className="bg-white border-zinc-300 text-zinc-900 w-full mt-1 h-9 px-3 rounded-lg border text-xs font-mono"
                          />
                        </div>
                        <div className="min-w-[130px]">
                          <label className="text-[11px] font-semibold text-zinc-500 block uppercase">
                            SAMPAI TANGGAL
                          </label>
                          <input
                            type="date"
                            value={rotHistoryDateTo}
                            onChange={(e) => setRotHistoryDateTo(e.target.value)}
                            className="bg-white border-zinc-300 text-zinc-900 w-full mt-1 h-9 px-3 rounded-lg border text-xs font-mono"
                          />
                        </div>
                        <div className="ml-auto flex items-end gap-2">
                          <button
                            type="button"
                            onClick={() => deleteRotationHistory('DITERIMA')}
                            className="inline-flex items-center justify-center gap-1 rounded-lg font-semibold transition whitespace-nowrap h-9 px-3 text-xs border border-zinc-300 hover:bg-zinc-50 text-zinc-700 cursor-pointer"
                          >
                            - Hapus Semua Diterima
                          </button>
                          <button
                            type="button"
                            onClick={() => deleteRotationHistory('DITOLAK')}
                            className="inline-flex items-center justify-center gap-1 rounded-lg font-semibold transition whitespace-nowrap h-9 px-3 text-xs border border-red-200 bg-red-50 text-red-700 hover:bg-red-100 cursor-pointer"
                          >
                            - Hapus Semua Ditolak
                          </button>
                          <ResetButtonRotHist />
                        </div>
                      </div>
                    )}
                  </div>

                  {showHistory && (
                    <div className="overflow-auto max-h-[60vh]">
                      <table
                        ref={tableRefRotHist}
                        className={`w-full text-xs table-assetflow table-padat resizable-table ${
                          gridLines ? 'table-gridlines-active' : ''
                        }`}
                      >
                        <thead className="sticky top-0 z-10 bg-[#1e40af] text-white">
                          <tr>
                            <th className="px-3 py-2 text-center font-semibold whitespace-nowrap w-[45px]">NO</th>
                            <th className="px-3 py-2 text-center font-semibold whitespace-nowrap min-w-[110px]">
                              TANGGAL KELUAR ↓
                            </th>
                            <th className="px-3 py-2 text-left font-semibold whitespace-nowrap min-w-[120px]">KODE</th>
                            <th className="px-3 py-2 text-left font-semibold whitespace-nowrap min-w-[220px]">
                              NAMA ASET
                            </th>
                            <th className="px-3 py-2 text-center font-semibold whitespace-nowrap min-w-[110px]">
                              READER TAP
                            </th>
                            <th className="px-3 py-2 text-center font-semibold whitespace-nowrap min-w-[110px]">
                              READER SWIPE
                            </th>
                            <th className="px-3 py-2 text-center font-semibold whitespace-nowrap min-w-[90px]">
                              DARI LOKASI
                            </th>
                            <th className="px-3 py-2 text-center font-semibold whitespace-nowrap min-w-[90px]">
                              KE LOKASI
                            </th>
                            <th className="px-3 py-2 text-center font-semibold whitespace-nowrap min-w-[140px]">
                              STATUS KONFIRMASI
                            </th>
                            <th className="px-3 py-2 text-center font-semibold whitespace-nowrap min-w-[110px]">
                              TGL KONFIRMASI
                            </th>
                            <th className="px-3 py-2 text-left font-semibold min-w-[150px]">KETERANGAN</th>
                          </tr>
                        </thead>
                        <tbody>
                          {filteredRotOutHistory.length === 0 ? (
                            <tr>
                              <td colSpan={11} className="px-3 py-10 text-center text-xs text-zinc-500">
                                Belum ada data riwayat rotasi keluar pada filter ini.
                              </td>
                            </tr>
                          ) : (
                            filteredRotOutHistory.map((rot, idx) => (
                              <tr key={rot.id} className="border-b border-zinc-200/70 hover:bg-zinc-50/60">
                                <td className="px-3 py-2 text-center text-zinc-400 font-mono text-[11px]">{idx + 1}</td>
                                <td className="px-3 py-2 text-center font-mono text-[11px] text-zinc-600">
                                  {formatDdMmmYy(rot.exitDate)}
                                </td>
                                <td className="px-3 py-2 font-mono font-bold text-zinc-900">{rot.assetCode}</td>
                                <td className="px-3 py-2 font-medium text-zinc-900">{rot.assetName}</td>
                                <td className="px-3 py-2 text-center font-mono text-[11px] text-zinc-700">{rot.readerTap || '-'}</td>
                                <td className="px-3 py-2 text-center font-mono text-[11px] text-zinc-700">{rot.readerSwipe || '-'}</td>
                                <td className="px-3 py-2 text-center font-bold text-zinc-800">{rot.fromLocationCode}</td>
                                <td className="px-3 py-2 text-center font-bold text-indigo-700">{rot.toLocationCode}</td>
                                <td className="px-3 py-2 text-center">
                                  <span
                                    className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                                      rot.status === 'DITERIMA'
                                        ? 'bg-emerald-100 text-emerald-800'
                                        : rot.status === 'DITOLAK'
                                        ? 'bg-red-100 text-red-800'
                                        : 'bg-amber-100 text-amber-800 animate-pulse'
                                    }`}
                                  >
                                    {rot.status === 'MENUNGGU' ? 'MENUNGGU KONFIRMASI ⏳' : rot.status}
                                  </span>
                                </td>
                                <td className="px-3 py-2 text-center font-mono text-[11px] text-zinc-600">
                                  {formatDdMmmYy(rot.confirmDate)}
                                </td>
                                <td className="px-3 py-2 text-zinc-500 text-[11px]">{rot.notes || '-'}</td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* 4.4.2 ROTASI MASUK */}
            {activeRotationSubTab === 'masuk' && (
              <div className="bg-white border border-zinc-200 rounded-xl shadow-xs overflow-hidden">
                <div className="p-4 border-b border-zinc-200 flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <div className="font-bold text-sm text-zinc-900">4.4.2 ROTASI MASUK:</div>
                    <div className="text-[11px] text-zinc-500 mt-0.5">
                      *penerima hanya perlu klik <strong>KONFIRMASI DITERIMA</strong> jika barang sudah sampai
                    </div>
                    <div className="text-[11px] text-zinc-500">
                      *jika barang tidak sampai / ditolak, klik <strong>KONFIRMASI DITOLAK</strong>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-zinc-600">Filter Lokasi Penerima:</span>
                      <select
                        value={rotInLocationFilter}
                        onChange={(e) => setRotInLocationFilter(e.target.value)}
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
                    <ResetButtonRotIn />
                  </div>
                </div>

                <div className="overflow-auto max-h-[70vh]">
                  <table
                    ref={tableRefRotIn}
                    className={`w-full text-xs table-assetflow table-padat resizable-table ${
                      gridLines ? 'table-gridlines-active' : ''
                    }`}
                  >
                    <thead className="sticky top-0 z-20 bg-[#1e40af] text-white shadow-xs">
                      <tr>
                        <th className="px-3 py-2 text-center font-semibold whitespace-nowrap w-[45px]">NO</th>
                        <th className="px-3 py-2 text-left font-semibold whitespace-nowrap min-w-[220px]">
                          NAMA ASSET
                        </th>
                        <th className="px-3 py-2 text-center font-semibold whitespace-nowrap w-[60px]">JENIS</th>
                        <th className="px-3 py-2 text-left font-semibold whitespace-nowrap min-w-[120px]">KODE</th>
                        <th className="px-3 py-2 text-center font-semibold whitespace-nowrap min-w-[110px]">
                          READER TAP
                        </th>
                        <th className="px-3 py-2 text-center font-semibold whitespace-nowrap min-w-[110px]">
                          READER SWIPE
                        </th>
                        <th className="px-3 py-2 text-center font-semibold whitespace-nowrap min-w-[100px]">
                          TANGGAL KELUAR
                        </th>
                        <th className="px-3 py-2 text-center font-semibold whitespace-nowrap min-w-[90px]">DARI</th>
                        <th className="px-3 py-2 text-center font-semibold whitespace-nowrap min-w-[90px]">
                          KE (TUJUAN)
                        </th>
                        <th className="px-3 py-2 text-center font-semibold whitespace-nowrap min-w-[170px]">
                          KONFIRMASI
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {incomingRotations.length === 0 ? (
                        <tr>
                          <td colSpan={10} className="px-3 py-14 text-center text-xs text-zinc-500">
                            <div className="flex flex-col items-center justify-center gap-1">
                              <Check className="w-8 h-8 text-emerald-500 mb-1" />
                              <p className="font-semibold text-zinc-700">Tidak ada pengiriman rotasi yang menunggu konfirmasi.</p>
                              <p className="text-[11px] text-zinc-400">
                                Semua unit aset telah diterima atau belum ada rotasi keluar baru.
                              </p>
                            </div>
                          </td>
                        </tr>
                      ) : (
                        incomingRotations.map((rot, idx) => (
                          <tr key={rot.id} className="border-b border-zinc-200/70 hover:bg-zinc-50/60">
                            <td className="px-3 py-2 text-center text-zinc-400 font-mono text-[11px]">{idx + 1}</td>
                            <td className="px-3 py-2 font-medium text-zinc-900">{rot.assetName}</td>
                            <td className="px-3 py-2 text-center font-bold text-[11px] text-zinc-700">{rot.assetType}</td>
                            <td className="px-3 py-2 font-mono font-bold text-zinc-900">{rot.assetCode}</td>
                            <td className="px-3 py-2 text-center font-mono text-[11px] text-zinc-700 font-semibold">{rot.readerTap || '-'}</td>
                            <td className="px-3 py-2 text-center font-mono text-[11px] text-zinc-700 font-semibold">{rot.readerSwipe || '-'}</td>
                            <td className="px-3 py-2 text-center font-mono text-[11px] text-zinc-600">{formatDdMmmYy(rot.exitDate)}</td>
                            <td className="px-3 py-2 text-center font-bold text-zinc-800">{rot.fromLocationCode}</td>
                            <td className="px-3 py-2 text-center font-bold text-indigo-700">{rot.toLocationCode}</td>
                            <td className="px-3 py-2 text-center">
                              <div className="inline-flex items-center gap-2">
                                {(() => {
                                  const isLocked = isPeriodLocked(
                                    rot.toLocationCode,
                                    new Date().getMonth() + 1,
                                    new Date().getFullYear()
                                  );

                                  return (
                                    <>
                                      <button
                                        type="button"
                                        disabled={isLocked}
                                        onClick={() => {
                                          if (isLocked) {
                                            addToast(
                                              `Lokasi penerima ${rot.toLocationCode} periode ini sedang DITUTUP di menu 4.5. Buka periode terlebih dahulu.`,
                                              'error'
                                            );
                                            return;
                                          }
                                          confirmRotationIn(rot.id, true);
                                        }}
                                        className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold shadow-xs transition ${
                                          isLocked
                                            ? 'bg-zinc-200 text-zinc-400 cursor-not-allowed'
                                            : 'bg-emerald-600 text-white hover:bg-emerald-700 cursor-pointer'
                                        }`}
                                        title={isLocked ? 'Lokasi penerima terkunci di menu 4.5' : 'Konfirmasi penerimaan'}
                                      >
                                        <Check className="w-3.5 h-3.5" /> Diterima
                                      </button>
                                      <button
                                        type="button"
                                        disabled={isLocked}
                                        onClick={() => {
                                          if (isLocked) {
                                            addToast(
                                              `Lokasi penerima ${rot.toLocationCode} periode ini sedang DITUTUP di menu 4.5. Buka periode terlebih dahulu.`,
                                              'error'
                                            );
                                            return;
                                          }
                                          confirmRotationIn(rot.id, false);
                                        }}
                                        className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold shadow-xs transition ${
                                          isLocked
                                            ? 'bg-zinc-200 text-zinc-400 cursor-not-allowed'
                                            : 'bg-red-600 text-white hover:bg-red-700 cursor-pointer'
                                        }`}
                                        title={isLocked ? 'Lokasi penerima terkunci di menu 4.5' : 'Tolak rotasi'}
                                      >
                                        <X className="w-3.5 h-3.5" /> Tolak
                                      </button>
                                    </>
                                  );
                                })()}
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                <div className="sticky bottom-0 z-20 p-3 text-[11px] bg-indigo-50/95 backdrop-blur-xs text-indigo-700 border-t border-indigo-100 shadow-md">
                  💡 <strong>Catatan:</strong> Aktivitas Rotasi aset otomatis akan terkoneksi di{' '}
                  <strong>2. LAPORAN ROTASI ASET</strong> sesuai periode bulan yang di-input.
                </div>
              </div>
            )}
          </div>
        )}

        {/* ==================================================== */}
        {/* 4.5 TUTUP PERIODE TAB                                */}
        {/* ==================================================== */}
        {activeSubTab === 'tutup' && can45 && (
          <div className="bg-white border border-zinc-200 rounded-xl shadow-xs flex flex-col flex-1 min-h-0 overflow-hidden">
            <div className="shrink-0 p-2.5 sm:p-3 border-b border-zinc-200">
              <div className="font-bold text-sm text-zinc-900">4.5 TUTUP PERIODE AKUNTANSI</div>
              <div className="mt-4 space-y-3 max-w-[760px]">
                {/* Pilih Lokasi */}
                <div className="flex flex-wrap items-center gap-3">
                  <span className="text-[11px] font-semibold text-zinc-500 w-[110px]">Pilih Lokasi:</span>
                  <select
                    value={tutupLocation}
                    onChange={(e) => setTutupLocation(e.target.value)}
                    className="bg-white border-zinc-300 text-zinc-900 w-full mt-1 h-9 px-3 rounded-lg border text-xs max-w-[360px]"
                  >
                    {allowedLocations.map((loc) => (
                      <option key={loc.code} value={loc.code}>
                        {loc.code} - {loc.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Masukkan Periode */}
                <div className="flex flex-wrap items-center gap-3">
                  <span className="text-[11px] font-semibold text-zinc-500 w-[110px]">Masukkan periode:</span>
                  <select
                    value={tutupMonth}
                    onChange={(e) => setTutupMonth(e.target.value)}
                    className="bg-white border-zinc-300 text-zinc-900 w-full mt-1 h-9 px-3 rounded-lg border text-xs max-w-[160px]"
                  >
                    <option value="ALL">SEMUA BULAN</option>
                    {MONTH_NAMES.map((name, idx) => (
                      <option key={name} value={String(idx + 1)}>
                        {name}
                      </option>
                    ))}
                  </select>
                  <YearFilterInput
                    value={tutupYear}
                    onChange={setTutupYear}
                    className="w-full mt-1 max-w-[150px]"
                  />
                </div>

                {/* Tombol Tutup / Buka */}
                <div className="flex gap-4 pt-2">
                  {hasButtonAccess('btn-tutup-periode-4.5') && (
                    <button
                      type="button"
                      onClick={() => {
                        const m = tutupMonth === 'ALL' ? 'ALL' : parseInt(tutupMonth, 10);
                        const y = tutupYear === 'ALL' ? 'ALL' : parseInt(tutupYear, 10);
                        setPeriodLock(tutupLocation, m, y, 'TUTUP');
                      }}
                      className="inline-flex items-center justify-center gap-1.5 rounded-lg font-semibold transition whitespace-nowrap h-9 text-xs bg-red-600 text-white hover:bg-red-700 px-6 cursor-pointer shadow-xs"
                    >
                      <Lock className="w-3.5 h-3.5" /> TUTUP PERIODE
                    </button>
                  )}
                  {hasButtonAccess('btn-buka-periode-4.5') && (
                    <button
                      type="button"
                      onClick={() => {
                        const m = tutupMonth === 'ALL' ? 'ALL' : parseInt(tutupMonth, 10);
                        const y = tutupYear === 'ALL' ? 'ALL' : parseInt(tutupYear, 10);
                        setPeriodLock(tutupLocation, m, y, 'BUKA');
                      }}
                      className="inline-flex items-center justify-center gap-1.5 rounded-lg font-semibold transition whitespace-nowrap h-9 text-xs bg-emerald-700 text-white hover:bg-emerald-800 px-6 cursor-pointer shadow-xs"
                    >
                      <Unlock className="w-3.5 h-3.5" /> BUKA PERIODE
                    </button>
                  )}
                  <ResetButtonTutup />
                </div>
              </div>
            </div>

            {/* Locked Periods Table */}
            <div className="table-wrapper flex-1 min-h-0 overflow-auto relative">
              <table
                ref={tableRefTutup}
                className={`w-full text-xs table-assetflow table-padat resizable-table ${
                  gridLines ? 'table-gridlines-active' : ''
                }`}
              >
                <thead className="sticky top-0 z-20 bg-[#1e40af] text-white shadow-xs">
                  <tr>
                    <th className="px-3 py-2 text-center font-semibold whitespace-nowrap w-[45px] bg-[#1e40af]">NO</th>
                    <th className="px-3 py-2 text-left font-semibold whitespace-nowrap min-w-[140px] bg-[#1e40af]">LOKASI</th>
                    <th className="px-3 py-2 text-left font-semibold whitespace-nowrap w-[80px] bg-[#1e40af]">KODE</th>
                    <th className="px-3 py-2 text-left font-semibold whitespace-nowrap min-w-[200px] bg-[#1e40af]">NAMA</th>
                    <th className="px-3 py-2 text-center font-semibold whitespace-nowrap min-w-[120px] bg-[#1e40af]">PERIODE</th>
                    <th className="px-3 py-2 text-center font-semibold whitespace-nowrap min-w-[100px] bg-[#1e40af]">STATUS</th>
                    <th className="px-3 py-2 text-center font-semibold whitespace-nowrap min-w-[140px] bg-[#1e40af]">
                      TANGGAL TUTUP
                    </th>
                    {canAksi45 && (
                      <th className="px-3 py-2 text-center font-semibold whitespace-nowrap w-[100px] bg-[#1e40af]">AKSI</th>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {periodLocks.length === 0 ? (
                    <tr>
                      <td colSpan={canAksi45 ? 8 : 7} className="px-3 py-10 text-center text-xs text-zinc-500">
                        Belum ada periode yang dikunci. Semua lokasi aktif berstatus BUKA.
                      </td>
                    </tr>
                  ) : (
                    periodLocks.map((p, idx) => (
                      <tr key={p.id} className="border-b border-zinc-200/70 hover:bg-zinc-50/60">
                        <td className="px-3 py-2 text-center text-zinc-400 font-mono text-[11px]">{idx + 1}</td>
                        <td className="px-3 py-2 font-bold text-zinc-800">{p.locationCode}</td>
                        <td className="px-3 py-2 font-mono text-zinc-600">{p.locationCode}</td>
                        <td className="px-3 py-2 text-zinc-900 font-medium">{p.locationName || p.locationCode}</td>
                        <td className="px-3 py-2 text-center font-mono font-bold text-indigo-900">
                          {p.month === 'ALL' ? 'SEMUA BULAN' : MONTH_NAMES[p.month - 1]} {p.year}
                        </td>
                        <td className="px-3 py-2 text-center">
                          <span
                            className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                              p.status === 'TUTUP'
                                ? 'bg-red-100 text-red-800 border border-red-200'
                                : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                            }`}
                          >
                            {p.status === 'TUTUP' ? 'TERKUNCI 🔒' : 'TERBUKA 🔓'}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-center font-mono text-[11px] text-zinc-500">
                          {p.closedAt || '-'}
                        </td>
                        {canAksi45 && (
                          <td className="px-3 py-2 text-center">
                            <button
                              type="button"
                              onClick={() => setPeriodLock(p.locationCode, p.month, p.year, p.status === 'TUTUP' ? 'BUKA' : 'TUTUP')}
                              className="px-2.5 py-1 rounded text-[11px] font-semibold border border-zinc-300 hover:bg-zinc-100 transition cursor-pointer"
                            >
                              {p.status === 'TUTUP' ? 'Buka' : 'Kunci'}
                            </button>
                          </td>
                        )}
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <div className="shrink-0 p-2 sm:p-2.5 text-[11px] bg-amber-50/95 text-amber-800 italic border-t border-amber-200 shadow-xs">
              *Lokasi yang sudah melakukan 'TUTUP' periode tidak bisa lagi melakukan INPUT, EDIT, dan HAPUS. Kecuali
              melakukan 'BUKA' terlebih dahulu.
            </div>
          </div>
        )}
      </div>

      {/* Modal Import Excel 4.3 Hapus */}
      {deleteImportModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full p-6 border border-zinc-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-200 mb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
                  <FileSpreadsheet className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-zinc-900">Isi Tabel Hapus dari Excel</h3>
                  <p className="text-[11px] text-zinc-500">Khusus Role Akunting / Akunting Pusat</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setDeleteImportModalOpen(false)}
                className="text-zinc-400 hover:text-zinc-700 p-1 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs text-zinc-600 mb-5 leading-relaxed">
              <p>
                Fitur ini memvalidasi data langsung ke database <strong>1. DATA RINCI ASET</strong>.
                Hanya baris dengan <strong>KODE ASET</strong> yang terdaftar dan <strong>KODE LOKASI</strong> yang cocok yang akan dimasukkan ke tabel.
              </p>

              <div className="p-3 bg-zinc-50 rounded-lg border border-zinc-200 text-[11px] space-y-1">
                <div className="font-bold text-zinc-800">Format Kolom Template:</div>
                <div className="font-mono text-[10px] text-zinc-700 bg-white p-2 rounded border border-zinc-200 overflow-x-auto whitespace-nowrap">
                  KODE LOKASI | NO | NAMA | JENIS | KODE ASET | READER TAP/SWIPE | HARGA BERMAIN | TANGGAL HAPUS
                </div>
                <div className="text-zinc-500 mt-1">
                  * <strong>KODE LOKASI</strong> dan <strong>KODE ASET</strong> wajib diisi. Kolom lainnya boleh kosong karena akan di-lookup otomatis dari database.
                </div>
              </div>

              <div className="p-3 bg-amber-50 rounded-lg border border-amber-200 text-[11px] text-amber-900 flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  Data yang berhasil diimpor akan berstatus <strong>DRAFT</strong> di tabel Menu 4.3 HAPUS. Data aset belum terhapus dari database sebelum Anda menekan tombol merah <strong>"Hapus data"</strong>.
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between gap-2 pt-2 border-t border-zinc-100">
              <button
                type="button"
                onClick={downloadTemplateHapusAset}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-zinc-300 bg-white text-zinc-700 hover:bg-zinc-50 text-xs font-semibold cursor-pointer transition shadow-xs"
              >
                <FileDown className="w-4 h-4 text-emerald-700" />
                Unduh Template Excel
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setDeleteImportModalOpen(false)}
                  className="px-3.5 py-2 rounded-lg text-xs font-semibold text-zinc-600 hover:bg-zinc-100 cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={() => {
                    deleteFileInputRef.current?.click();
                  }}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-700 text-white hover:bg-emerald-800 text-xs font-semibold cursor-pointer transition shadow-xs"
                >
                  <Upload className="w-4 h-4" />
                  Pilih File Excel (.xlsx / .xls)
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Import Excel 4.4.1 Rotasi Keluar */}
      {rotOutImportModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full p-6 border border-zinc-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-200 mb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
                  <FileSpreadsheet className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-zinc-900">Isi Tabel Rotasi Keluar dari Excel</h3>
                  <p className="text-[11px] text-zinc-500">Khusus Role Akunting / Akunting Pusat</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setRotOutImportModalOpen(false)}
                className="text-zinc-400 hover:text-zinc-700 p-1 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs text-zinc-600 mb-5 leading-relaxed">
              <p>
                Sistem membaca file Excel dan memvalidasi ke database master aset & lokasi cabang Game Master.
              </p>

              <div className="p-3 bg-zinc-50 rounded-lg border border-zinc-200 text-[11px] space-y-1">
                <div className="font-bold text-zinc-800">Format Kolom Template:</div>
                <div className="font-mono text-[10px] text-zinc-700 bg-white p-2 rounded border border-zinc-200 overflow-x-auto whitespace-nowrap">
                  NO | NAMA ASSET | JENIS | KODE ASET | TANGGAL KELUAR | DARI LOKASI | KE LOKASI
                </div>
                <div className="text-zinc-500 mt-1 space-y-0.5">
                  <div>• <strong>KODE ASET</strong>: Wajib sesuai data yang ada di database aset aktif.</div>
                  <div>• <strong>DARI LOKASI</strong>: Wajib sesuai lokasi terkini aset tersebut di database.</div>
                  <div>• <strong>KE LOKASI</strong>: Wajib terdaftar di master lokasi dan berbeda dari lokasi asal.</div>
                </div>
              </div>

              <div className="p-3 bg-blue-50 rounded-lg border border-blue-200 text-[11px] text-blue-900 flex items-start gap-2">
                <FileCheck className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                <div>
                  Baris yang valid otomatis masuk ke tabel sebagai draft. Periksa kembali dan tekan tombol <strong>"Simpan Data"</strong> untuk mengeksekusi rotasi aset.
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between gap-2 pt-2 border-t border-zinc-100">
              <button
                type="button"
                onClick={downloadTemplateRotasiKeluar}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-zinc-300 bg-white text-zinc-700 hover:bg-zinc-50 text-xs font-semibold cursor-pointer transition shadow-xs"
              >
                <FileDown className="w-4 h-4 text-emerald-700" />
                Unduh Template Excel
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setRotOutImportModalOpen(false)}
                  className="px-3.5 py-2 rounded-lg text-xs font-semibold text-zinc-600 hover:bg-zinc-100 cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={() => {
                    rotOutFileInputRef.current?.click();
                  }}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-700 text-white hover:bg-emerald-800 text-xs font-semibold cursor-pointer transition shadow-xs"
                >
                  <Upload className="w-4 h-4" />
                  Pilih File Excel (.xlsx / .xls)
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <PhotoModal
        isOpen={!!previewPhoto}
        onClose={() => setPreviewPhoto(null)}
        title={previewPhoto?.title || 'Foto Aset'}
        photoUrl={previewPhoto?.url}
        assetCode={previewPhoto?.code}
      />
    </div>
  );
};


