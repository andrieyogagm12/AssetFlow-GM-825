import * as XLSX from 'xlsx';
import JSZip from 'jszip';
import ExcelJS from 'exceljs';
import { formatDdMmmYy } from './dateFormatter';

// -------------------------------------------------------------
// STYLING CONSTANTS (EXACT MATCH TO SPECIFICATIONS)
// -------------------------------------------------------------
// Bright cyan fill for headers, Menu 3 grand totals, and 7.2 subtotals (#00B0F0)
const CYAN_FILL: ExcelJS.Fill = {
  type: 'pattern',
  pattern: 'solid',
  fgColor: { argb: 'FF00B0F0' },
};

// Warm yellow fill for Total columns and Grand Total in Menu 7.2 (#FFFF99)
const YELLOW_FILL: ExcelJS.Fill = {
  type: 'pattern',
  pattern: 'solid',
  fgColor: { argb: 'FFFFFF99' },
};

// Thin black border for all cells
const THIN_BORDER: Partial<ExcelJS.Borders> = {
  top: { style: 'thin', color: { argb: 'FF000000' } },
  left: { style: 'thin', color: { argb: 'FF000000' } },
  bottom: { style: 'thin', color: { argb: 'FF000000' } },
  right: { style: 'thin', color: { argb: 'FF000000' } },
};

// Font styles
const FONT_DEFAULT: Partial<ExcelJS.Font> = {
  name: 'Calibri',
  size: 10,
  color: { argb: 'FF000000' },
};

const FONT_HEADER: Partial<ExcelJS.Font> = {
  name: 'Calibri',
  size: 10,
  bold: true,
  color: { argb: 'FF000000' },
};

const FONT_TITLE: Partial<ExcelJS.Font> = {
  name: 'Calibri',
  size: 11,
  bold: true,
  color: { argb: 'FF000000' },
};

