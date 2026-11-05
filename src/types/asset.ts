export type AssetCategory = 'MESIN' | 'INVENTARIS' | "JOY'N FUN";

export interface UserLokasiAkses {
  id: string;
  userId: string;
  kodeLokasi: string;
}

export interface UserAccount {
  fid: string;
  namaUser: string;
  password: string;
  akses: 'ADMIN' | 'ADMINISTRATOR' | 'REGIONAL MANAGER' | 'SUPERVISOR' | 'STAFF' | 'CUSTOMER SERVICE' | 'USER';
  isSuperAdmin?: boolean;
  aksesAllLokasi?: boolean;
  menuAkses: string[];
  tombolAkses: string[];
  kolomAkses?: string[]; // array id kolom akses
  kategoriAkses?: string[]; // array kategori aset akses (e.g. ['MESIN', 'INVENTARIS', "JOY'N FUN"])
  lokasiAkses: string[]; // array kode_lokasi
  createdAt: string;
}

export const MASTER_CATEGORIES: AssetCategory[] = ['MESIN', 'INVENTARIS', "JOY'N FUN"];

export const KOLOM_ITEMS = [
  { id: 'col-nilai-pasti-1', label: 'NILAI PEROLEHAN PASTI (menu 1)' },
  { id: 'col-nilai-excel-1', label: 'NILAI PEROLEHAN EXCEL (menu 1)' },
  { id: 'col-supplier-1', label: 'SUPPLIER (menu 1)' },
  { id: 'col-tanggal-beli-1', label: 'TANGGAL BELI (menu 1)' },
  { id: 'col-aksi-2', label: 'AKSI (menu 2)' },
  { id: 'col-reader-3', label: 'READER (menu 3)' },
  { id: 'col-mesin-3', label: 'MESIN (menu 3)' },
  { id: 'col-joynfun-3', label: "JOY'N FUN (menu 3)" },
  { id: 'col-inventaris-3', label: 'INVENTARIS (menu 3)' },
  { id: 'col-nilai-pasti-mesin-jf-3', label: "TOTAL NILAI PEROLEHAN PASTI (MESIN + JOY'N FUN) (menu 3)" },
  { id: 'col-nilai-excel-mesin-jf-3', label: "TOTAL NILAI PEROLEHAN EXCEL (MESIN + JOY'N FUN) (menu 3)" },
  { id: 'col-nilai-pasti-inv-3', label: 'TOTAL NILAI PEROLEHAN PASTI (INVENTARIS) (menu 3)' },
  { id: 'col-nilai-excel-inv-3', label: 'TOTAL NILAI PEROLEHAN EXCEL (INVENTARIS) (menu 3)' },
  { id: 'col-pendapatan-mesin-3', label: 'TOTAL PENDAPATAN MESIN (menu 3)' },
  { id: 'col-aksi-6.1', label: 'AKSI (menu 6.1)' },
  { id: 'col-aksi-6.2', label: 'AKSI (menu 6.2)' },
  { id: 'col-nilai-pasti-4.2', label: 'NILAI PEROLEHAN PASTI (menu 4.2)' },
  { id: 'col-nilai-excel-4.2', label: 'NILAI PEROLEHAN EXCEL (menu 4.2)' },
  { id: 'col-supplier-4.2', label: 'SUPPLIER (menu 4.2)' },
  { id: 'col-aksi-4.5', label: 'AKSI (menu 4.5)' },
];

export interface LocationItem {
  id: string;
  code: string;
  name: string;
  operationalName?: string;
  tags?: ('QR' | 'GUDANG')[];
  kondisi?: 'BUKA' | 'TUTUP'; // 'BUKA' = sedang operasional (tampil di menu 3), 'TUTUP' = tutup operasional (tidak tampil di menu 3)
  kondisiBulan?: number; // 1-12
  kondisiTahun?: number; // e.g. 2026
  tanggalBuka?: string; // Teks biasa, opsional (legacy)
  tanggalTutup?: string; // Teks biasa, opsional (legacy)
  notes?: string;
}

export interface AssetTypeItem {
  code: string;
  name: string;
  category: AssetCategory;
  count?: number;
}

export interface Asset {
  id: string;
  locationCode: string;
  no: number;
  name: string;
  photoUrl?: string;
  typeCode: string; // e.g. 'SM', 'IK', 'JF', 'KR'
  category: AssetCategory;
  code: string; // e.g. 'BECOSM001', 'CADBAA0183'
  costActual?: number; // Nilai Perolehan Pasti
  costExcel?: number; // Nilai Perolehan Excel
  supplier?: string;
  buyDate?: string; // YYYY-MM-DD
  readerTap?: string;
  readerSwipe?: string;
  playPrice?: number;
  entryDate: string; // Tanggal Masuk (YYYY-MM-DD)
  notes?: string;
  status: 'ACTIVE' | 'DELETED';
  deleteDate?: string;
}

export type RotationStatus = 'MENUNGGU' | 'DITERIMA' | 'DITOLAK';

export interface RotationRecord {
  id: string;
  assetId: string;
  assetCode: string;
  assetName: string;
  assetType: string;
  exitDate: string; // Tanggal Keluar (YYYY-MM-DD)
  fromLocationCode: string;
  toLocationCode: string;
  status: RotationStatus;
  confirmDate?: string;
  entryDate?: string;
  notes?: string;
  type: 'BARU' | 'ROTASI KELUAR' | 'ROTASI MASUK' | 'HAPUS' | 'EDIT';
  readerTap?: string;
  readerSwipe?: string;
  previousState?: Partial<Asset>;
}

export interface PeriodLock {
  id: string;
  locationCode: string;
  locationName?: string;
  month: number | 'ALL';
  year: number | 'ALL';
  status: 'TUTUP' | 'BUKA';
  closedAt?: string;
}

export interface MachineRevenue {
  id: string;
  assetCode: string;
  assetName: string;
  locationCode: string;
  month: number;
  year: number;
  grossRevenue: number;
  tapCount: number;
  swipeCount: number;
  coinCount: number;
  payout: number;
  netRevenue: number;
  updatedAt: string;
}

export interface DatabaseBackupSnapshot {
  version: string;
  timestamp: string;
  isoDate: string;
  summary: {
    totalAssets: number;
    totalRotations: number;
    totalLocations: number;
    totalAssetTypes: number;
    totalPeriodLocks: number;
    totalRevenues: number;
    totalAccounts: number;
  };
  data: {
    locations: LocationItem[];
    assetTypes: AssetTypeItem[];
    assets: Asset[];
    rotations: RotationRecord[];
    periodLocks: PeriodLock[];
    revenues: MachineRevenue[];
    users?: UserAccount[];
    revenueSheets?: Record<string, any>;
    gridLines?: boolean;
    tableDimensions?: Record<string, any>;
  };
}

