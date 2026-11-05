/**
 * Centralized Indonesian Date Formatter for AssetFlow
 * Formats dates to standard uppercase DD-MMM-YY:
 * e.g., 15-OKT-26, 01-JAN-26, 30-SEP-26
 */

export const INDO_MONTH_ABBR = [
  'JAN', 'FEB', 'MAR', 'APR', 'MEI', 'JUN',
  'JUL', 'AGT', 'SEP', 'OKT', 'NOV', 'DES'
];

export const formatDdMmmYy = (raw?: string | Date | null): string => {
  if (!raw) return '-';

  // If already in DD-MMM-YY format
  if (typeof raw === 'string') {
    const trimmed = raw.trim();
    if (/^\d{2}-[A-Z]{3}-\d{2}$/.test(trimmed)) {
      return trimmed;
    }
    // If e.g. 15-Okt-26 or 15-okt-2026
    const customMatch = trimmed.match(/^(\d{1,2})[\s\-/.']*\b([a-zA-Z]{3,})\b[\s\-/.']*'?(\d{2,4})$/);
    if (customMatch) {
      const d = String(parseInt(customMatch[1], 10)).padStart(2, '0');
      const mStr = customMatch[2].toLowerCase();
      const mMap: Record<string, string> = {
        jan: 'JAN', januari: 'JAN', january: 'JAN',
        feb: 'FEB', februari: 'FEB', february: 'FEB',
        mar: 'MAR', maret: 'MAR', march: 'MAR',
        apr: 'APR', april: 'APR',
        mei: 'MEI', may: 'MEI',
        jun: 'JUN', juni: 'JUN', june: 'JUN',
        jul: 'JUL', juli: 'JUL', july: 'JUL',
        agu: 'AGT', agt: 'AGT', aug: 'AGT', agustus: 'AGT', august: 'AGT',
        sep: 'SEP', september: 'SEP',
        okt: 'OKT', oct: 'OKT', oktober: 'OKT', october: 'OKT',
        nov: 'NOV', nop: 'NOV', november: 'NOV',
        des: 'DES', dec: 'DES', desember: 'DES', december: 'DES',
      };
      const foundM = mMap[mStr];
      if (foundM) {
        let y = parseInt(customMatch[3], 10);
        if (y > 2000) y -= 2000;
        else if (y > 1900 && y < 2000) y -= 1900;
        return `${d}-${foundM}-${String(y).padStart(2, '0')}`;
      }
    }
  }

  const d = typeof raw === 'string' ? new Date(raw) : raw;
  if (isNaN(d.getTime())) {
    return typeof raw === 'string' ? raw : '-';
  }

  const day = String(d.getDate()).padStart(2, '0');
  const month = INDO_MONTH_ABBR[d.getMonth()] || 'OKT';
  const yy = String(d.getFullYear()).slice(-2);
  return `${day}-${month}-${yy}`;
};

/**
 * Currency and decimal number formatters with strictly 2 decimal places (Indonesian locale)
 * e.g., 15.000.000,00 and Rp 15.000.000,00
 */
export const formatCurrencyDecimal2 = (val?: number | string | null): string => {
  if (val === null || val === undefined || val === '') return '0,00';
  const num = typeof val === 'number' ? val : parseFloat(String(val).replace(/\./g, '').replace(/,/g, '.').replace(/[^0-9.-]/g, ''));
  if (isNaN(num)) return '0,00';
  return num.toLocaleString('id-ID', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};

export const formatRupiahDecimal2 = (val?: number | string | null): string => {
  if (val === null || val === undefined || val === '') return 'Rp 0,00';
  return `Rp ${formatCurrencyDecimal2(val)}`;
};