export const saveWorkbook = async (workbook: ExcelJS.Workbook, filename: string): Promise<void> => {
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  const cleanName = filename.replace(/[/\\?%*:|"<>]/g, '_');
  a.download = cleanName.endsWith('.xlsx') ? cleanName : `${cleanName}.xlsx`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

// -------------------------------------------------------------
// IMAGE HELPER (FETCH & EMBED PICTURES INTO CELLS)
// -------------------------------------------------------------
const fetchImageAsBase64 = async (
  url: string
): Promise<{ base64: string; extension: 'png' | 'jpeg' } | null> => {
  try {
    if (!url) return null;
    const trimmed = url.trim();
    if (!trimmed) return null;

    if (trimmed.startsWith('data:image/')) {
      const match = trimmed.match(/^data:image\/(png|jpeg|jpg|webp);base64,(.+)$/i);
      if (match) {
        const ext = match[1].toLowerCase() === 'png' ? 'png' : 'jpeg';
        return { base64: match[2], extension: ext };
      }
    }

    // Attempt fetch for relative paths or remote URLs
    const res = await fetch(trimmed);
    if (!res.ok) return null;
    const blob = await res.blob();
    const isPng = blob.type.toLowerCase().includes('png');
    const buffer = await blob.arrayBuffer();
    const bytes = new Uint8Array(buffer);
    let binary = '';
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    const base64 = window.btoa(binary);
    return { base64, extension: isPng ? 'png' : 'jpeg' };
  } catch {
    return null;
  }
};

const embedImageToWorksheet = async (
  workbook: ExcelJS.Workbook,
  worksheet: ExcelJS.Worksheet,
  photoUrl: string,
  colNumber: number, // 1-indexed ExcelJS column
  rowNumber: number  // 1-indexed ExcelJS row
): Promise<boolean> => {
  try {
    const imgData = await fetchImageAsBase64(photoUrl);
    if (!imgData) return false;

    const imageId = workbook.addImage({
      base64: imgData.base64,
      extension: imgData.extension,
    });

    worksheet.addImage(imageId, {
      tl: { col: colNumber - 1 + 0.05, row: rowNumber - 1 + 0.05 } as any,
      br: { col: colNumber - 0.05, row: rowNumber - 0.05 } as any,
      editAs: 'oneCell',
    });
    return true;
  } catch {
    return false;
  }
};

import { HistoryMonthColumn, getYearColorStyle } from './assetHistoryColumns';

// -------------------------------------------------------------
// MENU 1: DATA RINCI ASET (SHEETS: MESIN, INVENTARIS, JOY'N FUN)
// -------------------------------------------------------------
export interface DataRinciExportItem {
  locationCode: string;
  name: string;
  photoUrl?: string;
  typeCode: string;
  code: string;
  costActual?: number | null;
  costExcel?: number | null;
  supplier?: string;
  buyDate?: string;
  readerTap?: string;
  readerSwipe?: string;
  playPrice?: number | null;
  entryDate?: string;
  notes?: string;
  history?: Record<string, string>;
}

export interface DataRinciExportOptions {
  mesinAssets: DataRinciExportItem[];
  invAssets: DataRinciExportItem[];
  jfAssets: DataRinciExportItem[];
  locationLabel: string;
  periodeLabel: string;
  filename: string;
  historyColumns?: HistoryMonthColumn[];
}

export const exportDataRinciAsetExcel = async (options: DataRinciExportOptions): Promise<void> => {
  const { mesinAssets, invAssets, jfAssets, locationLabel, periodeLabel, filename } = options;
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'GameMaster Ops • AssetFlow';
  workbook.created = new Date();

  const sheetsConfig = [
    { name: 'MESIN', title: 'DATA RINCI ASET MESIN & TAP READER', nameCol: 'NAMA MESIN', items: mesinAssets },
    { name: 'INVENTARIS', title: 'DATA RINCI ASET INVENTARIS', nameCol: 'NAMA INVENTARIS', items: invAssets },
    { name: "JOY'N FUN", title: "DATA RINCI ASET JOY'N FUN", nameCol: "NAMA JOY'N FUN", items: jfAssets },
  ];

  for (const cfg of sheetsConfig) {
    const ws = workbook.addWorksheet(cfg.name, {
      views: [{ state: 'frozen', ySplit: 5, showGridLines: true }],
    });

    // Baris 1: Judul Sheet (Bold)
    const titleCell = ws.getCell('A1');
    titleCell.value = cfg.title;
    titleCell.font = FONT_TITLE;

    // Baris 2: LOKASI : ${LOKASI} (Bold)
    const locLabelCell = ws.getCell('A2');
    locLabelCell.value = 'LOKASI';
    locLabelCell.font = FONT_TITLE;
    const locValCell = ws.getCell('B2');
    locValCell.value = `: ${locationLabel}`;
    locValCell.font = FONT_TITLE;

    // Baris 3: PERIODE : ${BULAN} ${TAHUN} (Bold)
    const perLabelCell = ws.getCell('A3');
    perLabelCell.value = 'PERIODE';
    perLabelCell.font = FONT_TITLE;
    const perValCell = ws.getCell('B3');
    perValCell.value = `: ${periodeLabel}`;
    perValCell.font = FONT_TITLE;

    // Baris 4: Kosong

    // Baris 5: Header Tabel (Sticky / Frozen)
    const baseHeaders = [
      'KODE LOKASI',
      'NO',
      cfg.nameCol,
      'FOTO FISIK',
      'JENIS',
      'KODE ASET',
      'NILAI PEROLEHAN PASTI',
      'NILAI PEROLEHAN EXCEL',
      'SUPPLIER',
      'TANGGAL BELI',
      'READER TAP',
      'READER SWIPE',
      'HARGA BERMAIN',
      'TANGGAL MASUK',
      'KETERANGAN',
    ];

    const histCols = options.historyColumns || [];
    const totalCols = baseHeaders.length + histCols.length;

    const headerRow = ws.getRow(5);
    headerRow.height = 30;
    baseHeaders.forEach((h, idx) => {
      const cell = headerRow.getCell(idx + 1);
      cell.value = h;
      cell.font = FONT_HEADER;
      cell.fill = CYAN_FILL;
      cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
      cell.border = THIN_BORDER;
    });

    // History Month Column Headers with per-year colors
    histCols.forEach((col, idx) => {
      const cell = headerRow.getCell(baseHeaders.length + 1 + idx);
      cell.value = `${col.monthName}\n${col.year}`;
      const colorStyle = getYearColorStyle(col.year);
      const hexColor = colorStyle.bg.replace('#', '');
      const isWhiteText = colorStyle.text.toLowerCase() === '#ffffff';
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: `FF${hexColor.toUpperCase()}` },
      };
      cell.font = {
        name: 'Calibri',
        size: 10,
        bold: true,
        color: { argb: isWhiteText ? 'FFFFFFFF' : 'FF000000' },
      };
      cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
      cell.border = THIN_BORDER;
    });

    // Baris 6+: Data Rows
    let currentRowNum = 6;
    if (cfg.items.length === 0) {
      // Jika data kosong, tampilkan pesan sesuai instruksi
      ws.mergeCells(6, 1, 6, totalCols);
      const emptyCell = ws.getCell('A6');
      emptyCell.value = 'Database aset kosong';
      emptyCell.font = { name: 'Calibri', size: 10, italic: true, color: { argb: 'FF555555' } };
      emptyCell.alignment = { vertical: 'middle', horizontal: 'center' };
      for (let c = 1; c <= totalCols; c++) {
        ws.getCell(6, c).border = THIN_BORDER;
      }
      ws.getRow(6).height = 26;
    } else {
      for (let itemIdx = 0; itemIdx < cfg.items.length; itemIdx++) {
        const item = cfg.items[itemIdx];
        const row = ws.getRow(currentRowNum);
        const hasPhoto = Boolean(item.photoUrl && item.photoUrl.trim() !== '');
        row.height = hasPhoto ? 65 : 22;

        // Col 1: KODE LOKASI
        const c1 = row.getCell(1);
        c1.value = item.locationCode || '';
        c1.alignment = { vertical: 'middle', horizontal: 'center' };

        // Col 2: NO
        const c2 = row.getCell(2);
        c2.value = itemIdx + 1;
        c2.alignment = { vertical: 'middle', horizontal: 'center' };

        // Col 3: NAMA ASET
        const c3 = row.getCell(3);
        c3.value = (item.name || '').toUpperCase();
        c3.alignment = { vertical: 'middle', horizontal: 'left' };

        // Col 4: FOTO FISIK (Embed gambar asli ke dalam cell Excel)
        const c4 = row.getCell(4);
        c4.alignment = { vertical: 'middle', horizontal: 'center' };
        if (hasPhoto && item.photoUrl) {
          const embedded = await embedImageToWorksheet(workbook, ws, item.photoUrl, 4, currentRowNum);
          if (!embedded) {
            c4.value = '-';
          }
        } else {
          c4.value = '-';
        }

        // Col 5: JENIS
        const c5 = row.getCell(5);
        c5.value = (item.typeCode || '').toUpperCase();
        c5.alignment = { vertical: 'middle', horizontal: 'center' };

        // Col 6: KODE ASET
        const c6 = row.getCell(6);
        c6.value = (item.code || '').toUpperCase();
        c6.alignment = { vertical: 'middle', horizontal: 'center' };

        // Col 7: NILAI PEROLEHAN PASTI
        const c7 = row.getCell(7);
        if (item.costActual != null && !isNaN(item.costActual) && item.costActual > 0) {
          c7.value = item.costActual;
          c7.numFmt = '#,##0.00';
        } else {
          c7.value = '';
        }
        c7.alignment = { vertical: 'middle', horizontal: 'right' };

        // Col 8: NILAI PEROLEHAN EXCEL
        const c8 = row.getCell(8);
        if (item.costExcel != null && !isNaN(item.costExcel) && item.costExcel > 0) {
          c8.value = item.costExcel;
          c8.numFmt = '#,##0.00';
        } else {
          c8.value = '';
        }
        c8.alignment = { vertical: 'middle', horizontal: 'right' };

        // Col 9: SUPPLIER
        const c9 = row.getCell(9);
        c9.value = item.supplier && item.supplier !== '-' ? item.supplier.toUpperCase() : '';
        c9.alignment = { vertical: 'middle', horizontal: 'left' };

        // Col 10: TANGGAL BELI
        const c10 = row.getCell(10);
        c10.value = item.buyDate && item.buyDate !== '-' ? formatDdMmmYy(item.buyDate) : '-';
        c10.alignment = { vertical: 'middle', horizontal: 'center' };

        // Col 11: READER TAP
        const c11 = row.getCell(11);
        c11.value = item.readerTap && item.readerTap !== '-' ? item.readerTap : '';
        c11.alignment = { vertical: 'middle', horizontal: 'center' };

        // Col 12: READER SWIPE
        const c12 = row.getCell(12);
        c12.value = item.readerSwipe && item.readerSwipe !== '-' ? item.readerSwipe : '';
        c12.alignment = { vertical: 'middle', horizontal: 'center' };

        // Col 13: HARGA BERMAIN
        const c13 = row.getCell(13);
        if (item.playPrice != null && !isNaN(item.playPrice) && item.playPrice > 0) {
          c13.value = item.playPrice;
          c13.numFmt = '#,##0.00';
        } else {
          c13.value = '';
        }
        c13.alignment = { vertical: 'middle', horizontal: 'right' };

        // Col 14: TANGGAL MASUK
        const c14 = row.getCell(14);
        c14.value = item.entryDate && item.entryDate !== '-' ? formatDdMmmYy(item.entryDate) : '-';
        c14.alignment = { vertical: 'middle', horizontal: 'center' };

        // Col 15: KETERANGAN
        const c15 = row.getCell(15);
        c15.value = item.notes && item.notes !== '-' ? item.notes : '';
        c15.alignment = { vertical: 'middle', horizontal: 'left' };

        // History columns
        if (histCols.length > 0) {
          histCols.forEach((col, hIdx) => {
            const hCell = row.getCell(16 + hIdx);
            const val = item.history?.[col.key] || '';
            hCell.value = val;
            hCell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
          });
        }

        // Border tipis hitam di semua cell baris data
        for (let c = 1; c <= totalCols; c++) {
          row.getCell(c).border = THIN_BORDER;
          row.getCell(c).font = FONT_DEFAULT;
        }

        currentRowNum++;
      }
    }

    // Lebar kolom
    const colDefs: { width: number }[] = [
      { width: 14 }, // KODE LOKASI
      { width: 6 },  // NO
      { width: 32 }, // NAMA
      { width: 15 }, // FOTO FISIK
      { width: 8 },  // JENIS
      { width: 16 }, // KODE ASET
      { width: 22 }, // NILAI PEROLEHAN PASTI
      { width: 22 }, // NILAI PEROLEHAN EXCEL
      { width: 24 }, // SUPPLIER
      { width: 14 }, // TANGGAL BELI
      { width: 13 }, // READER TAP
      { width: 13 }, // READER SWIPE
      { width: 15 }, // HARGA BERMAIN
      { width: 14 }, // TANGGAL MASUK
      { width: 25 }, // KETERANGAN
    ];

    if (histCols.length > 0) {
      histCols.forEach(() => {
        colDefs.push({ width: 18 });
      });
    }

    ws.columns = colDefs;
  }

  await saveWorkbook(workbook, filename);
};

// -------------------------------------------------------------
// MENU 2: LAPORAN ROTASI ASET (SHEET: LAPORAN ROTASI)
// -------------------------------------------------------------
export interface LaporanRotasiExportItem {
  assetName: string;
  assetType: string;
  assetCode: string;
  costActual?: number | null;
  costExcel?: number | null;
  entryDate?: string;
  exitDate?: string;
  fromLocationCode: string;
  toLocationCode: string;
  type: string;
}

export interface LaporanRotasiExportOptions {
  rotations: LaporanRotasiExportItem[];
  locationLabel: string;
  periodeLabel: string;
  filename: string;
}

export const exportLaporanRotasiExcel = async (options: LaporanRotasiExportOptions): Promise<void> => {
  const { rotations, locationLabel, periodeLabel, filename } = options;
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'GameMaster Ops • AssetFlow';
  workbook.created = new Date();

  const ws = workbook.addWorksheet('LAPORAN ROTASI', {
    views: [{ state: 'frozen', ySplit: 5, showGridLines: true }],
  });

  // Baris 1: LAPORAN ROTASI ASET Bold
  const titleCell = ws.getCell('A1');
  titleCell.value = 'LAPORAN ROTASI ASET';
  titleCell.font = FONT_TITLE;

  // Baris 2: LOKASI : ${LOKASI}
  const locLabelCell = ws.getCell('A2');
  locLabelCell.value = 'LOKASI';
  locLabelCell.font = FONT_TITLE;
  const locValCell = ws.getCell('B2');
  locValCell.value = `: ${locationLabel}`;
  locValCell.font = FONT_TITLE;

  // Baris 3: PERIODE : ${PERIODE} contoh SEPTEMBER 2026
  const perLabelCell = ws.getCell('A3');
  perLabelCell.value = 'PERIODE';
  perLabelCell.font = FONT_TITLE;
  const perValCell = ws.getCell('B3');
  perValCell.value = `: ${periodeLabel}`;
  perValCell.font = FONT_TITLE;

  // Baris 4: Kosong

  // Baris 5 Header: NO | NAMA ASET | JENIS | KODE | NILAI PEROLEHAN PASTI | NILAI PEROLEHAN EXCEL | TANGGAL MASUK | TANGGAL KELUAR | DARI | KE | TIPE
  const headers = [
    'NO',
    'NAMA ASET',
    'JENIS',
    'KODE',
    'NILAI PEROLEHAN PASTI',
    'NILAI PEROLEHAN EXCEL',
    'TANGGAL MASUK',
    'TANGGAL KELUAR',
    'DARI',
    'KE',
    'TIPE',
  ];

  const headerRow = ws.getRow(5);
  headerRow.height = 28;
  headers.forEach((h, idx) => {
    const cell = headerRow.getCell(idx + 1);
    cell.value = h;
    cell.font = FONT_HEADER;
    cell.fill = CYAN_FILL;
    cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
    cell.border = THIN_BORDER;
  });

  let currentRowNum = 6;
  let totalCostPasti = 0;
  let totalCostExcel = 0;

  if (rotations.length === 0) {
    ws.mergeCells(6, 1, 6, 11);
    const emptyCell = ws.getCell('A6');
    emptyCell.value = 'Data rotasi kosong atau tidak ditemukan';
    emptyCell.font = { name: 'Calibri', size: 10, italic: true, color: { argb: 'FF555555' } };
    emptyCell.alignment = { vertical: 'middle', horizontal: 'center' };
    for (let c = 1; c <= 11; c++) {
      ws.getCell(6, c).border = THIN_BORDER;
    }
    ws.getRow(6).height = 26;
    currentRowNum = 7;
  } else {
    rotations.forEach((item, idx) => {
      const row = ws.getRow(currentRowNum);
      row.height = 22;

      // Col 1: NO
      const c1 = row.getCell(1);
      c1.value = idx + 1;
      c1.alignment = { vertical: 'middle', horizontal: 'center' };

      // Col 2: NAMA ASET
      const c2 = row.getCell(2);
      c2.value = (item.assetName || '').toUpperCase();
      c2.alignment = { vertical: 'middle', horizontal: 'left' };

      // Col 3: JENIS
      const c3 = row.getCell(3);
      c3.value = (item.assetType || '').toUpperCase();
      c3.alignment = { vertical: 'middle', horizontal: 'center' };

      // Col 4: KODE
      const c4 = row.getCell(4);
      c4.value = (item.assetCode || '').toUpperCase();
      c4.alignment = { vertical: 'middle', horizontal: 'center' };

      // Col 5: NILAI PEROLEHAN PASTI
      const c5 = row.getCell(5);
      const costPasti = item.costActual != null && !isNaN(item.costActual) ? item.costActual : 0;
      totalCostPasti += costPasti;
      c5.value = costPasti;
      c5.numFmt = '#,##0.00';
      c5.alignment = { vertical: 'middle', horizontal: 'right' };

      // Col 6: NILAI PEROLEHAN EXCEL
      const c6 = row.getCell(6);
      const costExcel = item.costExcel != null && !isNaN(item.costExcel) ? item.costExcel : 0;
      totalCostExcel += costExcel;
      c6.value = costExcel;
      c6.numFmt = '#,##0.00';
      c6.alignment = { vertical: 'middle', horizontal: 'right' };

      // Col 7: TANGGAL MASUK
      const c7 = row.getCell(7);
      c7.value = item.entryDate && item.entryDate !== '-' ? formatDdMmmYy(item.entryDate) : '-';
      c7.alignment = { vertical: 'middle', horizontal: 'center' };

      // Col 8: TANGGAL KELUAR
      const c8 = row.getCell(8);
      c8.value = item.exitDate && item.exitDate !== '-' ? formatDdMmmYy(item.exitDate) : '-';
      c8.alignment = { vertical: 'middle', horizontal: 'center' };

      // Col 9: DARI
      const c9 = row.getCell(9);
      c9.value = (item.fromLocationCode || '').toUpperCase();
      c9.alignment = { vertical: 'middle', horizontal: 'center' };

      // Col 10: KE
      const c10 = row.getCell(10);
      c10.value = (item.toLocationCode || '').toUpperCase();
      c10.alignment = { vertical: 'middle', horizontal: 'center' };

      // Col 11: TIPE
      const c11 = row.getCell(11);
      c11.value = (item.type || 'ROTASI').toUpperCase();
      c11.alignment = { vertical: 'middle', horizontal: 'center' };

      for (let c = 1; c <= 11; c++) {
        row.getCell(c).border = THIN_BORDER;
        row.getCell(c).font = FONT_DEFAULT;
      }

      currentRowNum++;
    });
  }

  // Baris terakhir: GRAND TOTAL merge 4 kolom pertama, sum NILAI PEROLEHAN PASTI dan NILAI PEROLEHAN EXCEL dengan bold, border.
  const grandRow = ws.getRow(currentRowNum);
  grandRow.height = 24;

  ws.mergeCells(currentRowNum, 1, currentRowNum, 4);
  const gtTitle = grandRow.getCell(1);
  gtTitle.value = 'GRAND TOTAL';
  gtTitle.font = FONT_HEADER;
  gtTitle.alignment = { vertical: 'middle', horizontal: 'left' };

  const gtPasti = grandRow.getCell(5);
  gtPasti.value = totalCostPasti;
  gtPasti.numFmt = '#,##0.00';
  gtPasti.font = FONT_HEADER;
  gtPasti.alignment = { vertical: 'middle', horizontal: 'right' };

  const gtExcel = grandRow.getCell(6);
  gtExcel.value = totalCostExcel;
  gtExcel.numFmt = '#,##0.00';
  gtExcel.font = FONT_HEADER;
  gtExcel.alignment = { vertical: 'middle', horizontal: 'right' };

  for (let c = 7; c <= 11; c++) {
    grandRow.getCell(c).value = '';
  }

  for (let c = 1; c <= 11; c++) {
    grandRow.getCell(c).border = THIN_BORDER;
  }

  ws.columns = [
    { width: 6 },  // NO
    { width: 34 }, // NAMA ASET
    { width: 8 },  // JENIS
    { width: 16 }, // KODE
    { width: 24 }, // NILAI PEROLEHAN PASTI
    { width: 24 }, // NILAI PEROLEHAN EXCEL
    { width: 15 }, // TANGGAL MASUK
    { width: 15 }, // TANGGAL KELUAR
    { width: 12 }, // DARI
    { width: 12 }, // KE
    { width: 12 }, // TIPE
  ];

  await saveWorkbook(workbook, filename);
};

// -------------------------------------------------------------
// MENU 3: REKAP JUMLAH ASET LOKASI (SHEET: REKAP JUMLAH ASET)
// -------------------------------------------------------------
export interface RekapSummaryRow {
  no: number;
  code: string;
  name: string;
  tapCount: number;
  swipeCount: number;
  mesinBreakdown: Record<string, number>;
  mesinCount: number;
  jfCount: number;
  nilaiPastiMesinJf?: number;
  nilaiExcelMesinJf?: number;
  invBreakdown: Record<string, number>;
  invCount: number;
  nilaiPastiInv?: number;
  nilaiExcelInv?: number;
  total: number;
  totalPendapatanMesin?: number;
  keterangan: string;
}

export interface RekapJumlahAsetExportOptions {
  summaryRows: RekapSummaryRow[];
  grandTotals: {
    tap: number;
    swipe: number;
    mesin: number;
    jf: number;
    nilaiPastiMesinJf?: number;
    nilaiExcelMesinJf?: number;
    inv: number;
    nilaiPastiInv?: number;
    nilaiExcelInv?: number;
    total: number;
    totalPendapatanMesin?: number;
    mesinTypeTotals: Record<string, number>;
    invTypeTotals: Record<string, number>;
  };
  mesinTypes: { code: string; name: string }[];
  invTypes: { code: string; name: string }[];
  periodeLabel: string;
  filename: string;
  columnAccess?: {
    showNilaiPastiMesinJf?: boolean;
    showNilaiExcelMesinJf?: boolean;
    showNilaiPastiInv?: boolean;
    showNilaiExcelInv?: boolean;
    showPendapatanMesin?: boolean;
  };
}

export const exportRekapJumlahAsetExcel = async (options: RekapJumlahAsetExportOptions): Promise<void> => {
  const { summaryRows, grandTotals, mesinTypes, invTypes, periodeLabel, filename } = options;
  const showNpMesinJf = options.columnAccess ? options.columnAccess.showNilaiPastiMesinJf !== false : true;
  const showNeMesinJf = options.columnAccess ? options.columnAccess.showNilaiExcelMesinJf !== false : true;
  const showNpInv = options.columnAccess ? options.columnAccess.showNilaiPastiInv !== false : true;
  const showNeInv = options.columnAccess ? options.columnAccess.showNilaiExcelInv !== false : true;
  const showRev = options.columnAccess ? options.columnAccess.showPendapatanMesin !== false : true;

  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'GameMaster Ops • AssetFlow';
  workbook.created = new Date();

  const ws = workbook.addWorksheet('REKAP JUMLAH ASET', {
    views: [{ state: 'frozen', ySplit: 5, showGridLines: true }],
  });

  // Baris 1: REKAP JUMLAH ASET LOKASI Bold
  const titleCell = ws.getCell('A1');
  titleCell.value = 'REKAP JUMLAH ASET LOKASI';
  titleCell.font = FONT_TITLE;

  // Baris 2: PERIODE : ${PERIODE} contoh AGUSTUS 2026
  const perLabel = ws.getCell('A2');
  perLabel.value = 'PERIODE';
  perLabel.font = FONT_TITLE;
  const perVal = ws.getCell('B2');
  perVal.value = `: ${periodeLabel}`;
  perVal.font = FONT_TITLE;

  // Baris 3: Kosong

  // Baris 4 & 5: Header 2 level
  const row4 = ws.getRow(4);
  const row5 = ws.getRow(5);
  row4.height = 24;
  row5.height = 24;

  // Level 1: NO | KODE | NAMA LOKASI (merge 4-5)
  ws.mergeCells(4, 1, 5, 1);
  row4.getCell(1).value = 'NO';

  ws.mergeCells(4, 2, 5, 2);
  row4.getCell(2).value = 'KODE';

  ws.mergeCells(4, 3, 5, 3);
  row4.getCell(3).value = 'NAMA LOKASI';

  // READER (merge 2) -> TAP | SWIPE
  ws.mergeCells(4, 4, 4, 5);
  row4.getCell(4).value = 'READER';
  row5.getCell(4).value = 'TAP';
  row5.getCell(5).value = 'SWIPE';

  // MESIN (merge jenis-jenis mesin)
  const mesinStartCol = 6;
  const mesinEndCol = mesinStartCol + Math.max(1, mesinTypes.length) - 1;
  ws.mergeCells(4, mesinStartCol, 4, mesinEndCol);
  row4.getCell(mesinStartCol).value = 'MESIN';
  mesinTypes.forEach((mt, i) => {
    row5.getCell(mesinStartCol + i).value = mt.code;
  });

  // JOY'N FUN (JF)
  const jfCol = mesinEndCol + 1;
  ws.mergeCells(4, jfCol, 4, jfCol);
  row4.getCell(jfCol).value = "JOY'N FUN";
  row5.getCell(jfCol).value = 'JF';

  let curCol = jfCol + 1;

  // 1. TOTAL NILAI PEROLEHAN PASTI (MESIN + JOY'N FUN)
  let nilaiPastiMesinJfCol = 0;
  if (showNpMesinJf) {
    nilaiPastiMesinJfCol = curCol++;
    ws.mergeCells(4, nilaiPastiMesinJfCol, 5, nilaiPastiMesinJfCol);
    row4.getCell(nilaiPastiMesinJfCol).value = "TOTAL NILAI PEROLEHAN PASTI (MESIN + JOY'N FUN)";
  }

  // 2. TOTAL NILAI PEROLEHAN EXCEL (MESIN + JOY'N FUN)
  let nilaiExcelMesinJfCol = 0;
  if (showNeMesinJf) {
    nilaiExcelMesinJfCol = curCol++;
    ws.mergeCells(4, nilaiExcelMesinJfCol, 5, nilaiExcelMesinJfCol);
    row4.getCell(nilaiExcelMesinJfCol).value = "TOTAL NILAI PEROLEHAN EXCEL (MESIN + JOY'N FUN)";
  }

  // INVENTARIS (merge jenis-jenis inventaris: BA IB IK KD TA)
  const invStartCol = curCol;
  const invEndCol = invStartCol + Math.max(1, invTypes.length) - 1;
  ws.mergeCells(4, invStartCol, 4, invEndCol);
  row4.getCell(invStartCol).value = 'INVENTARIS';
  invTypes.forEach((it, i) => {
    row5.getCell(invStartCol + i).value = it.code;
  });
  curCol = invEndCol + 1;

  // 3. TOTAL NILAI PEROLEHAN PASTI (INVENTARIS)
  let nilaiPastiInvCol = 0;
  if (showNpInv) {
    nilaiPastiInvCol = curCol++;
    ws.mergeCells(4, nilaiPastiInvCol, 5, nilaiPastiInvCol);
    row4.getCell(nilaiPastiInvCol).value = 'TOTAL NILAI PEROLEHAN PASTI (INVENTARIS)';
  }

  // 4. TOTAL NILAI PEROLEHAN EXCEL (INVENTARIS)
  let nilaiExcelInvCol = 0;
  if (showNeInv) {
    nilaiExcelInvCol = curCol++;
    ws.mergeCells(4, nilaiExcelInvCol, 5, nilaiExcelInvCol);
    row4.getCell(nilaiExcelInvCol).value = 'TOTAL NILAI PEROLEHAN EXCEL (INVENTARIS)';
  }

  // TOTAL UNIT (merge 4-5)
  const totalCol = curCol++;
  ws.mergeCells(4, totalCol, 5, totalCol);
  row4.getCell(totalCol).value = 'TOTAL';

  // 5. TOTAL PENDAPATAN MESIN (merge 4-5)
  let pendapatanMesinCol = 0;
  if (showRev) {
    pendapatanMesinCol = curCol++;
    ws.mergeCells(4, pendapatanMesinCol, 5, pendapatanMesinCol);
    row4.getCell(pendapatanMesinCol).value = 'TOTAL PENDAPATAN MESIN';
  }

  // KETERANGAN (merge 4-5)
  const ketCol = curCol;
  ws.mergeCells(4, ketCol, 5, ketCol);
  row4.getCell(ketCol).value = 'KETERANGAN';

  // Apply Cyan Fill & Border to all header cells
  for (let c = 1; c <= ketCol; c++) {
    const cR4 = row4.getCell(c);
    cR4.fill = CYAN_FILL;
    cR4.font = FONT_HEADER;
    cR4.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
    cR4.border = THIN_BORDER;

    const cR5 = row5.getCell(c);
    cR5.fill = CYAN_FILL;
    cR5.font = FONT_HEADER;
    cR5.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
    cR5.border = THIN_BORDER;
  }

  // Isi angka per lokasi
  let currentRowNum = 6;
  summaryRows.forEach((r, idx) => {
    const row = ws.getRow(currentRowNum);
    row.height = 20;

    row.getCell(1).value = idx + 1;
    row.getCell(1).alignment = { vertical: 'middle', horizontal: 'center' };

    row.getCell(2).value = r.code;
    row.getCell(2).alignment = { vertical: 'middle', horizontal: 'center' };

    row.getCell(3).value = r.name.toUpperCase();
    row.getCell(3).alignment = { vertical: 'middle', horizontal: 'left' };

    row.getCell(4).value = r.tapCount;
    row.getCell(4).numFmt = '#,##0';
    row.getCell(4).alignment = { vertical: 'middle', horizontal: 'center' };

    row.getCell(5).value = r.swipeCount;
    row.getCell(5).numFmt = '#,##0';
    row.getCell(5).alignment = { vertical: 'middle', horizontal: 'center' };

    // Mesin breakdown
    mesinTypes.forEach((mt, i) => {
      const val = r.mesinBreakdown[mt.code] || 0;
      const cell = row.getCell(mesinStartCol + i);
      cell.value = val;
      cell.numFmt = '#,##0';
      cell.alignment = { vertical: 'middle', horizontal: 'center' };
    });

    // Joy'n Fun
    const jfCell = row.getCell(jfCol);
    jfCell.value = r.jfCount;
    jfCell.numFmt = '#,##0';
    jfCell.alignment = { vertical: 'middle', horizontal: 'center' };

    // 1. TOTAL NILAI PEROLEHAN PASTI (MESIN + JOY'N FUN)
    if (showNpMesinJf && nilaiPastiMesinJfCol) {
      const npMesinJfCell = row.getCell(nilaiPastiMesinJfCol);
      npMesinJfCell.value = r.nilaiPastiMesinJf || 0;
      npMesinJfCell.numFmt = '#,##0.00';
      npMesinJfCell.alignment = { vertical: 'middle', horizontal: 'right' };
    }

    // 2. TOTAL NILAI PEROLEHAN EXCEL (MESIN + JOY'N FUN)
    if (showNeMesinJf && nilaiExcelMesinJfCol) {
      const neMesinJfCell = row.getCell(nilaiExcelMesinJfCol);
      neMesinJfCell.value = r.nilaiExcelMesinJf || 0;
      neMesinJfCell.numFmt = '#,##0.00';
      neMesinJfCell.alignment = { vertical: 'middle', horizontal: 'right' };
    }

    // Inventaris breakdown
    invTypes.forEach((it, i) => {
      const val = r.invBreakdown[it.code] || 0;
      const cell = row.getCell(invStartCol + i);
      cell.value = val;
      cell.numFmt = '#,##0';
      cell.alignment = { vertical: 'middle', horizontal: 'center' };
    });

    // 3. TOTAL NILAI PEROLEHAN PASTI (INVENTARIS)
    if (showNpInv && nilaiPastiInvCol) {
      const npInvCell = row.getCell(nilaiPastiInvCol);
      npInvCell.value = r.nilaiPastiInv || 0;
      npInvCell.numFmt = '#,##0.00';
      npInvCell.alignment = { vertical: 'middle', horizontal: 'right' };
    }

    // 4. TOTAL NILAI PEROLEHAN EXCEL (INVENTARIS)
    if (showNeInv && nilaiExcelInvCol) {
      const neInvCell = row.getCell(nilaiExcelInvCol);
      neInvCell.value = r.nilaiExcelInv || 0;
      neInvCell.numFmt = '#,##0.00';
      neInvCell.alignment = { vertical: 'middle', horizontal: 'right' };
    }

    // Total Unit
    const tCell = row.getCell(totalCol);
    tCell.value = r.total;
    tCell.numFmt = '#,##0';
    tCell.alignment = { vertical: 'middle', horizontal: 'center' };

    // 5. TOTAL PENDAPATAN MESIN
    if (showRev && pendapatanMesinCol) {
      const revCell = row.getCell(pendapatanMesinCol);
      revCell.value = r.totalPendapatanMesin || 0;
      revCell.numFmt = '#,##0.00';
      revCell.alignment = { vertical: 'middle', horizontal: 'right' };
    }

    // Keterangan
    const kCell = row.getCell(ketCol);
    kCell.value = r.keterangan && r.keterangan !== '-' ? r.keterangan : '';
    kCell.alignment = { vertical: 'middle', horizontal: 'left' };

    for (let c = 1; c <= ketCol; c++) {
      row.getCell(c).border = THIN_BORDER;
      row.getCell(c).font = FONT_DEFAULT;
    }

    currentRowNum++;
  });

  // Baris terakhir: GRAND TOTAL
  const grandRow = ws.getRow(currentRowNum);
  grandRow.height = 22;

  ws.mergeCells(currentRowNum, 1, currentRowNum, 3);
  const gtTitle = grandRow.getCell(1);
  gtTitle.value = 'GRAND TOTAL:';
  gtTitle.font = FONT_HEADER;
  gtTitle.alignment = { vertical: 'middle', horizontal: 'right' };

  const gtTap = grandRow.getCell(4);
  gtTap.value = grandTotals.tap;
  gtTap.numFmt = '#,##0';
  gtTap.alignment = { vertical: 'middle', horizontal: 'center' };

  const gtSwipe = grandRow.getCell(5);
  gtSwipe.value = grandTotals.swipe;
  gtSwipe.numFmt = '#,##0';
  gtSwipe.alignment = { vertical: 'middle', horizontal: 'center' };

  mesinTypes.forEach((mt, i) => {
    const cell = grandRow.getCell(mesinStartCol + i);
    cell.value = grandTotals.mesinTypeTotals[mt.code] || 0;
    cell.numFmt = '#,##0';
    cell.alignment = { vertical: 'middle', horizontal: 'center' };
  });

  const gtJf = grandRow.getCell(jfCol);
  gtJf.value = grandTotals.jf;
  gtJf.numFmt = '#,##0';
  gtJf.alignment = { vertical: 'middle', horizontal: 'center' };

  // 1. Grand Total Nilai Perolehan Pasti (MESIN + JOY'N FUN)
  if (showNpMesinJf && nilaiPastiMesinJfCol) {
    const gtNpMesinJf = grandRow.getCell(nilaiPastiMesinJfCol);
    gtNpMesinJf.value = grandTotals.nilaiPastiMesinJf || 0;
    gtNpMesinJf.numFmt = '#,##0.00';
    gtNpMesinJf.alignment = { vertical: 'middle', horizontal: 'right' };
  }

  // 2. Grand Total Nilai Perolehan Excel (MESIN + JOY'N FUN)
  if (showNeMesinJf && nilaiExcelMesinJfCol) {
    const gtNeMesinJf = grandRow.getCell(nilaiExcelMesinJfCol);
    gtNeMesinJf.value = grandTotals.nilaiExcelMesinJf || 0;
    gtNeMesinJf.numFmt = '#,##0.00';
    gtNeMesinJf.alignment = { vertical: 'middle', horizontal: 'right' };
  }

  invTypes.forEach((it, i) => {
    const cell = grandRow.getCell(invStartCol + i);
    cell.value = grandTotals.invTypeTotals[it.code] || 0;
    cell.numFmt = '#,##0';
    cell.alignment = { vertical: 'middle', horizontal: 'center' };
  });

  // 3. Grand Total Nilai Perolehan Pasti (INVENTARIS)
  if (showNpInv && nilaiPastiInvCol) {
    const gtNpInv = grandRow.getCell(nilaiPastiInvCol);
    gtNpInv.value = grandTotals.nilaiPastiInv || 0;
    gtNpInv.numFmt = '#,##0.00';
    gtNpInv.alignment = { vertical: 'middle', horizontal: 'right' };
  }

  // 4. Grand Total Nilai Perolehan Excel (INVENTARIS)
  if (showNeInv && nilaiExcelInvCol) {
    const gtNeInv = grandRow.getCell(nilaiExcelInvCol);
    gtNeInv.value = grandTotals.nilaiExcelInv || 0;
    gtNeInv.numFmt = '#,##0.00';
    gtNeInv.alignment = { vertical: 'middle', horizontal: 'right' };
  }

  const gtTotal = grandRow.getCell(totalCol);
  gtTotal.value = grandTotals.total;
  gtTotal.numFmt = '#,##0';
  gtTotal.alignment = { vertical: 'middle', horizontal: 'center' };

  // 5. Grand Total Pendapatan Mesin
  if (showRev && pendapatanMesinCol) {
    const gtRev = grandRow.getCell(pendapatanMesinCol);
    gtRev.value = grandTotals.totalPendapatanMesin || 0;
    gtRev.numFmt = '#,##0.00';
    gtRev.alignment = { vertical: 'middle', horizontal: 'right' };
  }

  grandRow.getCell(ketCol).value = '';

  // Background biru (#00B0F0), font bold, border tipis
  for (let c = 1; c <= ketCol; c++) {
    const cell = grandRow.getCell(c);
    cell.fill = CYAN_FILL;
    cell.font = FONT_HEADER;
    cell.border = THIN_BORDER;
  }

  // Column Widths
  const colWidths = [
    { width: 6 },  // NO
    { width: 10 }, // KODE
    { width: 34 }, // NAMA LOKASI
    { width: 8 },  // TAP
    { width: 8 },  // SWIPE
  ];
  mesinTypes.forEach(() => colWidths.push({ width: 6 }));
  colWidths.push({ width: 8 }); // JF
  if (showNpMesinJf) colWidths.push({ width: 20 }); // TOTAL NILAI PEROLEHAN PASTI (MESIN + JOY'N FUN)
  if (showNeMesinJf) colWidths.push({ width: 20 }); // TOTAL NILAI PEROLEHAN EXCEL (MESIN + JOY'N FUN)
  invTypes.forEach(() => colWidths.push({ width: 6 }));
  if (showNpInv) colWidths.push({ width: 20 }); // TOTAL NILAI PEROLEHAN PASTI (INVENTARIS)
  if (showNeInv) colWidths.push({ width: 20 }); // TOTAL NILAI PEROLEHAN EXCEL (INVENTARIS)
  colWidths.push({ width: 10 }); // TOTAL
  if (showRev) colWidths.push({ width: 20 }); // TOTAL PENDAPATAN MESIN
  colWidths.push({ width: 22 }); // KETERANGAN
  ws.columns = colWidths;

  await saveWorkbook(workbook, filename);
};

// -------------------------------------------------------------
// MENU 5: INFO PERPINDAHAN ASET (SHEET: INFO PERPINDAHAN ASET)
// -------------------------------------------------------------
export interface InfoPerpindahanExportItem {
  assetName: string;
  assetType: string;
  assetCode: string;
  fromLocationCode: string;
  toLocationCode: string;
  entryDate?: string;
  confirmDate?: string;
  status: string;
  notes?: string;
}

export interface InfoPerpindahanExportOptions {
  rotations: InfoPerpindahanExportItem[];
  assetName?: string;
  assetCode: string;
  periodeLabel?: string;
  filename: string;
}

export const exportInfoPerpindahanExcel = async (options: InfoPerpindahanExportOptions): Promise<void> => {
  const { rotations, assetName, assetCode, periodeLabel, filename } = options;
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'GameMaster Ops • AssetFlow';
  workbook.created = new Date();

  const ws = workbook.addWorksheet('INFO PERPINDAHAN ASET', {
    views: [{ state: 'frozen', ySplit: 5, showGridLines: true }],
  });

  // Baris 1: INFO PERPINDAHAN ASET Bold
  const titleCell = ws.getCell('A1');
  titleCell.value = 'INFO PERPINDAHAN ASET';
  titleCell.font = FONT_TITLE;

  // Baris 2: KODE ASET : ${assetCode} - ${assetName} (Bold)
  const codeCell = ws.getCell('A2');
  codeCell.value = 'KODE ASET';
  codeCell.font = FONT_TITLE;
  const codeValCell = ws.getCell('B2');
  codeValCell.value = `: ${assetCode || 'SEMUA'}${assetName ? ` - ${assetName}` : ''}`;
  codeValCell.font = FONT_TITLE;

  if (periodeLabel) {
    const pLabel = ws.getCell('A3');
    pLabel.value = 'PERIODE';
    pLabel.font = FONT_TITLE;
    const pVal = ws.getCell('B3');
    pVal.value = `: ${periodeLabel}`;
    pVal.font = FONT_TITLE;
  }

  // Baris 4 & 5: Header 2 level
  // Level 1: NO | ASET (merge 3) | LOKASI (merge 2) | TANGGAL MASUK | STATUS | KETERANGAN
  // Level 2: NAMA | JENIS | KODE | SEBELUM | TERKINI
  const row4 = ws.getRow(4);
  const row5 = ws.getRow(5);
  row4.height = 22;
  row5.height = 22;

  // Col 1: NO (merge 4-5)
  ws.mergeCells(4, 1, 5, 1);
  row4.getCell(1).value = 'NO';

  // Cols 2-4: ASET (merge 4,2 to 4,4)
  ws.mergeCells(4, 2, 4, 4);
  row4.getCell(2).value = 'ASET';
  row5.getCell(2).value = 'NAMA';
  row5.getCell(3).value = 'JENIS';
  row5.getCell(4).value = 'KODE';

  // Cols 5-6: LOKASI (merge 4,5 to 4,6)
  ws.mergeCells(4, 5, 4, 6);
  row4.getCell(5).value = 'LOKASI';
  row5.getCell(5).value = 'SEBELUM';
  row5.getCell(6).value = 'TERKINI';

  // Col 7: TANGGAL MASUK (merge 4-5)
  ws.mergeCells(4, 7, 5, 7);
  row4.getCell(7).value = 'TANGGAL MASUK';

  // Col 8: STATUS (merge 4-5)
  ws.mergeCells(4, 8, 5, 8);
  row4.getCell(8).value = 'STATUS';

  // Col 9: KETERANGAN (merge 4-5)
  ws.mergeCells(4, 9, 5, 9);
  row4.getCell(9).value = 'KETERANGAN';

  // Style Header Cells
  for (let c = 1; c <= 9; c++) {
    const cR4 = row4.getCell(c);
    cR4.fill = CYAN_FILL;
    cR4.font = FONT_HEADER;
    cR4.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
    cR4.border = THIN_BORDER;

    const cR5 = row5.getCell(c);
    cR5.fill = CYAN_FILL;
    cR5.font = FONT_HEADER;
    cR5.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
    cR5.border = THIN_BORDER;
  }

  // Data Rows
  let currentRowNum = 6;
  if (rotations.length === 0) {
    ws.mergeCells(6, 1, 6, 9);
    const emptyCell = ws.getCell('A6');
    emptyCell.value = 'Data perpindahan aset kosong atau belum ada catatan';
    emptyCell.font = { name: 'Calibri', size: 10, italic: true, color: { argb: 'FF555555' } };
    emptyCell.alignment = { vertical: 'middle', horizontal: 'center' };
    for (let c = 1; c <= 9; c++) {
      ws.getCell(6, c).border = THIN_BORDER;
    }
    ws.getRow(6).height = 26;
  } else {
    rotations.forEach((item, idx) => {
      const row = ws.getRow(currentRowNum);
      row.height = 22;

      row.getCell(1).value = idx + 1;
      row.getCell(1).alignment = { vertical: 'middle', horizontal: 'center' };

      row.getCell(2).value = (item.assetName || '').toUpperCase();
      row.getCell(2).alignment = { vertical: 'middle', horizontal: 'left' };

      row.getCell(3).value = (item.assetType || '').toUpperCase();
      row.getCell(3).alignment = { vertical: 'middle', horizontal: 'center' };

      row.getCell(4).value = (item.assetCode || '').toUpperCase();
      row.getCell(4).alignment = { vertical: 'middle', horizontal: 'center' };

      row.getCell(5).value = (item.fromLocationCode || '').toUpperCase();
      row.getCell(5).alignment = { vertical: 'middle', horizontal: 'center' };

      row.getCell(6).value = (item.toLocationCode || '').toUpperCase();
      row.getCell(6).alignment = { vertical: 'middle', horizontal: 'center' };

      const tglMasuk = item.entryDate || item.confirmDate;
      row.getCell(7).value = tglMasuk ? formatDdMmmYy(tglMasuk) : '-';
      row.getCell(7).alignment = { vertical: 'middle', horizontal: 'center' };

      row.getCell(8).value = (item.status || 'SELESAI').toUpperCase();
      row.getCell(8).alignment = { vertical: 'middle', horizontal: 'center' };

      row.getCell(9).value = item.notes && item.notes !== '-' ? item.notes : '';
      row.getCell(9).alignment = { vertical: 'middle', horizontal: 'left' };

      for (let c = 1; c <= 9; c++) {
        row.getCell(c).border = THIN_BORDER;
        row.getCell(c).font = FONT_DEFAULT;
      }

      currentRowNum++;
    });
  }

  ws.columns = [
    { width: 6 },  // NO
    { width: 34 }, // NAMA
    { width: 8 },  // JENIS
    { width: 16 }, // KODE
    { width: 12 }, // SEBELUM
    { width: 12 }, // TERKINI
    { width: 16 }, // TANGGAL MASUK
    { width: 14 }, // STATUS
    { width: 25 }, // KETERANGAN
  ];

  await saveWorkbook(workbook, filename);
};

// -------------------------------------------------------------
// MENU 7.2: LAPORAN PENDAPATAN MESIN
// -------------------------------------------------------------
export interface RevenueGroup {
  typeKey: string;
  typeName: string;
  rows: any[];
  colSubtotals: Record<number, { coin: number; revenue: number }>;
  subtotalTotalCoin: number;
  subtotalTotalRevenue: number;
}

export interface LocationRevenueBundle {
  locationCode: string;
  locationName: string;
  groupedData: RevenueGroup[];
  grandTotals: {
    colTotals: Record<number, { coin: number; revenue: number }>;
    totalCoin: number;
    totalRevenue: number;
  };
}

export interface LaporanPendapatanExportOptions {
  groupedData?: RevenueGroup[];
  grandTotals?: {
    colTotals: Record<number, { coin: number; revenue: number }>;
    totalCoin: number;
    totalRevenue: number;
  };
  columns: Array<{ id: number; dateStr: string; rawDate?: string }>;
  locationCode: string;
  locationName: string;
  periodeLabel: string;
  filename: string;
  multiLocationsData?: LocationRevenueBundle[];
}

// Helper to build a single revenue worksheet
const buildRevenueSheet = (
  ws: ExcelJS.Worksheet,
  locationCode: string,
  locationName: string,
  periodeLabel: string,
  columns: Array<{ id: number; dateStr: string; rawDate?: string }>,
  groupedData: RevenueGroup[],
  grandTotals: {
    colTotals: Record<number, { coin: number; revenue: number }>;
    totalCoin: number;
    totalRevenue: number;
  }
) => {
  // Baris 1: LAPORAN PENDAPATAN MESIN Bold
  const titleCell = ws.getCell('A1');
  titleCell.value = 'LAPORAN PENDAPATAN MESIN';
  titleCell.font = FONT_TITLE;

  // Baris 2: LOKASI : ${LOKASI} (Bold)
  const locLabelCell = ws.getCell('A2');
  locLabelCell.value = 'LOKASI';
  locLabelCell.font = FONT_TITLE;
  const locValCell = ws.getCell('B2');
  locValCell.value = `: ${locationCode ? `${locationCode} — ${locationName}` : 'SEMUA LOKASI'}`;
  locValCell.font = FONT_TITLE;

  // Baris 3: PERIODE : ${PERIODE} (Bold)
  const perLabelCell = ws.getCell('A3');
  perLabelCell.value = 'PERIODE';
  perLabelCell.font = FONT_TITLE;
  const perValCell = ws.getCell('B3');
  perValCell.value = `: ${periodeLabel}`;
  perValCell.font = FONT_TITLE;

  // Baris 4: Kosong

  // Baris 5 & 6: Two-tier Table Header (Frozen)
  const row5 = ws.getRow(5);
  const row6 = ws.getRow(6);
  row5.height = 22;
  row6.height = 22;

  // Fixed Left Cols (Cols 1 to 7) - merged row 5-6
  const fixedHeaders = [
    { title: 'KODE LOKASI', col: 1 },
    { title: 'NO', col: 2 },
    { title: 'NAMA ASET', col: 3 },
    { title: 'JENIS', col: 4 },
    { title: 'KODE ASET', col: 5 },
    { title: 'TANGGAL MASUK ASET', col: 6 },
    { title: 'TANGGAL KELUAR ASET', col: 7 },
  ];

  fixedHeaders.forEach((fh) => {
    ws.mergeCells(5, fh.col, 6, fh.col);
    row5.getCell(fh.col).value = fh.title;
  });

  // Dynamic Pendapatan Date Columns: PENDAPATAN X : DD-MMM-YY (merge 2)
  let colCursor = 8;
  columns.forEach((c) => {
    ws.mergeCells(5, colCursor, 5, colCursor + 1);
    const dateFormatted = formatDdMmmYy(c.dateStr || c.rawDate);
    row5.getCell(colCursor).value = `PENDAPATAN ${c.id} : ${dateFormatted}`;
    row6.getCell(colCursor).value = 'QTY COIN/TAP';
    row6.getCell(colCursor + 1).value = 'PENDAPATAN';
    colCursor += 2;
  });

  // Fixed Right Cols - merged row 5-6
  const totalCoinCol = colCursor;
  const totalRevCol = colCursor + 1;
  const ketCol = colCursor + 2;
  const maxCol = ketCol;

  ws.mergeCells(5, totalCoinCol, 6, totalCoinCol);
  row5.getCell(totalCoinCol).value = 'TOTAL QTY COIN/TAP';

  ws.mergeCells(5, totalRevCol, 6, totalRevCol);
  row5.getCell(totalRevCol).value = 'TOTAL PENDAPATAN';

  ws.mergeCells(5, ketCol, 6, ketCol);
  row5.getCell(ketCol).value = 'KETERANGAN';

  // Apply Cyan Fill & Thin Border to All Header Cells
  for (let c = 1; c <= maxCol; c++) {
    const c5 = row5.getCell(c);
    c5.fill = CYAN_FILL;
    c5.font = FONT_HEADER;
    c5.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
    c5.border = THIN_BORDER;

    const c6 = row6.getCell(c);
    c6.fill = CYAN_FILL;
    c6.font = FONT_HEADER;
    c6.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
    c6.border = THIN_BORDER;
  }

  // Populate Data Groups & Subtotals
  let currentRowNum = 7;

  if (groupedData.length === 0 || groupedData.every((g) => g.rows.length === 0)) {
    ws.mergeCells(7, 1, 7, maxCol);
    const emptyCell = ws.getCell('A7');
    emptyCell.value = 'Data pendapatan mesin kosong pada periode ini';
    emptyCell.font = { name: 'Calibri', size: 10, italic: true, color: { argb: 'FF555555' } };
    emptyCell.alignment = { vertical: 'middle', horizontal: 'center' };
    for (let c = 1; c <= maxCol; c++) {
      ws.getCell(7, c).border = THIN_BORDER;
    }
    ws.getRow(7).height = 26;
    currentRowNum = 8;
  } else {
    groupedData.forEach((grp) => {
      let groupNo = 1;

      grp.rows.forEach((r) => {
        if (r.hidden) return;
        const hasMultiplePlayers = r.players && r.players.length > 1;

        // Hitung total baris
        let rowTotalCoin = 0;
        let rowTotalRev = 0;
        columns.forEach((c) => {
          r.players.forEach((p: any) => {
            const valObj = p.values && p.values[c.id];
            if (valObj) {
              if (valObj.coin) {
                const numC = parseInt(valObj.coin, 10);
                if (!isNaN(numC)) rowTotalCoin += numC;
              }
              if (valObj.revenue) {
                const clean = String(valObj.revenue).replace(/\./g, '').replace(/,/g, '.').replace(/[^0-9.-]/g, '');
                const numR = parseFloat(clean);
                if (!isNaN(numR)) rowTotalRev += numR;
              }
            }
          });
        });

        r.players.forEach((p: any, pIdx: number) => {
          const row = ws.getRow(currentRowNum);
          row.height = 20;

          const displayName = hasMultiplePlayers
            ? `${r.assetName} (${p.label})`
            : r.assetName;

          row.getCell(1).value = r.locationCode || locationCode || '';
          row.getCell(1).alignment = { vertical: 'middle', horizontal: 'center' };

          row.getCell(2).value = groupNo;
          row.getCell(2).alignment = { vertical: 'middle', horizontal: 'center' };

          row.getCell(3).value = (displayName || '').toUpperCase();
          row.getCell(3).alignment = { vertical: 'middle', horizontal: 'left' };

          row.getCell(4).value = (r.typeCode || '').toUpperCase();
          row.getCell(4).alignment = { vertical: 'middle', horizontal: 'center' };

          row.getCell(5).value = (r.assetCode || '').toUpperCase();
          row.getCell(5).alignment = { vertical: 'middle', horizontal: 'center' };

          row.getCell(6).value = r.entryDate && r.entryDate !== '-' ? formatDdMmmYy(r.entryDate) : '-';
          row.getCell(6).alignment = { vertical: 'middle', horizontal: 'center' };

          row.getCell(7).value = r.exitDate && r.exitDate !== '-' ? formatDdMmmYy(r.exitDate) : '-';
          row.getCell(7).alignment = { vertical: 'middle', horizontal: 'center' };

          let dynCursor = 8;
          columns.forEach((c) => {
            const valObj = p.values && p.values[c.id];
            const coinVal = valObj && valObj.coin ? parseInt(valObj.coin, 10) : null;
            const cleanRev = valObj && valObj.revenue
              ? parseFloat(String(valObj.revenue).replace(/\./g, '').replace(/,/g, '.').replace(/[^0-9.-]/g, ''))
              : null;

            const cellCoin = row.getCell(dynCursor);
            if (coinVal != null && !isNaN(coinVal) && coinVal > 0) {
              cellCoin.value = coinVal;
              cellCoin.numFmt = '#,##0';
            } else {
              cellCoin.value = '-';
            }
            cellCoin.alignment = { vertical: 'middle', horizontal: 'center' };

            const cellRev = row.getCell(dynCursor + 1);
            if (cleanRev != null && !isNaN(cleanRev) && cleanRev > 0) {
              cellRev.value = cleanRev;
              cellRev.numFmt = '#,##0.00';
            } else {
              cellRev.value = '-';
            }
            cellRev.alignment = { vertical: 'middle', horizontal: 'right' };

            dynCursor += 2;
          });

          // TOTAL QTY COIN/TAP (Background Kuning #FFFF99)
          const cellTotCoin = row.getCell(totalCoinCol);
          if (pIdx === 0) {
            cellTotCoin.value = rowTotalCoin;
            cellTotCoin.numFmt = '#,##0';
          } else {
            cellTotCoin.value = '';
          }
          cellTotCoin.fill = YELLOW_FILL;
          cellTotCoin.alignment = { vertical: 'middle', horizontal: 'center' };

          // TOTAL PENDAPATAN (Background Kuning #FFFF99)
          const cellTotRev = row.getCell(totalRevCol);
          if (pIdx === 0) {
            cellTotRev.value = rowTotalRev;
            cellTotRev.numFmt = '#,##0.00';
          } else {
            cellTotRev.value = '';
          }
          cellTotRev.fill = YELLOW_FILL;
          cellTotRev.alignment = { vertical: 'middle', horizontal: 'right' };

          // KETERANGAN
          const cellKet = row.getCell(ketCol);
          cellKet.value = p.notes && p.notes !== '-' ? p.notes : '-';
          cellKet.alignment = { vertical: 'middle', horizontal: 'center' };

          for (let c = 1; c <= maxCol; c++) {
            const cell = row.getCell(c);
            cell.border = THIN_BORDER;
            cell.font = FONT_DEFAULT;
          }

          currentRowNum++;
        });

        groupNo++;
      });

      // SUBTOTAL ROW FOR THIS CATEGORY (Background Biru #00B0F0, Font Bold)
      const subRow = ws.getRow(currentRowNum);
      subRow.height = 22;

      ws.mergeCells(currentRowNum, 1, currentRowNum, 7);
      const subTitle = subRow.getCell(1);
      subTitle.value = `SUBTOTAL ${grp.typeName.toUpperCase()}`;
      subTitle.font = FONT_HEADER;
      subTitle.alignment = { vertical: 'middle', horizontal: 'left' };

      let subCursor = 8;
      columns.forEach((c) => {
        const sub = grp.colSubtotals[c.id];
        const coinCell = subRow.getCell(subCursor);
        coinCell.value = sub ? sub.coin : 0;
        coinCell.numFmt = '#,##0';
        coinCell.alignment = { vertical: 'middle', horizontal: 'center' };

        const revCell = subRow.getCell(subCursor + 1);
        revCell.value = sub ? sub.revenue : 0;
        revCell.numFmt = '#,##0.00';
        revCell.alignment = { vertical: 'middle', horizontal: 'right' };

        subCursor += 2;
      });

      const subTotCoin = subRow.getCell(totalCoinCol);
      subTotCoin.value = grp.subtotalTotalCoin;
      subTotCoin.numFmt = '#,##0';
      subTotCoin.alignment = { vertical: 'middle', horizontal: 'center' };

      const subTotRev = subRow.getCell(totalRevCol);
      subTotRev.value = grp.subtotalTotalRevenue;
      subTotRev.numFmt = '#,##0.00';
      subTotRev.alignment = { vertical: 'middle', horizontal: 'right' };

      const subKet = subRow.getCell(ketCol);
      subKet.value = '-';
      subKet.alignment = { vertical: 'middle', horizontal: 'center' };

      // Apply Cyan Fill, Header Font, Thin Border to all cells in Subtotal
      for (let c = 1; c <= maxCol; c++) {
        const cell = subRow.getCell(c);
        cell.fill = CYAN_FILL;
        cell.font = FONT_HEADER;
        cell.border = THIN_BORDER;
      }

      currentRowNum++;
    });
  }

  // GRAND TOTAL ROW (Background Kuning #FFFF99, Bold)
  const grandRow = ws.getRow(currentRowNum);
  grandRow.height = 24;

  ws.mergeCells(currentRowNum, 1, currentRowNum, 7);
  const gtTitle = grandRow.getCell(1);
  gtTitle.value = 'GRAND TOTAL';
  gtTitle.font = FONT_HEADER;
  gtTitle.alignment = { vertical: 'middle', horizontal: 'left' };

  let gtCursor = 8;
  columns.forEach((c) => {
    const gt = grandTotals.colTotals[c.id];
    const coinCell = grandRow.getCell(gtCursor);
    coinCell.value = gt ? gt.coin : 0;
    coinCell.numFmt = '#,##0';
    coinCell.alignment = { vertical: 'middle', horizontal: 'center' };

    const revCell = grandRow.getCell(gtCursor + 1);
    revCell.value = gt ? gt.revenue : 0;
    revCell.numFmt = '#,##0.00';
    revCell.alignment = { vertical: 'middle', horizontal: 'right' };

    gtCursor += 2;
  });

  const gtTotCoin = grandRow.getCell(totalCoinCol);
  gtTotCoin.value = grandTotals.totalCoin;
  gtTotCoin.numFmt = '#,##0';
  gtTotCoin.alignment = { vertical: 'middle', horizontal: 'center' };

  const gtTotRev = grandRow.getCell(totalRevCol);
  gtTotRev.value = grandTotals.totalRevenue;
  gtTotRev.numFmt = '#,##0.00';
  gtTotRev.alignment = { vertical: 'middle', horizontal: 'right' };

  const gtKet = grandRow.getCell(ketCol);
  gtKet.value = '-';
  gtKet.alignment = { vertical: 'middle', horizontal: 'center' };

  for (let c = 1; c <= maxCol; c++) {
    const cell = grandRow.getCell(c);
    cell.fill = YELLOW_FILL;
    cell.font = FONT_HEADER;
    cell.border = THIN_BORDER;
  }

  // Column Widths
  const colWidths: { width: number }[] = [
    { width: 14 }, // KODE LOKASI
    { width: 6 },  // NO
    { width: 32 }, // NAMA ASET
    { width: 8 },  // JENIS
    { width: 16 }, // KODE ASET
    { width: 15 }, // TGL MASUK
    { width: 15 }, // TGL KELUAR
  ];
  columns.forEach(() => {
    colWidths.push({ width: 14 }); // QTY COIN/TAP
    colWidths.push({ width: 16 }); // PENDAPATAN
  });
  colWidths.push({ width: 16 }); // TOTAL QTY COIN/TAP
  colWidths.push({ width: 18 }); // TOTAL PENDAPATAN
  colWidths.push({ width: 20 }); // KETERANGAN
  ws.columns = colWidths;
};

export const exportLaporanPendapatanExcel = async (options: LaporanPendapatanExportOptions): Promise<void> => {
  const {
    groupedData = [],
    grandTotals = { colTotals: {}, totalCoin: 0, totalRevenue: 0 },
    columns,
    locationCode,
    locationName,
    periodeLabel,
    filename,
    multiLocationsData,
  } = options;

  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'GameMaster Ops • AssetFlow';
  workbook.created = new Date();

  if (multiLocationsData && multiLocationsData.length > 0) {
    // SEMUA LOKASI: Buat 1 Sheet per lokasi sesuai permintaan user
    multiLocationsData.forEach((locBundle) => {
      const sheetName = (locBundle.locationCode || 'LOKASI').slice(0, 31);
      const ws = workbook.addWorksheet(sheetName, {
        views: [{ state: 'frozen', ySplit: 6, showGridLines: true }],
      });
      buildRevenueSheet(
        ws,
        locBundle.locationCode,
        locBundle.locationName,
        periodeLabel,
        columns,
        locBundle.groupedData,
        locBundle.grandTotals
      );
    });
  } else {
    // 1 Lokasi: Sheet name pakai KODE LOKASI, contoh YMCR
    const sheetName = (locationCode || 'LAPORAN PENDAPATAN').slice(0, 31);
    const ws = workbook.addWorksheet(sheetName, {
      views: [{ state: 'frozen', ySplit: 6, showGridLines: true }],
    });
    buildRevenueSheet(
      ws,
      locationCode,
      locationName,
      periodeLabel,
      columns,
      groupedData,
      grandTotals
    );
  }

  await saveWorkbook(workbook, filename);
};

// -------------------------------------------------------------
// LEGACY COMPATIBILITY HELPERS
// -------------------------------------------------------------
export const exportToExcel = (data: Record<string, unknown>[], filename: string, sheetName = 'Sheet1') => {
  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName);
  XLSX.writeFile(wb, `${filename}.xlsx`);
};

