import { Asset, RotationRecord } from '../types/asset';
import { formatDdMmmYy } from './dateFormatter';

export interface AssetPeriodLocationResult {
  computedLocationCode: string;
  isActiveInPeriod: boolean;
  computedEntryDate?: string;
  hasRotated: boolean;
}

export interface AssetPresenceResult {
  wasPresentInPeriod: boolean;
  entryDateStr: string;
  exitDateStr: string;
}

/**
 * Converts date string (YYYY-MM-DD, ISO string, etc.) to integer YYYYMMDD for reliable comparison
 * immune to UTC / local timezone shifts.
 */
export function dateStringToNumber(dateStr?: string | null): number | null {
  if (!dateStr || dateStr === '-' || typeof dateStr !== 'string') return null;
  const trimmed = dateStr.trim();
  if (!trimmed) return null;

  const match = trimmed.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);
  if (match) {
    const y = parseInt(match[1], 10);
    const m = parseInt(match[2], 10);
    const d = parseInt(match[3], 10);
    return y * 10000 + m * 100 + d;
  }

  const parsed = new Date(trimmed);
  if (isNaN(parsed.getTime())) return null;
  const y = parsed.getFullYear();
  const m = parsed.getMonth() + 1;
  const d = parsed.getDate();
  return y * 10000 + m * 100 + d;
}

/**
 * Returns the end-of-period number YYYYMMDD for a given year and month.
 * If year === 'ALL', returns null (no cutoff, represents current/latest state).
 * If month === 'ALL', returns YYYY1231 (end of that year).
 * Otherwise returns the last day of month in year (e.g. August 2026 -> 20260831).
 */
export function getPeriodEndNumber(
  year: string | number,
  month: string | number
): number | null {
  if (year === 'ALL' || !year) return null;
  const y = typeof year === 'number' ? year : parseInt(String(year), 10);
  if (isNaN(y)) return null;

  if (month === 'ALL' || !month) {
    return y * 10000 + 1231;
  }

  const m = typeof month === 'number' ? month : parseInt(String(month), 10);
  if (isNaN(m) || m < 1 || m > 12) return null;

  const lastDay = new Date(y, m, 0).getDate();
  return y * 10000 + m * 100 + lastDay;
}

/**
 * Computes an asset's location and active status for any specified period (month & year)
 * using the movement history in rotations (Menu 5 / Info Perpindahan Aset).
 *
 * Example:
 * Asset KANBIA0107 was in YMCR up until August 2026, then in September 2026 was rotated to KPST.
 * - When period is <= August 2026, computedLocationCode = 'YMCR'.
 * - When period is >= September 2026, computedLocationCode = 'KPST'.
 */
/**
 * Computes an asset's location and active status for any specified period (month & year)
 * using the movement history in rotations (Menu 5 / Info Perpindahan Aset).
 *
 * Sesuai Logika Wajib User:
 * IF Riwayat_Lokasi == ON (strictHistory = true):
 * 1. Hitung END_DATE dari filter periode: LAST_DAY dari BULAN+TAHUN yang dipilih (misal AGUSTUS 2026 = 2026-08-31 23:59:59).
 * 2. Untuk setiap aset, ambil 1 riwayat TERAKHIR yang tanggal_pindah <= END_DATE.
 * 3. Lokasi aktif aset saat itu = lokasi_tujuan dari riwayat tersebut.
 * 4. Jika TIDAK ADA riwayat <= END_DATE -> artinya aset belum lahir / belum masuk -> JANGAN TAMPILKAN (isActiveInPeriod: false).
 * 5. Lokasi aktif difilter terhadap filter lokasi dan user_allowed_locations.
 *
 * ELSE (Riwayat Lokasi OFF):
 * Pakai logika master: master_aset.kode_lokasi.
 */
