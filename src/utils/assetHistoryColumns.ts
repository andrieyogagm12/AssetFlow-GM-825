import { Asset, RotationRecord } from '../types/asset';
import { dateStringToNumber } from './assetTimeline';

export const MONTH_ABBRS = [
  'JAN', 'FEB', 'MAR', 'APR', 'MEI', 'JUN',
  'JUL', 'AGU', 'SEP', 'OKT', 'NOV', 'DES'
];

export interface HistoryMonthColumn {
  key: string;        // e.g. "JAN_2020"
  label: string;      // e.g. "JAN 2020"
  monthName: string;  // e.g. "JAN"
  year: number;       // e.g. 2020
  yearStr: string;    // e.g. "2020"
  monthIndex: number; // 0 to 11
  month1Based: number;// 1 to 12
}

/**
 * Generates an array of month columns from start to end (default: 2020-01 up to current month).
 */
export function generateHistoriMonths(
  start = '2020-01',
  end?: string
): HistoryMonthColumn[] {
  const [startYearStr, startMonthStr] = start.split('-');
  const startY = parseInt(startYearStr, 10) || 2020;
  const startM = (parseInt(startMonthStr, 10) || 1) - 1;

  const now = new Date();
  let endY = now.getFullYear();
  let endM = now.getMonth();

  if (end) {
    const [eyStr, emStr] = end.split('-');
    const parsedEy = parseInt(eyStr, 10);
    const parsedEm = (parseInt(emStr, 10) || 1) - 1;
    if (!isNaN(parsedEy)) endY = parsedEy;
    if (!isNaN(parsedEm)) endM = parsedEm;
  }

  // Ensure at least up to end of 2026 or current date
  if (endY < 2026) {
    endY = 2026;
    endM = 11;
  }

  const columns: HistoryMonthColumn[] = [];
  let curY = startY;
  let curM = startM;

  while (curY < endY || (curY === endY && curM <= endM)) {
    const monthName = MONTH_ABBRS[curM] || 'JAN';
    const key = `${monthName}_${curY}`;
    const label = `${monthName} ${curY}`;

    columns.push({
      key,
      label,
      monthName,
      year: curY,
      yearStr: String(curY),
      monthIndex: curM,
      month1Based: curM + 1,
    });

    curM++;
    if (curM > 11) {
      curM = 0;
      curY++;
    }
  }

  return columns;
}

/**
 * Returns header background, text color, and tailwind classes per year as specified.
 */
export function getYearColorStyle(year: number): {
  bg: string;
  text: string;
  className: string;
} {
  switch (year) {
    case 2017:
      return { bg: '#03A9F4', text: '#ffffff', className: 'bg-[#03A9F4] text-white' };
    case 2018:
      return { bg: '#F44336', text: '#ffffff', className: 'bg-[#F44336] text-white' };
    case 2019:
      return { bg: '#FFE082', text: '#000000', className: 'bg-[#FFE082] text-black' };
    case 2020:
      return { bg: '#FFEB3B', text: '#000000', className: 'bg-[#FFEB3B] text-black' };
    case 2021:
      return { bg: '#FFA000', text: '#000000', className: 'bg-[#FFA000] text-black' };
    case 2022:
      return { bg: '#8BC34A', text: '#000000', className: 'bg-[#8BC34A] text-black' };
    case 2023:
      return { bg: '#FFEB3B', text: '#000000', className: 'bg-[#FFEB3B] text-black' };
    case 2024:
      return { bg: '#03A9F4', text: '#ffffff', className: 'bg-[#03A9F4] text-white' };
    case 2025:
      return { bg: '#F44336', text: '#ffffff', className: 'bg-[#F44336] text-white' };
    case 2026:
      return { bg: '#FFE082', text: '#000000', className: 'bg-[#FFE082] text-black' };
    default:
      return { bg: '#1e40af', text: '#ffffff', className: 'bg-[#1e40af] text-white' };
  }
}