export const export3SheetsExcel = (
  mesinRows: Record<string, unknown>[],
  joynFunRows: Record<string, unknown>[],
  inventarisRows: Record<string, unknown>[],
  filename: string
) => {
  const wb = XLSX.utils.book_new();
  const wsMesin = XLSX.utils.json_to_sheet(mesinRows.length > 0 ? mesinRows : [{ INFO: 'Tidak ada data mesin' }]);
  XLSX.utils.book_append_sheet(wb, wsMesin, 'MESIN');
  const wsInv = XLSX.utils.json_to_sheet(inventarisRows.length > 0 ? inventarisRows : [{ INFO: 'Tidak ada data inventaris' }]);
  XLSX.utils.book_append_sheet(wb, wsInv, 'INVENTARIS');
  const wsJF = XLSX.utils.json_to_sheet(joynFunRows.length > 0 ? joynFunRows : [{ INFO: "Tidak ada data Joy'n Fun" }]);
  XLSX.utils.book_append_sheet(wb, wsJF, "JOY'N FUN");
  XLSX.writeFile(wb, `${filename}.xlsx`);
};

/**
 * Robust date parser for Excel dates supporting:
 * - DD-MMM-YY / DD-MMM-YYYY (e.g., 12-Jan-24, 15-Okt-26, 05-Mei-23, 10-Agt-22, 14-Des-25)
 * - Indonesian and English month names
 * - Excel numeric date serials (e.g. 45312)
 * - DD/MM/YYYY, DD-MM-YYYY, YYYY-MM-DD
 * - Native JS Date objects
 * Returns strict YYYY-MM-DD format for <input type="date">
 */