/**
 * Computes an asset's location and active status for any specified period (month & year)
 * using the movement history in rotations (Menu 5 / Info Perpindahan Aset).
 *
 * Aturan Bisnis Utama:
 * 1. Sumber kebenaran penentuan lokasi per periode diambil dari Menu 5 (riwayat perpindahan / rotations).
 * 2. Untuk satu KODE ASET, cari semua data perpindahan dimana TANGGAL MASUK <= akhir bulan dari periode yang dipilih (END_DATE).
 * 3. Urutkan TANGGAL MASUK DESC, ambil LOKASI TERKINI yang paling atas (paling terakhir).
 *    Jika dalam 1 periode ada beberapa kali rotasi, ambil rotasi yang paling terakhir.
 * 4. Jika sebuah aset belum pernah punya data di Menu 5 sampai periode tersebut,
 *    fallback ke lokasi awal aset (lokasi pertama kali aset dibuat).
 * 5. Mode Kumulatif: aset dengan TGL MASUK setelah akhir periode tidak muncul pada periode yang dipilih.
 */
export function computeAssetLocationForPeriod(
  asset: Asset,
  rotations: RotationRecord[],
  selectedYear: string | number,
  selectedMonth: string | number,
  requireStrictHistory = true
): AssetPeriodLocationResult {
  const periodEndNum = getPeriodEndNumber(selectedYear, selectedMonth);

  // Normalize code
  const normAssetCode = asset.code.trim().toUpperCase();

  // 1. Ambil semua riwayat perpindahan valid untuk aset ini (status bukan DITOLAK dan bukan MENUNGGU konfirmasi)
  const assetRotations = rotations.filter(
    (r) =>
      r.assetCode.trim().toUpperCase() === normAssetCode &&
      r.status !== 'DITOLAK' &&
      r.status !== 'MENUNGGU'
  );

  // Urutkan riwayat secara kronologis (dari paling awal ke paling akhir)
  // Jika tanggal sama, dahulukan riwayat yang dibuat lebih awal agar elemen terakhir adalah yang paling baru
  const sortedRotations = assetRotations
    .map((r, originalIdx) => ({ r, originalIdx }))
    .sort((a, b) => {
      const dateA = a.r.entryDate || a.r.confirmDate || a.r.exitDate || '';
      const dateB = b.r.entryDate || b.r.confirmDate || b.r.exitDate || '';
      if (dateA !== dateB) return dateA.localeCompare(dateB);
      // Di array rawRotations, rotasi baru di-unshift ke index 0.
      // Maka originalIdx yang lebih kecil dibuat lebih baru (datang belakangan saat diurutkan ASC).
      return b.originalIdx - a.originalIdx;
    })
    .map((item) => item.r);

  // Deteksi lokasi awal aset (lokasi pertama kali aset dibuat) & tanggal masuk awal
  let initialLocation = asset.locationCode;
  let initialDateStr = asset.entryDate || asset.buyDate || '';

  const baruRot = sortedRotations.find((r) => r.type === 'BARU' || r.fromLocationCode?.toUpperCase() === 'BARU');
  if (baruRot) {
    initialLocation = baruRot.toLocationCode;
    initialDateStr = baruRot.entryDate || baruRot.confirmDate || baruRot.exitDate || initialDateStr;
  } else if (sortedRotations.length > 0) {
    // Jika tidak ada catatan eksplisit BARU, periksa dari mana aset berasal sebelum rotasi pertama
    const firstRot = sortedRotations[0];
    if (firstRot.fromLocationCode && firstRot.fromLocationCode.toUpperCase() !== 'BARU') {
      initialLocation = firstRot.fromLocationCode;
    } else {
      initialLocation = firstRot.toLocationCode;
    }
    if (!initialDateStr && (firstRot.entryDate || firstRot.exitDate)) {
      initialDateStr = firstRot.entryDate || firstRot.exitDate || '';
    }
  }

  // Jika tidak ada batasan periode ('ALL', 'ALL'):
  if (periodEndNum === null) {
    const isDeleted = asset.status === 'DELETED';
    let isActive = !isDeleted;

    let latestLoc = asset.locationCode;
    let latestEntry = asset.entryDate;
    if (sortedRotations.length > 0) {
      const lastRot = sortedRotations[sortedRotations.length - 1];
      latestLoc = lastRot.toLocationCode;
      latestEntry = lastRot.entryDate || lastRot.confirmDate || lastRot.exitDate || asset.entryDate;
      if (latestLoc.toUpperCase() === 'DIHAPUS') {
        isActive = false;
      }
    }

    return {
      computedLocationCode: latestLoc,
      isActiveInPeriod: isActive,
      computedEntryDate: latestEntry,
      hasRotated: sortedRotations.length > 0,
    };
  }

  // 2. Cari semua perpindahan dimana TANGGAL MASUK <= akhir bulan dari periode yang dipilih (END_DATE)
  const eligibleTransfers = sortedRotations.filter((r) => {
    const dStr = r.entryDate || r.confirmDate || r.exitDate;
    const num = dateStringToNumber(dStr);
    return num !== null && num <= periodEndNum;
  });

  // 3. Jika TIDAK ADA riwayat perpindahan <= END_DATE
  if (eligibleTransfers.length === 0) {
    // Mode Kumulatif: Cek tanggal masuk awal aset
    const masterEntryNum = dateStringToNumber(initialDateStr);
    if (!masterEntryNum || masterEntryNum > periodEndNum) {
      // Aset belum lahir / belum masuk pada periode ini -> JANGAN TAMPILKAN
      return {
        computedLocationCode: '',
        isActiveInPeriod: false,
        computedEntryDate: undefined,
        hasRotated: false,
      };
    }

    // Aset sudah ada, tetapi belum pernah ada riwayat perpindahan di Menu 5 sampai periode ini:
    // Fallback ke lokasi awal aset (lokasi pertama kali aset dibuat)
    let isActive = asset.status !== 'DELETED';
    if (asset.status === 'DELETED' && asset.deleteDate) {
      const delNum = dateStringToNumber(asset.deleteDate);
      if (delNum !== null && delNum <= periodEndNum) {
        isActive = false;
      }
    }

    return {
      computedLocationCode: initialLocation,
      isActiveInPeriod: isActive,
      computedEntryDate: initialDateStr || asset.entryDate,
      hasRotated: false,
    };
  }

  // 4. Ada riwayat perpindahan <= END_DATE:
  // Ambil 1 riwayat TERAKHIR (TANGGAL MASUK DESC LIMIT 1)
  const latest = eligibleTransfers[eligibleTransfers.length - 1];
  const computedLoc = latest.toLocationCode;
  const computedEntry = latest.entryDate || latest.confirmDate || latest.exitDate || initialDateStr || asset.entryDate;

  // Cek apakah lokasi tujuan terakhir adalah 'DIHAPUS'
  if (computedLoc.toUpperCase() === 'DIHAPUS') {
    return {
      computedLocationCode: computedLoc,
      isActiveInPeriod: false,
      computedEntryDate: computedEntry,
      hasRotated: true,
    };
  }

  // Cek jika aset dihapus di master pada atau sebelum periode ini
  if (asset.status === 'DELETED' && asset.deleteDate) {
    const delNum = dateStringToNumber(asset.deleteDate);
    if (delNum !== null && delNum <= periodEndNum) {
      return {
        computedLocationCode: computedLoc,
        isActiveInPeriod: false,
        computedEntryDate: computedEntry,
        hasRotated: true,
      };
    }
  }

  return {
    computedLocationCode: computedLoc,
    isActiveInPeriod: true,
    computedEntryDate: computedEntry,
    hasRotated: true,
  };
}