/**
 * Extracts 2-digit day string (DD) from any date format (YYYY-MM-DD, DD-MMM-YY, ISO).
 */
export function extractDay2Digit(dateStr?: string | null): string {
  if (!dateStr || dateStr === '-' || typeof dateStr !== 'string') return '';
  const trimmed = dateStr.trim();
  if (!trimmed) return '';

  // Match YYYY-MM-DD or YYYY/MM/DD
  const m1 = trimmed.match(/^\d{4}[-/]\d{1,2}[-/](\d{1,2})/);
  if (m1) {
    return String(parseInt(m1[1], 10)).padStart(2, '0');
  }

  // Match DD-MMM-YY or DD/MM/YYYY or DD-MM-YYYY
  const m2 = trimmed.match(/^(\d{1,2})[-/]/);
  if (m2) {
    return String(parseInt(m2[1], 10)).padStart(2, '0');
  }

  const parsed = new Date(trimmed);
  if (isNaN(parsed.getTime())) return '';
  return String(parsed.getDate()).padStart(2, '0');
}

export interface AssetMovementEvent {
  location: string;
  dateStr: string;
  year: number;
  month: number;      // 1 to 12
  dayStr: string;     // 2 digits
  dateNumber: number; // YYYYMMDD
  formatted: string;  // e.g. "KPST (masuk tgl 14)"
}

/**
 * Computes the location history for an asset across all monthly columns based on Menu 5 (rotations).
 *
 * Rules:
 * 1. Initial entry: takes initial location and initial entry date from Menu 5 (first rotation or asset.entryDate).
 * 2. Movements in month: if an asset has movements in a month:
 *    - 1 movement: "LOC (masuk tgl DD)" e.g. "MWMS (masuk tgl 23)"
 *    - >1 movements in same month: multiline wrap text separated by \n:
 *      "GCNN (masuk tgl 21)\nKPST (masuk tgl 21)"
 * 3. Carry forward: if no movement in a month, displays the active location with its original entry date.
 * 4. Months prior to asset's initial entrance or after deletion are left blank ("").
 */