const MONTH_MAP: Record<string, string> = {
  jan: '01', januari: '01', january: '01',
  feb: '02', februari: '02', february: '02',
  mar: '03', maret: '03', march: '03',
  apr: '04', april: '04',
  mei: '05', may: '05',
  jun: '06', juni: '06', june: '06',
  jul: '07', juli: '07', july: '07',
  agu: '08', agt: '08', aug: '08', agustus: '08', august: '08',
  sep: '09', september: '09',
  okt: '10', oct: '10', oktober: '10', october: '10',
  nov: '11', nop: '11', november: '11',
  des: '12', dec: '12', desember: '12', december: '12',
};

export const parseExcelDate = (val: unknown, fallback = ''): string => {
  if (val === undefined || val === null || val === '') return fallback;

  // 1. If already a Date object
  if (val instanceof Date) {
    if (!isNaN(val.getTime())) {
      if (val.getUTCHours() === 0 && val.getUTCMinutes() === 0 && val.getUTCSeconds() === 0) {
        const y = val.getUTCFullYear();
        const m = String(val.getUTCMonth() + 1).padStart(2, '0');
        const d = String(val.getUTCDate()).padStart(2, '0');
        return `${y}-${m}-${d}`;
      }
      const y = val.getFullYear();
      const m = String(val.getMonth() + 1).padStart(2, '0');
      const d = String(val.getDate()).padStart(2, '0');
      return `${y}-${m}-${d}`;
    }
  }

  // 2. If Excel serial number
  if (
    typeof val === 'number' ||
    (!isNaN(Number(val)) &&
      Number(val) > 10000 &&
      Number(val) < 80000 &&
      !String(val).includes('-') &&
      !String(val).includes('/'))
  ) {
    const num = Number(val);
    const date = new Date(Math.round((num - 25569) * 86400 * 1000));
    if (!isNaN(date.getTime())) {
      const y = date.getUTCFullYear();
      const m = String(date.getUTCMonth() + 1).padStart(2, '0');
      const d = String(date.getUTCDate()).padStart(2, '0');
      return `${y}-${m}-${d}`;
    }
  }

  const str = String(val).trim();
  if (!str || str === '-' || str === '--' || str === '---' || str === '0') return fallback;

  // 3. Already YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
    return str;
  }

  // 4. Matches DD-MMM-YY or DD-MMM-YYYY
  const dMmmY = str.match(/^(\d{1,2})[\s\-/.']*\b([a-zA-Z]{3,})\b[\s\-/.']*'?(\d{2,4})$/);
  if (dMmmY) {
    const day = String(parseInt(dMmmY[1], 10)).padStart(2, '0');
    const monthKey = dMmmY[2].toLowerCase();
    const month = MONTH_MAP[monthKey];
    if (month) {
      let year = parseInt(dMmmY[3], 10);
      if (year < 70) year += 2000;
      else if (year < 100) year += 1900;
      return `${year}-${month}-${day}`;
    }
  }

  // 5. Matches MMM-DD-YY or MMM-DD-YYYY
  const mmmDY = str.match(/^([a-zA-Z]{3,})[\s\-/.']*\b(\d{1,2})\b[\s\-/.']*'?(\d{2,4})$/);
  if (mmmDY) {
    const monthKey = mmmDY[1].toLowerCase();
    const month = MONTH_MAP[monthKey];
    const day = String(parseInt(mmmDY[2], 10)).padStart(2, '0');
    if (month) {
      let year = parseInt(mmmDY[3], 10);
      if (year < 70) year += 2000;
      else if (year < 100) year += 1900;
      return `${year}-${month}-${day}`;
    }
  }

  // 6. Matches DD/MM/YYYY or DD-MM-YYYY
  const dmyMatch = str.match(/^(\d{1,2})[\s\-/.']+(\d{1,2})[\s\-/.']+'?(\d{2,4})$/);
  if (dmyMatch) {
    const day = String(parseInt(dmyMatch[1], 10)).padStart(2, '0');
    const month = String(parseInt(dmyMatch[2], 10)).padStart(2, '0');
    let year = parseInt(dmyMatch[3], 10);
    if (year < 70) year += 2000;
    else if (year < 100) year += 1900;
    return `${year}-${month}-${day}`;
  }

  // 7. Fallback to standard Date.parse
  const parsedTs = Date.parse(str);
  if (!isNaN(parsedTs)) {
    const dt = new Date(parsedTs);
    const y = dt.getFullYear();
    const m = String(dt.getMonth() + 1).padStart(2, '0');
    const d = String(dt.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  return fallback;
};

export interface ParsedExcelRow {
  rowIdx: number;
  data: Record<string, unknown>;
  photoUrl?: string;
}

/**
 * Parses an Excel (.xlsx, .xls) file and extracts both row data and embedded in-cell pictures!
 */
export const parseExcelFileWithImages = async (file: File): Promise<ParsedExcelRow[]> => {
  const arrayBuffer = await file.arrayBuffer();

  const workbook = XLSX.read(arrayBuffer, {
    type: 'array',
    cellDates: true,
    cellFormula: true,
    cellNF: true,
  });

  const firstSheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[firstSheetName];

  const rawRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(worksheet, {
    defval: '',
  });

  const rowImages: Record<number, string> = {};
  const orderedImages: string[] = [];
  const imageNameMap: Record<string, string> = {};

  try {
    const zip = await JSZip.loadAsync(arrayBuffer);
    const mediaFiles: Record<string, string> = {};
    const mediaPromises: Promise<void>[] = [];

    zip.forEach((relativePath, zipEntry) => {
      const lower = relativePath.toLowerCase();
      if ((lower.startsWith('xl/media/') || lower.includes('/media/')) && !zipEntry.dir) {
        const promise = (async () => {
          const ext = relativePath.split('.').pop()?.toLowerCase() || 'png';
          const mimeType =
            ext === 'jpg' || ext === 'jpeg'
              ? 'image/jpeg'
              : ext === 'gif'
              ? 'image/gif'
              : ext === 'webp'
              ? 'image/webp'
              : 'image/png';
          const base64 = await zipEntry.async('base64');
          const dataUrl = `data:${mimeType};base64,${base64}`;
          const filename = relativePath.split('/').pop() || '';

          mediaFiles[filename] = dataUrl;
          mediaFiles[relativePath] = dataUrl;
          mediaFiles[relativePath.replace(/^xl\//, '')] = dataUrl;
          mediaFiles[`media/${filename}`] = dataUrl;
          orderedImages.push(dataUrl);
        })();
        mediaPromises.push(promise);
      }
    });

    await Promise.all(mediaPromises);

    // Modern Excel Place in Cell
    let cellImagesEntry = zip.file('xl/cellimages.xml') || zip.file('xl/cellImages.xml');
    if (!cellImagesEntry) {
      const cellImgFiles = zip.file(/xl\/cellimages\.xml$/i);
      if (cellImgFiles && cellImgFiles.length > 0) cellImagesEntry = cellImgFiles[0];
    }

    let cellImagesRelsEntry = zip.file('xl/_rels/cellimages.xml.rels') || zip.file('xl/_rels/cellImages.xml.rels');
    if (!cellImagesRelsEntry) {
      const cellImgRels = zip.file(/xl\/_rels\/cellimages\.xml\.rels$/i);
      if (cellImgRels && cellImgRels.length > 0) cellImagesRelsEntry = cellImgRels[0];
    }

    if (cellImagesEntry) {
      const rIdMap: Record<string, string> = {};

      if (cellImagesRelsEntry) {
        const relsText = await cellImagesRelsEntry.async('text');
        const relMatches = relsText.matchAll(/<Relationship[^>]+Id="([^"]+)"[^>]+Target="([^"]+)"/gi);
        for (const m of relMatches) {
          rIdMap[m[1]] = m[2];
        }
      }

      const cellImagesText = await cellImagesEntry.async('text');
      const imgMatches = cellImagesText.matchAll(
        /<(?:etc:)?(?:cellImage|pic)[^>]*>(?:(?!<\/(?:etc:)?(?:cellImage|pic)>).)*?(?:name="([^"]+)")?(?:(?!<\/(?:etc:)?(?:cellImage|pic)>).)*?(?:r:embed|embed)="([^"]+)"(?:(?!<\/(?:etc:)?(?:cellImage|pic)>).)*?<\/(?:etc:)?(?:cellImage|pic)>/gis
      );

      let imgIdx = 0;
      for (const im of imgMatches) {
        const imgName = im[1] || '';
        const rId = im[2];
        const target = rIdMap[rId] || '';
        const targetFilename = target.split('/').pop() || '';
        const dataUrl =
          mediaFiles[targetFilename] ||
          mediaFiles[target] ||
          mediaFiles[`media/${targetFilename}`] ||
          mediaFiles[`xl/${target}`] ||
          orderedImages[imgIdx];

        if (dataUrl) {
          if (imgName) {
            imageNameMap[imgName] = dataUrl;
          }
          rowImages[imgIdx] = dataUrl;
        }
        imgIdx++;
      }
    }

    // DISPIMG formulas
    if (worksheet) {
      for (const [cellKey, cellObj] of Object.entries(worksheet)) {
        if (!cellKey.startsWith('!') && cellObj && typeof cellObj === 'object') {
          const formula = (cellObj as { f?: string; v?: unknown }).f || String((cellObj as { v?: unknown }).v || '');
          if (formula.includes('DISPIMG')) {
            const idMatch = formula.match(/DISPIMG\(["']([^"']+)["']/i);
            if (idMatch) {
              const imgId = idMatch[1];
              const rowMatch = cellKey.match(/\d+$/);
              if (rowMatch && imageNameMap[imgId]) {
                const sheetRowNum = parseInt(rowMatch[0], 10);
                if (sheetRowNum >= 2) {
                  rowImages[sheetRowNum - 2] = imageNameMap[imgId];
                }
              }
            }
          }
        }
      }
    }

    // Drawings in zip
    const drawingFiles = zip.file(/xl\/drawings\/drawing\d+\.xml$/i);
    for (const drawingEntry of drawingFiles) {
      const drawingPath = drawingEntry.name;
      const drawingFileName = drawingPath.split('/').pop() || '';
      const relsPath = `xl/drawings/_rels/${drawingFileName}.rels`;
      let drawingRelsEntry = zip.file(relsPath);
      if (!drawingRelsEntry) {
        const found = zip.file(new RegExp(relsPath.replace('.', '\\.'), 'i'));
        if (found && found.length > 0) drawingRelsEntry = found[0];
      }

      const drawingText = await drawingEntry.async('text');
      const rIdMap: Record<string, string> = {};

      if (drawingRelsEntry) {
        const relsText = await drawingRelsEntry.async('text');
        const relMatches = relsText.matchAll(/<Relationship[^>]+Id="([^"]+)"[^>]+Target="([^"]+)"/gi);
        for (const m of relMatches) {
          rIdMap[m[1]] = m[2].replace('../', '');
        }
      }

      const anchorRegex =
        /<xdr:(?:twoCellAnchor|oneCellAnchor|absoluteAnchor)[^>]*>.*?<xdr:from>.*?<xdr:col>(\d+)<\/xdr:col>.*?<xdr:row>(\d+)<\/xdr:row>.*?<\/xdr:from>.*?(?:r:embed|embed)="([^"]+)".*?<\/xdr:(?:twoCellAnchor|oneCellAnchor|absoluteAnchor)>/gis;
      const anchors = drawingText.matchAll(anchorRegex);

      for (const a of anchors) {
        const rowNum = parseInt(a[2], 10);
        const rId = a[3];
        const target = rIdMap[rId] || '';
        const targetFilename = target.split('/').pop() || '';
        const dataUrl =
          mediaFiles[targetFilename] ||
          mediaFiles[target] ||
          mediaFiles[`media/${targetFilename}`] ||
          mediaFiles[`xl/media/${targetFilename}`] ||
          mediaFiles[`xl/${target}`];

        if (dataUrl && rowNum >= 1) {
          rowImages[rowNum - 1] = dataUrl;
        }
      }
    }
  } catch {
    // Continue with text data
  }

  return rawRows.map((data, idx) => {
    let photoUrl = '';
    for (const [k, v] of Object.entries(data)) {
      const keyUpper = k.toUpperCase().trim();
      if (
        keyUpper.includes('FOTO') ||
        keyUpper.includes('IMAGE') ||
        keyUpper.includes('PICTURE') ||
        keyUpper.includes('GAMBAR')
      ) {
        const valStr = String(v).trim();
        if (valStr.startsWith('http://') || valStr.startsWith('https://') || valStr.startsWith('data:image/')) {
          photoUrl = valStr;
        } else if (valStr.includes('=IMAGE(')) {
          const urlMatch = valStr.match(/=IMAGE\(["']([^"']+)["']\)/i);
          if (urlMatch) photoUrl = urlMatch[1];
        }
      }
    }

    if (!photoUrl && rowImages[idx]) {
      photoUrl = rowImages[idx];
    }

    if (!photoUrl && orderedImages.length > idx) {
      photoUrl = orderedImages[idx];
    }

    return {
      rowIdx: idx,
      data,
      photoUrl: photoUrl || undefined,
    };
  });
};

export const parseExcelFile = async (file: File): Promise<Record<string, unknown>[]> => {
  const result = await parseExcelFileWithImages(file);
  return result.map((r) => ({
    ...r.data,
    photoUrl: r.photoUrl || '',
    ...(r.photoUrl ? { FOTO_EXTRACTED: r.photoUrl } : {}),
  }));
};

// -------------------------------------------------------------
// TEMPLATES FOR EXCEL IMPORT
// -------------------------------------------------------------
export const downloadTemplateHapusAset = (): void => {
  const wsData = [
    [
      'KODE LOKASI',
      'NO',
      'NAMA',
      'JENIS',
      'KODE ASET',
      'READER TAP/SWIPE',
      'HARGA BERMAIN',
      'TANGGAL HAPUS',
      'KETERANGAN',
    ],
    [
      'BECO',
      1,
      'ANIMAL KAISER',
      'SM',
      'BECOSM001',
      'TAP',
      3000,
      new Date().toISOString().slice(0, 10),
      'Afkir / Unit Rusak Berat',
    ],
    [
      'BHSC',
      2,
      'BASKET BALL',
      'IK',
      'BHSCIK002',
      'SWIPE',
      4000,
      new Date().toISOString().slice(0, 10),
      'Penarikan Aset',
    ],
  ];
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet(wsData);
  ws['!cols'] = [
    { wch: 15 },
    { wch: 6 },
    { wch: 25 },
    { wch: 10 },
    { wch: 18 },
    { wch: 18 },
    { wch: 16 },
    { wch: 16 },
    { wch: 28 },
  ];
  XLSX.utils.book_append_sheet(wb, ws, 'Template Hapus');
  XLSX.writeFile(wb, 'Template_Import_Hapus_Aset.xlsx');
};

export const downloadTemplateRotasiKeluar = (): void => {
  const wsData = [
    [
      'NO',
      'NAMA ASSET',
      'JENIS',
      'KODE ASET',
      'TANGGAL KELUAR',
      'DARI LOKASI',
      'KE LOKASI',
    ],
    [
      1,
      'ANIMAL KAISER',
      'SM',
      'BECOSM001',
      new Date().toISOString().slice(0, 10),
      'BECO',
      'BHSC',
    ],
    [
      2,
      'BASKET BALL',
      'IK',
      'BHSCIK002',
      new Date().toISOString().slice(0, 10),
      'BHSC',
      'FSCL',
    ],
  ];
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet(wsData);
  ws['!cols'] = [
    { wch: 6 },
    { wch: 25 },
    { wch: 10 },
    { wch: 18 },
    { wch: 16 },
    { wch: 15 },
    { wch: 15 },
  ];
  XLSX.utils.book_append_sheet(wb, ws, 'Template Rotasi Keluar');
  XLSX.writeFile(wb, 'Template_Import_Rotasi_Keluar.xlsx');
};