/**
 * Checks whether an asset was physically present at a specific location during a given month/year period,
 * based on the complete rotation timeline from Menu 5 (trx_rotasi).
 *
 * Rules:
 * 1. An asset is present if its stay at `targetLocationCode` overlaps with `[periodStart, periodEnd]`:
 *    - It arrived at or before the end of this month (stayStart <= periodEnd).
 *    - It did NOT leave before the beginning of this month (stayEnd === null || stayEnd >= periodStart).
 * 2. Crucial: Even if the asset rotated out during this month, it WAS present in this month,
 *    so it MUST appear in Menu 7.1 to allow revenue entry before departure.
 * 3. If the asset already rotated out prior to this month, it is NOT shown.
 */
export function checkAssetPresenceInLocationForPeriod(
  asset: Asset,
  rotations: RotationRecord[],
  targetLocationCode: string,
  year: number,
  month: number
): AssetPresenceResult {
  const targetLoc = targetLocationCode.trim().toUpperCase();
  const normAssetCode = asset.code.trim().toUpperCase();

  const daysInMonth = new Date(year, month, 0).getDate();
  const periodStartNum = year * 10000 + month * 100 + 1;
  const periodEndNum = year * 10000 + month * 100 + daysInMonth;

  // Deletion check: if deleted prior to this month, never present
  if (asset.status === 'DELETED' && asset.deleteDate) {
    const delNum = dateStringToNumber(asset.deleteDate);
    if (delNum !== null && delNum < periodStartNum) {
      return { wasPresentInPeriod: false, entryDateStr: '-', exitDateStr: '-' };
    }
  }

  // Get all valid non-rejected rotations for this asset
  const assetRotations = rotations.filter(
    (r) =>
      r.assetCode.trim().toUpperCase() === normAssetCode &&
      r.status !== 'DITOLAK'
  );

  const baruRot = assetRotations.find((r) => r.fromLocationCode?.toUpperCase() === 'BARU');

  const transferRotations = assetRotations
    .filter(
      (r) =>
        r.fromLocationCode &&
        r.toLocationCode &&
        r.fromLocationCode.toUpperCase() !== r.toLocationCode.toUpperCase() &&
        r.fromLocationCode.toUpperCase() !== 'BARU'
    )
    .sort((a, b) => {
      const dateA = a.exitDate || a.confirmDate || a.entryDate || '';
      const dateB = b.exitDate || b.confirmDate || b.entryDate || '';
      if (dateA !== dateB) return dateA.localeCompare(dateB);
      return (a.id || '').localeCompare(b.id || '');
    });

  // Determine initial location and arrival date
  let initialLoc = asset.locationCode;
  let initialDateStr = asset.entryDate || asset.buyDate || `${year}-01-01`;

  if (baruRot) {
    initialLoc = baruRot.toLocationCode;
    initialDateStr = baruRot.entryDate || baruRot.confirmDate || baruRot.exitDate || asset.entryDate || initialDateStr;
  } else if (transferRotations.length > 0) {
    initialLoc = transferRotations[0].fromLocationCode;
  }

  interface LocationStay {
    location: string;
    startStr: string;
    startNum: number;
    endStr: string | null;
    endNum: number | null;
  }

  const stays: LocationStay[] = [];
  let currentStay: LocationStay = {
    location: initialLoc.trim().toUpperCase(),
    startStr: initialDateStr,
    startNum: dateStringToNumber(initialDateStr) || 20200101,
    endStr: null,
    endNum: null,
  };

  transferRotations.forEach((tr) => {
    const transferDateStr = tr.exitDate || tr.confirmDate || tr.entryDate || '';
    const transferDateNum = dateStringToNumber(transferDateStr) || 20260101;

    // Close current stay
    currentStay.endStr = transferDateStr;
    currentStay.endNum = transferDateNum;
    stays.push(currentStay);

    // Open next stay
    const arrivalDateStr = tr.entryDate || tr.confirmDate || tr.exitDate || transferDateStr;
    currentStay = {
      location: tr.toLocationCode.trim().toUpperCase(),
      startStr: arrivalDateStr,
      startNum: dateStringToNumber(arrivalDateStr) || transferDateNum,
      endStr: null,
      endNum: null,
    };
  });
  stays.push(currentStay);

  // Look for any stay matching targetLoc that overlaps with this month [periodStartNum, periodEndNum]
  for (const stay of stays) {
    if (stay.location !== targetLoc) continue;

    // Check overlap: arrived <= periodEnd AND did not leave < periodStart
    const hasArrived = stay.startNum <= periodEndNum;
    const hasNotLeftPrior = stay.endNum === null || stay.endNum >= periodStartNum;

    if (hasArrived && hasNotLeftPrior) {
      const entryDateStr = formatDdMmmYy(stay.startStr);
      let exitDateStr = '-';

      // Did it exit during this month?
      if (stay.endNum !== null && stay.endNum >= periodStartNum && stay.endNum <= periodEndNum) {
        exitDateStr = formatDdMmmYy(stay.endStr);
      }

      return {
        wasPresentInPeriod: true,
        entryDateStr,
        exitDateStr,
      };
    }
  }

  return { wasPresentInPeriod: false, entryDateStr: '-', exitDateStr: '-' };
}