export function computeAssetHistoryMap(
  asset: Asset,
  rotations: RotationRecord[],
  months: HistoryMonthColumn[]
): Record<string, string> {
  const normAssetCode = asset.code.trim().toUpperCase();

  // 1. Get all valid non-rejected rotations for this asset from Menu 5
  const assetRotations = rotations.filter(
    (r) =>
      r.assetCode.trim().toUpperCase() === normAssetCode &&
      r.status !== 'DITOLAK'
  );

  // 2. Identify initial location & arrival date
  const baruRot = assetRotations.find((r) => r.fromLocationCode?.toUpperCase() === 'BARU');

  // Filter transfers where fromLocation !== toLocation
  const transferRotations = assetRotations
    .filter(
      (r) =>
        r.fromLocationCode &&
        r.toLocationCode &&
        r.fromLocationCode.toUpperCase() !== r.toLocationCode.toUpperCase() &&
        r.fromLocationCode.toUpperCase() !== 'BARU'
    )
    .sort((a, b) => {
      const dateA = a.entryDate || a.confirmDate || a.exitDate || '';
      const dateB = b.entryDate || b.confirmDate || b.exitDate || '';
      if (dateA !== dateB) return dateA.localeCompare(dateB);
      return (a.id || '').localeCompare(b.id || '');
    });

  let initialLocation = asset.locationCode;
  let initialDateStr = '';

  if (baruRot) {
    initialLocation = baruRot.toLocationCode;
    initialDateStr = baruRot.entryDate || baruRot.confirmDate || baruRot.exitDate || asset.entryDate || '';
  } else if (transferRotations.length > 0) {
    // If first transfer exists, check if fromLocation is specified
    const firstTr = transferRotations[0];
    const firstTrDate = firstTr.entryDate || firstTr.confirmDate || firstTr.exitDate || '';
    if (firstTr.fromLocationCode && firstTr.fromLocationCode.toUpperCase() !== 'BARU') {
      initialLocation = firstTr.fromLocationCode;
      initialDateStr = asset.entryDate || asset.buyDate || firstTrDate;
    } else {
      initialLocation = firstTr.toLocationCode;
      initialDateStr = firstTrDate || asset.entryDate || '';
    }
  } else {
    initialLocation = asset.locationCode;
    initialDateStr = asset.entryDate || asset.buyDate || '';
  }

  const initialDateNum = dateStringToNumber(initialDateStr);
  const initialDayStr = extractDay2Digit(initialDateStr);

  const initialMovement: AssetMovementEvent | null = initialDateNum
    ? {
        location: initialLocation,
        dateStr: initialDateStr,
        year: Math.floor(initialDateNum / 10000),
        month: Math.floor((initialDateNum % 10000) / 100),
        dayStr: initialDayStr,
        dateNumber: initialDateNum,
        formatted: initialDayStr ? `${initialLocation} (masuk tgl ${initialDayStr})` : initialLocation,
      }
    : null;

  // 3. Build subsequent transfer movements
  const transferMovements: AssetMovementEvent[] = transferRotations.map((rot) => {
    const dStr = rot.entryDate || rot.confirmDate || rot.exitDate || '';
    const dayStr = extractDay2Digit(dStr);
    const dNum = dateStringToNumber(dStr) || 20261015;
    const y = Math.floor(dNum / 10000);
    const m = Math.floor((dNum % 10000) / 100);

    return {
      location: rot.toLocationCode,
      dateStr: dStr,
      year: y,
      month: m,
      dayStr,
      dateNumber: dNum,
      formatted: dayStr ? `${rot.toLocationCode} (masuk tgl ${dayStr})` : rot.toLocationCode,
    };
  });

  // Combine and sort chronologically
  const allMovements: AssetMovementEvent[] = (
    initialMovement ? [initialMovement, ...transferMovements] : transferMovements
  ).sort((a, b) => a.dateNumber - b.dateNumber);

  // Deletion date number if asset was deleted
  let deleteDateNum: number | null = null;
  if (asset.status === 'DELETED' && asset.deleteDate) {
    deleteDateNum = dateStringToNumber(asset.deleteDate);
  }

  // 4. Fill historyMap for each month
  const historyMap: Record<string, string> = {};

  months.forEach((m) => {
    const monthStartNum = m.year * 10000 + m.month1Based * 100 + 1;
    const monthEndNum = m.year * 10000 + m.month1Based * 100 + 31;

    // Check 1: Did the asset exist yet by month end?
    if (allMovements.length === 0 || allMovements[0].dateNumber > monthEndNum) {
      historyMap[m.key] = '';
      return;
    }

    // Check 2: Was the asset deleted before this month started?
    if (deleteDateNum !== null && deleteDateNum < monthStartNum) {
      historyMap[m.key] = '';
      return;
    }

    // Check 3: Movements that took place during this specific month
    const movementsInMonth = allMovements.filter(
      (mv) => mv.year === m.year && mv.month === m.month1Based
    );

    if (movementsInMonth.length > 0) {
      // 1 or more movements in this month -> list them (wrapped with newline if > 1)
      historyMap[m.key] = movementsInMonth.map((x) => x.formatted).join('\n');
      return;
    }

    // Check 4: No movements in this month -> carry forward latest active location code only
    const priorMovements = allMovements.filter((x) => x.dateNumber <= monthEndNum);
    if (priorMovements.length > 0) {
      const latest = priorMovements[priorMovements.length - 1];
      if (latest.location.toUpperCase() === 'DIHAPUS') {
        historyMap[m.key] = '';
      } else {
        // Only mention location code without (masuk tgl ...)
        historyMap[m.key] = latest.location;
      }
    } else {
      historyMap[m.key] = '';
    }
  });

  return historyMap;
}