/**
 * Checks whether a location is operational (BUKA) for a specified filter period (year, month).
 * 
 * Rules per user requirement:
 * 1. If location is marked 'TUTUP' with kondisiBulan and kondisiTahun (e.g. TUTUP November 2026):
 *    - For periods >= November 2026, the location is closed -> returns false.
 *    - For periods < November 2026 (e.g. Oktober 2026 and backwards), the location was still open -> returns true.
 * 2. If location is marked 'BUKA' with kondisiBulan and kondisiTahun (e.g. BUKA Maret 2024):
 *    - For periods >= Maret 2024, the location is open -> returns true.
 *    - For periods < Maret 2024, the location was not yet open -> returns false.
 * 3. Fallbacks:
 *    - If kondisi === 'BUKA' and bulan/tahun is not specified: returns true.
 *    - If kondisi === 'TUTUP' and bulan/tahun is not specified: returns false.
 * 4. When year === 'ALL':
 *    - 'BUKA' returns true.
 *    - 'TUTUP' returns false.
 * 5. When year is specific and month === 'ALL':
 *    - For TUTUP:
 *      - if kondisiTahun > year: open whole year -> returns true.
 *      - if kondisiTahun < year: already closed before this year -> returns false.
 *      - if kondisiTahun === year: if closed after start of year (kondisiBulan > 1), was open during this year -> returns true; if closed at month 1 -> returns false.
 *    - For BUKA:
 *      - if kondisiTahun <= year: open in or before this year -> returns true.
 *      - if kondisiTahun > year: opens in future year -> returns false.
 */
export function isLocationOperationalInPeriod(
  loc: { kondisi?: 'BUKA' | 'TUTUP'; kondisiBulan?: number; kondisiTahun?: number },
  selectedYear: string | number,
  selectedMonth: string | number
): boolean {
  const kondisi = loc.kondisi || 'BUKA';
  const hasPeriod = Boolean(loc.kondisiTahun && loc.kondisiBulan);

  // If SEMUA TAHUN selected
  if (selectedYear === 'ALL' || !selectedYear) {
    return kondisi === 'BUKA';
  }

  const yNum = typeof selectedYear === 'number' ? selectedYear : parseInt(String(selectedYear), 10);
  if (isNaN(yNum)) return kondisi === 'BUKA';

  // If SEMUA BULAN in a specific year
  if (selectedMonth === 'ALL' || !selectedMonth) {
    if (!hasPeriod) {
      return kondisi === 'BUKA';
    }
    const locYear = loc.kondisiTahun!;
    const locMonth = loc.kondisiBulan!;

    if (kondisi === 'TUTUP') {
      if (locYear > yNum) return true; // Closes in future year, open all year here
      if (locYear < yNum) return false; // Closed in past year
      return locMonth > 1; // Was open for part of the year
    } else {
      // kondisi === 'BUKA'
      return locYear <= yNum;
    }
  }

  const mNum = typeof selectedMonth === 'number' ? selectedMonth : parseInt(String(selectedMonth), 10);
  if (isNaN(mNum)) return kondisi === 'BUKA';

  // Specific Year and Specific Month: format YYYYMM
  const targetPeriod = yNum * 100 + mNum;

  if (!hasPeriod) {
    return kondisi === 'BUKA';
  }

  const locPeriod = loc.kondisiTahun! * 100 + loc.kondisiBulan!;

  if (kondisi === 'TUTUP') {
    // Starting from locPeriod onwards, the location is closed -> false.
    // Before locPeriod, the location was still open -> true!
    return targetPeriod < locPeriod;
  } else {
    // kondisi === 'BUKA'
    // Starting from locPeriod onwards, the location is open -> true.
    // Before locPeriod, the location was not yet open -> false!
    return targetPeriod >= locPeriod;
  }
}

