import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import {
  LocationItem,
  AssetTypeItem,
  Asset,
  RotationRecord,
  PeriodLock,
  MachineRevenue,
  UserAccount,
  DatabaseBackupSnapshot,
  KOLOM_ITEMS,
  MASTER_CATEGORIES,
} from '../types/asset';
import {
  INITIAL_LOCATIONS,
  INITIAL_ASSET_TYPES,
  INITIAL_ASSETS,
  INITIAL_ROTATIONS,
  INITIAL_PERIOD_LOCKS,
  INITIAL_REVENUES
} from '../data/initialData';
import { AccessDeniedInfo } from '../components/AccessDeniedModal';

export interface ToastItem {
  id: string;
  message: string;
  type: 'success' | 'info' | 'warning' | 'error';
}

/**
 * Global Helper: getLokasiAksesUser
 * Returns array of allowed location codes, or null if superadmin (access to all locations)
 */
export const getLokasiAksesUser = (user: UserAccount | null, allLocationsCount?: number): string[] | null => {
  if (!user) return null;
  // If isSuperAdmin or aksesAllLokasi is true, return null (meaning no filter, all locations accessible)
  if (user.isSuperAdmin || user.aksesAllLokasi) return null;
  // If default 'admin' account and no restricted locations specified, superadmin
  if (user.namaUser.toLowerCase() === 'admin' && (!user.lokasiAkses || user.lokasiAkses.length === 0)) {
    return null;
  }
  if (allLocationsCount && user.lokasiAkses && user.lokasiAkses.length >= allLocationsCount) {
    return null;
  }
  // If user has specific location access (e.g. ['KPST'])
  if (user.lokasiAkses && user.lokasiAkses.length > 0) {
    return user.lokasiAkses;
  }
  return null;
};

interface AssetContextType {
  locations: LocationItem[];
  allowedLocations: LocationItem[];
  assetTypes: AssetTypeItem[];
  assets: Asset[];
  allAssets: Asset[];
  rotations: RotationRecord[];
  allRotations: RotationRecord[];
  periodLocks: PeriodLock[];
  revenues: MachineRevenue[];
  gridLines: boolean;
  toasts: ToastItem[];
  currentUser: UserAccount | null;
  isSuperAdmin: boolean;
  accessDeniedInfo: AccessDeniedInfo | null;
  setAccessDeniedInfo: (info: AccessDeniedInfo | null) => void;
  validateAssetAccess: (assetCode: string) => { allowed: boolean; asset?: Asset; actualLocation?: string; error?: string };
  logIllegalAccess: (assetCode: string, actualLocation: string) => void;
  setCurrentUser: (user: UserAccount | null) => void;
  hasMenuAccess: (menuId: string) => boolean;
  hasButtonAccess: (buttonId: string) => boolean;
  hasColumnAccess: (columnId: string) => boolean;
  hasCategoryAccess: (category: string) => boolean;
  isLocationAllowed: (locationCode: string) => boolean;
  toggleGridLines: () => void;
  addToast: (message: string, type?: 'success' | 'info' | 'warning' | 'error') => void;
  removeToast: (id: string) => void;
  // Asset operations
  addAssets: (newAssets: Omit<Asset, 'id' | 'no' | 'status'>[], overwrite?: boolean) => { added: number; updated: number };
  updateAsset: (code: string, updatedFields: Partial<Asset>) => boolean;
  deleteAsset: (code: string, deleteDate: string, notes?: string) => boolean;
  // Rotation operations
  createRotationOut: (assetCode: string, toLocationCode: string, exitDate: string, notes?: string, readerTap?: string, readerSwipe?: string) => boolean;
  confirmRotationIn: (rotationId: string, accept: boolean) => void;
  deleteRotationHistory: (filterStatus: 'DITERIMA' | 'DITOLAK') => void;
  // Period Lock operations
  setPeriodLock: (locationCode: string, month: number | 'ALL', year: number | 'ALL', status: 'TUTUP' | 'BUKA') => void;
  isPeriodLocked: (locationCode: string, month: number | 'ALL', year: number | 'ALL') => boolean;
  cancelActivity: (rotationId: string) => boolean;
  // Accounts operations
  accounts: UserAccount[];
  saveAccounts: (newAccounts: UserAccount[]) => void;
  // Revenue operations
  revenueRevision: number;
  saveRevenueSheet: (locationCode: string, month: number, year: number, data: any) => void;
  saveRevenue: (rev: Omit<MachineRevenue, 'id' | 'updatedAt'>) => void;
  // Master operations
  addLocation: (item: LocationItem) => boolean;
  updateLocation: (code: string, item: Partial<LocationItem>) => boolean;
  deleteLocation: (code: string) => { success: boolean; error?: string };
  addAssetType: (item: AssetTypeItem) => boolean;
  updateAssetType: (code: string, item: Partial<AssetTypeItem>) => boolean;
  deleteAssetType: (code: string) => { success: boolean; error?: string };
  clearDatabase: () => void;
  resetToInitialData: () => void;
  backupDatabase: (downloadFile?: boolean) => DatabaseBackupSnapshot;
  restoreDatabase: (snapshot?: DatabaseBackupSnapshot) => { success: boolean; error?: string };
  getLastBackupInfo: () => DatabaseBackupSnapshot | null;
}

const AssetContext = createContext<AssetContextType | undefined>(undefined);

// Purge any old v1 demo caches and permanently remove user_kpst
try {
  [
    'gm_assetflow_locations_v1',
    'gm_assetflow_types_v1',
    'gm_assetflow_assets_v1',
    'gm_assetflow_rotations_v1',
    'gm_assetflow_period_locks_v1',
    'gm_assetflow_revenues_v1'
  ].forEach((k) => localStorage.removeItem(k));

  // Purge any legacy active session from localStorage so fresh visit requires login
  localStorage.removeItem('gm_active_session_user');

  // Purge user_kpst from accounts list and migrate admin to ADMIN / @set825
  const usersRaw = localStorage.getItem('gm_users_account');
  if (usersRaw) {
    const parsedUsers = JSON.parse(usersRaw);
    if (Array.isArray(parsedUsers)) {
      const cleanedUsers = parsedUsers
        .filter((u: any) => u.namaUser && u.namaUser.toLowerCase() !== 'user_kpst')
        .map((u: any) => {
          if (u.namaUser?.toLowerCase() === 'admin' || u.fid === 'usr_admin_default_01') {
            return {
              ...u,
              namaUser: 'ADMIN',
              password: '@set825',
              isSuperAdmin: true,
              aksesAllLokasi: true,
            };
          }
          return u;
        });
      localStorage.setItem('gm_users_account', JSON.stringify(cleanedUsers));
    }
  }
} catch {
  // ignore
}

const STORAGE_KEYS = {
  LOCATIONS: 'gm_assetflow_locations_v2',
  ASSET_TYPES: 'gm_assetflow_types_v2',
  ASSETS: 'gm_assetflow_assets_v2',
  ROTATIONS: 'gm_assetflow_rotations_v2',
  PERIOD_LOCKS: 'gm_assetflow_period_locks_v2',
  REVENUES: 'gm_assetflow_revenues_v2',
  GRID: 'gm_assetflow_grid_v2'
};

export const AssetProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [locations, setLocations] = useState<LocationItem[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.LOCATIONS);
      const list: LocationItem[] = saved ? JSON.parse(saved) : INITIAL_LOCATIONS;
      return [...list].sort((a, b) => a.code.localeCompare(b.code, 'id', { numeric: true, sensitivity: 'base' }));
    } catch {
      return [...INITIAL_LOCATIONS].sort((a, b) => a.code.localeCompare(b.code, 'id', { numeric: true, sensitivity: 'base' }));
    }
  });

  const [assetTypes, setAssetTypes] = useState<AssetTypeItem[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.ASSET_TYPES);
      const list: AssetTypeItem[] = saved ? JSON.parse(saved) : INITIAL_ASSET_TYPES;
      return [...list].sort((a, b) => a.name.localeCompare(b.name, 'id', { numeric: true, sensitivity: 'base' }));
    } catch {
      return [...INITIAL_ASSET_TYPES].sort((a, b) => a.name.localeCompare(b.name, 'id', { numeric: true, sensitivity: 'base' }));
    }
  });

  const [rawAssets, setRawAssets] = useState<Asset[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.ASSETS);
      return saved ? JSON.parse(saved) : INITIAL_ASSETS;
    } catch {
      return INITIAL_ASSETS;
    }
  });

  const [rawRotations, setRawRotations] = useState<RotationRecord[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.ROTATIONS);
      return saved ? JSON.parse(saved) : INITIAL_ROTATIONS;
    } catch {
      return INITIAL_ROTATIONS;
    }
  });

  const [periodLocks, setPeriodLocks] = useState<PeriodLock[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.PERIOD_LOCKS);
      return saved ? JSON.parse(saved) : INITIAL_PERIOD_LOCKS;
    } catch {
      return INITIAL_PERIOD_LOCKS;
    }
  });

  const [rawRevenues, setRawRevenues] = useState<MachineRevenue[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.REVENUES);
      return saved ? JSON.parse(saved) : INITIAL_REVENUES;
    } catch {
      return INITIAL_REVENUES;
    }
  });

  const [gridLines, setGridLines] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.GRID);
      return saved !== null ? JSON.parse(saved) : true;
    } catch {
      return true;
    }
  });

  const [revenueRevision, setRevenueRevision] = useState<number>(0);

  const saveRevenueSheet = (locationCode: string, month: number, year: number, data: any) => {
    const key = `gm_rev_data_${locationCode}_${month}_${year}`;
    const payload = {
      ...data,
      locationCode,
      month,
      year,
      savedAt: new Date().toISOString(),
    };
    try {
      localStorage.setItem(key, JSON.stringify(payload));
    } catch (e) {
      console.warn('Failed to save revenue sheet to localStorage', e);
    }
    setRevenueRevision((prev) => prev + 1);
  };

  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const [accounts, setAccounts] = useState<UserAccount[]>(() => {
    try {
      const saved = localStorage.getItem('gm_users_account');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const cleaned = parsed
            .filter((u: any) => u.namaUser && u.namaUser.toLowerCase() !== 'user_kpst')
            .map((u: any) => {
              if (u.namaUser?.toLowerCase() === 'admin' || u.fid === 'usr_admin_default_01') {
                return {
                  ...u,
                  namaUser: 'ADMIN',
                  password: '@set825',
                  isSuperAdmin: true,
                  aksesAllLokasi: true,
                };
              }
              return u;
            });
          if (cleaned.length > 0) {
            localStorage.setItem('gm_users_account', JSON.stringify(cleaned));
            return cleaned;
          }
        }
      }
    } catch {}

    const defaultAdmin: UserAccount = {
      fid: 'usr_admin_default_01',
      namaUser: 'ADMIN',
      password: '@set825',
      akses: 'ADMINISTRATOR',
      isSuperAdmin: true,
      aksesAllLokasi: true,
      menuAkses: [
        'menu-1', 'menu-2', 'menu-3', 'menu-4', 'menu-4.1', 'menu-4.2', 'menu-4.3',
        'menu-4.4', 'menu-4.5', 'menu-5', 'menu-6', 'menu-6.1', 'menu-6.2', 'menu-7',
        'menu-7.1', 'menu-7.2', 'menu-8', 'menu-8.1', 'menu-8.2', 'menu-8.3'
      ],
      tombolAkses: [
        'btn-export-excel-1', 'btn-histori-lokasi-1', 'btn-export-excel-2', 'btn-export-excel-3', 'btn-export-excel-5',
        'btn-export-excel-7.2', 'btn-edit-aset-1', 'btn-rotasi-aset-1', 'btn-batal-rotasi-2',
        'btn-riwayat-2', 'btn-simpan-aset-4.1', 'btn-simpan-edit-4.2', 'btn-hapus-aset-4.3',
        'btn-eksekusi-rotasi-4.4', 'btn-tutup-periode-4.5', 'btn-buka-periode-4.5',
        'btn-buka-aksi-4.5', 'btn-tambah-lokasi-6.1', 'btn-simpan-lokasi-6.1',
        'btn-aksi-lokasi-6.1', 'btn-tambah-kategori-6.2', 'btn-simpan-kategori-6.2',
        'btn-aksi-kategori-6.2', 'btn-simpan-pendapatan-7.1', 'btn-tambah-tanggal-7.1',
        'btn-tambah-mesin-manual-7.1', 'btn-simpan-akun-8.1',
        'btn-backup-db', 'btn-pulihkan-db', 'btn-hapus-db'
      ],
      kolomAkses: KOLOM_ITEMS.map((k) => k.id),
      kategoriAkses: [...MASTER_CATEGORIES],
      lokasiAkses: [],
      createdAt: new Date().toLocaleDateString('id-ID'),
    };
    try {
      localStorage.setItem('gm_users_account', JSON.stringify([defaultAdmin]));
    } catch {}
    return [defaultAdmin];
  });

  const saveAccounts = (newAccounts: UserAccount[]) => {
    const cleaned = newAccounts.filter((a) => a.namaUser && a.namaUser.toLowerCase() !== 'user_kpst');
    setAccounts(cleaned);
    try {
      localStorage.setItem('gm_users_account', JSON.stringify(cleaned));

      const userLokasiAkses = cleaned.flatMap((acc) => {
        const locs = acc.aksesAllLokasi ? [] : (acc.lokasiAkses || []);
        return locs.map((loc) => ({
          id: `${acc.fid}_${loc}`,
          userId: acc.fid,
          kodeLokasi: loc,
        }));
      });
      localStorage.setItem('gm_user_lokasi_akses', JSON.stringify(userLokasiAkses));

      fetch('/api/users/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ users: cleaned, userLokasiAkses }),
      }).catch(() => {});
    } catch {}

    // Immediately update currentUser if its data or permissions changed
    if (currentUser) {
      const currentUpdated = cleaned.find(
        (a) => a.fid === currentUser.fid || a.namaUser.toLowerCase() === currentUser.namaUser.toLowerCase()
      );
      if (currentUpdated) {
        setCurrentUserState(currentUpdated);
        try {
          sessionStorage.setItem('gm_active_session_user', JSON.stringify(currentUpdated));
        } catch {}
      } else {
        setCurrentUserState(null);
        try {
          sessionStorage.removeItem('gm_active_session_user');
          localStorage.removeItem('gm_active_session_user');
        } catch {}
      }
    }
  };

  const [currentUser, setCurrentUserState] = useState<UserAccount | null>(() => {
    try {
      // Use sessionStorage so the initial display when opening the site/tab is always the login menu
      const saved = sessionStorage.getItem('gm_active_session_user');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && typeof parsed === 'object' && parsed.namaUser) {
          if (parsed.namaUser?.toLowerCase() === 'user_kpst') {
            sessionStorage.removeItem('gm_active_session_user');
            return null;
          }
          if (parsed.namaUser?.toLowerCase() === 'admin' || parsed.fid === 'usr_admin_default_01') {
            parsed.namaUser = 'ADMIN';
            parsed.password = '@set825';
            parsed.isSuperAdmin = true;
            parsed.aksesAllLokasi = true;
          }
          return parsed;
        }
      }
    } catch {
      // ignore
    }

    // Default to null so the initial display when opening the site/page is always the Login Menu
    return null;
  });

  const setCurrentUser = (user: UserAccount | null) => {
    setCurrentUserState(user);
    try {
      if (user) {
        sessionStorage.setItem('gm_active_session_user', JSON.stringify(user));
      } else {
        sessionStorage.removeItem('gm_active_session_user');
      }
      localStorage.removeItem('gm_active_session_user');
    } catch {
      // ignore
    }
  };

  const hasMenuAccess = (menuId: string): boolean => {
    if (!currentUser) return false;
    if (currentUser.akses === 'ADMIN' || currentUser.akses === 'ADMINISTRATOR') return true;
    if (!currentUser.menuAkses) return false;
    if (currentUser.menuAkses.includes(menuId)) return true;
    // Parent menus: if checking parent tab, return true if any child sub-menu is granted
    if (menuId === 'menu-4') {
      return currentUser.menuAkses.some((m) => m === 'menu-4' || m.startsWith('menu-4.'));
    }
    if (menuId === 'menu-6') {
      return currentUser.menuAkses.some((m) => m === 'menu-6' || m.startsWith('menu-6.'));
    }
    if (menuId === 'menu-7') {
      return currentUser.menuAkses.some((m) => m === 'menu-7' || m.startsWith('menu-7.'));
    }
    if (menuId === 'menu-8') {
      return currentUser.menuAkses.some((m) => m === 'menu-8' || m.startsWith('menu-8.'));
    }
    return false;
  };

  const hasButtonAccess = (buttonId: string): boolean => {
    if (!currentUser) return false;
    if (currentUser.akses === 'ADMIN' || currentUser.akses === 'ADMINISTRATOR') return true;
    // Daftar tombol yang aktif dikelola izin aksesnya di Menu 8.1
    const MANAGED_RESTRICTED_BUTTON_IDS = [
      'btn-histori-lokasi-1',
      'btn-import-excel-4.1',
      'btn-import-excel-4.3',
      'btn-import-excel-4.4.1',
      'btn-tutup-periode-4.5',
      'btn-buka-periode-4.5',
      'btn-tambah-lokasi-6.1',
      'btn-simpan-lokasi-6.1',
      'btn-tambah-kategori-6.2',
      'btn-simpan-kategori-6.2',
      'btn-edit-pendapatan-7.2',
      'btn-backup-db',
      'btn-pulihkan-db',
      'btn-hapus-db',
    ];
    // Jika tombol sudah tidak dikelola/dibatasi di Menu 8.1, otomatis diizinkan
    if (!MANAGED_RESTRICTED_BUTTON_IDS.includes(buttonId)) return true;
    if (!currentUser.tombolAkses) return false;
    return currentUser.tombolAkses.includes(buttonId);
  };

  const hasColumnAccess = (columnId: string): boolean => {
    if (!currentUser) return false;
    if (currentUser.akses === 'ADMIN' || currentUser.akses === 'ADMINISTRATOR') return true;
    if (!currentUser.kolomAkses) return true;
    return currentUser.kolomAkses.includes(columnId);
  };

  const hasCategoryAccess = (category: string): boolean => {
    if (!currentUser) return false;
    if (isSuperAdmin || currentUser.akses === 'ADMIN' || currentUser.akses === 'ADMINISTRATOR') return true;
    if (!currentUser.kategoriAkses || currentUser.kategoriAkses.length === 0) return true;
    return currentUser.kategoriAkses.includes(category);
  };

  const isLocationAllowed = (locationCode: string): boolean => {
    if (!currentUser) return false;
    const allowed = getLokasiAksesUser(currentUser, locations.length);
    if (allowed === null) return true; // Superadmin
    return allowed.includes(locationCode);
  };

  const allowedLocations = useMemo(() => {
    if (!currentUser) return locations;
    const allowed = getLokasiAksesUser(currentUser, locations.length);
    if (allowed === null) return locations;
    return locations.filter((loc) => allowed.includes(loc.code));
  }, [locations, currentUser]);

  const isSuperAdmin = useMemo(() => {
    if (!currentUser) return true;
    return getLokasiAksesUser(currentUser, locations.length) === null;
  }, [currentUser, locations.length]);

  // Global Scope Filter on Assets for Menu 1, 2, 3, 4, 6, 7
  const assets = useMemo(() => {
    const allowed = getLokasiAksesUser(currentUser, locations.length);
    if (allowed === null) return rawAssets;
    return rawAssets.filter((a) => allowed.includes(a.locationCode));
  }, [rawAssets, currentUser, locations.length]);

  // Global Scope Filter on Rotations
  const rotations = useMemo(() => {
    const allowed = getLokasiAksesUser(currentUser, locations.length);
    if (allowed === null) return rawRotations;
    return rawRotations.filter(
      (r) => allowed.includes(r.fromLocationCode) || allowed.includes(r.toLocationCode)
    );
  }, [rawRotations, currentUser, locations.length]);

  // Global Scope Filter on Revenues
  const revenues = useMemo(() => {
    const allowed = getLokasiAksesUser(currentUser, locations.length);
    if (allowed === null) return rawRevenues;
    return rawRevenues.filter((rev) => allowed.includes(rev.locationCode));
  }, [rawRevenues, currentUser, locations.length]);

  const [accessDeniedInfo, setAccessDeniedInfo] = useState<AccessDeniedInfo | null>(null);

  const logIllegalAccess = (assetCode: string, actualLocation: string) => {
    try {
      const userAllowed = getLokasiAksesUser(currentUser, locations.length) || [];
      const logEntry = {
        id: 'log_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6),
        timestamp: new Date().toISOString(),
        username: currentUser?.namaUser || 'anonymous',
        assetCode,
        actualLocation,
        allowedLocations: userAllowed,
        action: 'illegal_access_attempt',
      };
      const existing = JSON.parse(localStorage.getItem('gm_illegal_access_logs') || '[]');
      existing.unshift(logEntry);
      localStorage.setItem('gm_illegal_access_logs', JSON.stringify(existing.slice(0, 200)));

      // Post to backend asynchronously
      fetch('/api/audit/illegal-access', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(logEntry),
      }).catch(() => {});
    } catch {
      // ignore
    }
  };

  const validateAssetAccess = (assetCode: string) => {
    const clean = assetCode.trim().toUpperCase();
    if (!clean) return { allowed: true };

    const found = rawAssets.find((a) => a.code.toUpperCase() === clean);
    if (!found) {
      return { allowed: true, found: false };
    }

    const userLocs = getLokasiAksesUser(currentUser, locations.length);
    if (userLocs === null) {
      return { allowed: true, asset: found, actualLocation: found.locationCode };
    }

    if (!userLocs.includes(found.locationCode)) {
      const errorMsg = `Kode Aset ${found.code} adalah milik lokasi ${found.locationCode}. Akun Anda hanya memiliki akses untuk lokasi: ${userLocs.join(', ')}.`;

      // Cukup notif teks pemberitahuan di kanan bawah saja yang muncul (popup modal dinonaktifkan)
      addToast(`AKSES DITOLAK: ${errorMsg}`, 'error');
      logIllegalAccess(found.code, found.locationCode);

      return {
        allowed: false,
        asset: found,
        actualLocation: found.locationCode,
        error: errorMsg,
      };
    }

    return { allowed: true, asset: found, actualLocation: found.locationCode };
  };

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.LOCATIONS, JSON.stringify(locations));
  }, [locations]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.ASSET_TYPES, JSON.stringify(assetTypes));
  }, [assetTypes]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.ASSETS, JSON.stringify(rawAssets));
  }, [rawAssets]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.ROTATIONS, JSON.stringify(rawRotations));
  }, [rawRotations]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.PERIOD_LOCKS, JSON.stringify(periodLocks));
  }, [periodLocks]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.REVENUES, JSON.stringify(rawRevenues));
  }, [rawRevenues]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.GRID, JSON.stringify(gridLines));
  }, [gridLines]);

  const toggleGridLines = () => {
    setGridLines((prev) => !prev);
  };

  const addToast = (message: string, type: 'success' | 'info' | 'warning' | 'error' = 'success') => {
    const id = Date.now().toString() + Math.random().toString(36).slice(2, 6);
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      removeToast(id);
    }, 4000);
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  const isPeriodLocked = (locationCode: string, month: number | 'ALL', year: number | 'ALL'): boolean => {
    if (!locationCode) return false;
    return periodLocks.some((lock) => {
      if (lock.status !== 'TUTUP') return false;
      const matchLoc = lock.locationCode === 'ALL' || locationCode === 'ALL' || lock.locationCode === locationCode;
      const matchYear = lock.year === 'ALL' || year === 'ALL' || Number(lock.year) === Number(year);
      const matchMonth = lock.month === 'ALL' || month === 'ALL' || Number(lock.month) === Number(month);
      return matchLoc && matchYear && matchMonth;
    });
  };

  const cancelActivity = (rotationId: string): boolean => {
    const rot = rawRotations.find((r) => r.id === rotationId);
    if (!rot) {
      addToast('Data riwayat aktivitas tidak ditemukan', 'error');
      return false;
    }

    // Check if period is closed before cancellation
    const actDate = new Date(rot.exitDate || rot.confirmDate || rot.entryDate || new Date());
    const actMonth = actDate.getMonth() + 1;
    const actYear = actDate.getFullYear();
    const locToCheck = rot.fromLocationCode !== 'BARU' && rot.fromLocationCode !== 'DIHAPUS' ? rot.fromLocationCode : rot.toLocationCode;
    if (isPeriodLocked(locToCheck, actMonth, actYear)) {
      addToast(`Periode ${actMonth}/${actYear} di lokasi ${locToCheck} sedang DITUTUP. Tidak bisa membatalkan aktivitas! Silakan BUKA PERIODE di menu 4.5.`, 'error');
      return false;
    }

    if (rot.type === 'BARU') {
      // 1. INPUT ASET BARU:
      setRawAssets((prev) =>
        prev.filter((a) => a.id !== rot.assetId && a.code.toUpperCase() !== rot.assetCode.toUpperCase())
      );
      setRawRotations((prev) => prev.filter((r) => r.id !== rotationId));
      addToast(`Aktivitas Input Aset ${rot.assetCode} berhasil dibatalkan. Aset dihapus dari sistem.`, 'success');
      return true;
    }

    if (rot.type === 'HAPUS') {
      // 2. HAPUS ASET:
      setRawAssets((prev) =>
        prev.map((a) => {
          if (a.id === rot.assetId || a.code.toUpperCase() === rot.assetCode.toUpperCase()) {
            return {
              ...a,
              status: 'ACTIVE',
              deleteDate: undefined,
              locationCode: rot.fromLocationCode !== 'DIHAPUS' ? rot.fromLocationCode : a.locationCode,
            };
          }
          return a;
        })
      );
      setRawRotations((prev) => prev.filter((r) => r.id !== rotationId));
      addToast(`Aktivitas Hapus Aset ${rot.assetCode} berhasil dibatalkan. Aset aktif kembali di lokasi ${rot.fromLocationCode}.`, 'success');
      return true;
    }

    if (rot.type === 'EDIT') {
      // 3. EDIT ASET:
      if (rot.previousState) {
        setRawAssets((prev) =>
          prev.map((a) => {
            if (a.id === rot.assetId || a.code.toUpperCase() === rot.assetCode.toUpperCase()) {
              return {
                ...a,
                ...rot.previousState,
              };
            }
            return a;
          })
        );
      }
      setRawRotations((prev) => prev.filter((r) => r.id !== rotationId));
      addToast(`Aktivitas Edit Aset ${rot.assetCode} berhasil dibatalkan. Data aset dikembalikan ke nilai sebelumnya.`, 'success');
      return true;
    }

    if (rot.type === 'ROTASI KELUAR' || rot.type === 'ROTASI MASUK') {
      // 4. ROTASI KELUAR / MASUK:
      setRawAssets((prev) =>
        prev.map((a) => {
          if (a.id === rot.assetId || a.code.toUpperCase() === rot.assetCode.toUpperCase()) {
            return {
              ...a,
              locationCode: rot.fromLocationCode,
            };
          }
          return a;
        })
      );
      setRawRotations((prev) => prev.filter((r) => r.id !== rotationId));
      addToast(`Aktivitas ${rot.type} aset ${rot.assetCode} berhasil dibatalkan. Lokasi aset dikembalikan ke ${rot.fromLocationCode}.`, 'success');
      return true;
    }

    // Default fallback
    setRawRotations((prev) => prev.filter((r) => r.id !== rotationId));
    addToast(`Aktivitas untuk aset ${rot.assetCode} berhasil dibatalkan`, 'success');
    return true;
  };

  const addAssets = (newAssetItems: Omit<Asset, 'id' | 'no' | 'status'>[], overwrite = false) => {
    let added = 0;
    let updated = 0;

    const userLocs = getLokasiAksesUser(currentUser, locations.length);

    // Security check: Ensure user has access to each asset's location
    if (userLocs !== null) {
      for (const item of newAssetItems) {
        if (!userLocs.includes(item.locationCode)) {
          const err = `Lokasi aset ${item.locationCode} tidak diizinkan. Akun Anda hanya memiliki akses untuk lokasi: ${userLocs.join(', ')}.`;
          // Cukup notif teks pemberitahuan di kanan bawah
          addToast(err, 'error');
          logIllegalAccess(item.code, item.locationCode);
          return { added: 0, updated: 0 };
        }
      }
    }

    setRawAssets((prev) => {
      const next = [...prev];
      newAssetItems.forEach((item) => {
        if (!item.code || !item.name) return;
        const normalizedCode = item.code.trim().toUpperCase();
        const existingIdx = next.findIndex((a) => a.code.toUpperCase() === normalizedCode);

        // Check if period is closed
        const entryDate = new Date(item.entryDate || new Date());
        const itemMonth = entryDate.getMonth() + 1;
        const itemYear = entryDate.getFullYear();
        if (isPeriodLocked(item.locationCode, itemMonth, itemYear)) {
          addToast(`Periode ${itemMonth}/${itemYear} di lokasi ${item.locationCode} sedang ditutup!`, 'error');
          return;
        }

        if (existingIdx >= 0) {
          if (overwrite) {
            next[existingIdx] = {
              ...next[existingIdx],
              ...item,
              code: normalizedCode,
              status: 'ACTIVE',
            };
            updated++;
          }
        } else {
          const locAssets = next.filter((a) => a.locationCode === item.locationCode);
          const nextNo = locAssets.length + 1;
          const newAsset: Asset = {
            id: 'ast-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
            no: nextNo,
            status: 'ACTIVE',
            ...item,
            code: normalizedCode,
          };
          next.push(newAsset);
          added++;

          // Also record rotation as BARU
          setRawRotations((rPrev) => [
            {
              id: 'rot-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
              assetId: newAsset.id,
              assetCode: newAsset.code,
              assetName: newAsset.name,
              assetType: newAsset.typeCode,
              exitDate: newAsset.entryDate,
              fromLocationCode: 'BARU',
              toLocationCode: newAsset.locationCode,
              status: 'DITERIMA',
              confirmDate: newAsset.entryDate,
              entryDate: newAsset.entryDate,
              notes: 'Input Aset Baru ke ' + newAsset.locationCode,
              type: 'BARU',
            },
            ...rPrev,
          ]);
        }
      });
      return next;
    });

    addToast(`Berhasil menyimpan: ${added} aset baru, ${updated} diperbarui`, 'success');
    return { added, updated };
  };

  const updateAsset = (code: string, updatedFields: Partial<Asset>): boolean => {
    // Security check: Ensure user has permission for this asset
    const check = validateAssetAccess(code);
    if (!check.allowed) {
      return false;
    }

    const asset = rawAssets.find((a) => a.code.toUpperCase() === code.trim().toUpperCase());
    if (!asset) {
      addToast(`Aset dengan kode ${code} tidak ditemukan`, 'error');
      return false;
    }

    const entryDate = new Date(asset.entryDate);
    const itemMonth = entryDate.getMonth() + 1;
    const itemYear = entryDate.getFullYear();
    if (isPeriodLocked(asset.locationCode, itemMonth, itemYear)) {
      addToast(`Periode ${itemMonth}/${itemYear} di lokasi ${asset.locationCode} sedang ditutup. Tidak bisa diedit!`, 'error');
      return false;
    }

    const previousCopy = { ...asset };

    setRawAssets((prev) =>
      prev.map((a) => (a.code.toUpperCase() === code.trim().toUpperCase() ? { ...a, ...updatedFields } : a))
    );

    // Record activity in rotations as EDIT
    const today = new Date().toISOString().slice(0, 10);
    setRawRotations((prev) => [
      {
        id: 'rot-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
        assetId: asset.id,
        assetCode: asset.code,
        assetName: updatedFields.name || asset.name,
        assetType: updatedFields.typeCode || asset.typeCode,
        exitDate: today,
        fromLocationCode: asset.locationCode,
        toLocationCode: asset.locationCode,
        status: 'DITERIMA',
        confirmDate: today,
        entryDate: asset.entryDate,
        notes: `Edit data aset: ${Object.keys(updatedFields).filter((k) => updatedFields[k as keyof Asset] !== undefined).join(', ')}`,
        type: 'EDIT',
        previousState: previousCopy,
      },
      ...prev,
    ]);

    addToast(`Data aset ${code} berhasil diubah`, 'success');
    return true;
  };

  const deleteAsset = (code: string, deleteDate: string, notes?: string): boolean => {
    const check = validateAssetAccess(code);
    if (!check.allowed) {
      return false;
    }

    const asset = rawAssets.find((a) => a.code.toUpperCase() === code.trim().toUpperCase() && a.status === 'ACTIVE');
    if (!asset) {
      addToast(`Aset aktif dengan kode ${code} tidak ditemukan`, 'error');
      return false;
    }

    const delDateObj = new Date(deleteDate || new Date());
    const delMonth = delDateObj.getMonth() + 1;
    const delYear = delDateObj.getFullYear();
    if (isPeriodLocked(asset.locationCode, delMonth, delYear)) {
      addToast(`Periode ${delMonth}/${delYear} di lokasi ${asset.locationCode} sedang ditutup. Tidak bisa menghapus!`, 'error');
      return false;
    }

    setRawAssets((prev) =>
      prev.map((a) =>
        a.code.toUpperCase() === code.trim().toUpperCase()
          ? { ...a, status: 'DELETED', deleteDate: deleteDate || new Date().toISOString().slice(0, 10), notes: notes || a.notes }
          : a
      )
    );

    // Add record to rotation history as HAPUS
    setRawRotations((prev) => [
      {
        id: 'rot-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
        assetId: asset.id,
        assetCode: asset.code,
        assetName: asset.name,
        assetType: asset.typeCode,
        exitDate: deleteDate || new Date().toISOString().slice(0, 10),
        fromLocationCode: asset.locationCode,
        toLocationCode: 'DIHAPUS',
        status: 'DITERIMA',
        confirmDate: deleteDate || new Date().toISOString().slice(0, 10),
        notes: notes || 'Aset dihapus dari database',
        type: 'HAPUS',
      },
      ...prev,
    ]);

    addToast(`Aset ${code} berhasil dihapus dari database`, 'info');
    return true;
  };

  const createRotationOut = (
    assetCode: string,
    toLocationCode: string,
    exitDate: string,
    notes?: string,
    readerTap?: string,
    readerSwipe?: string
  ): boolean => {
    const check = validateAssetAccess(assetCode);
    if (!check.allowed) {
      return false;
    }

    const asset = rawAssets.find((a) => a.code.toUpperCase() === assetCode.trim().toUpperCase() && a.status === 'ACTIVE');
    if (!asset) {
      addToast(`Aset dengan kode ${assetCode} tidak ditemukan`, 'error');
      return false;
    }

    if (asset.locationCode === toLocationCode) {
      addToast(`Lokasi tujuan tidak boleh sama dengan lokasi asal (${asset.locationCode})`, 'warning');
      return false;
    }

    // CEK STATUS MENUNGGU: Aset tidak bisa melakukan rotasi keluar ke lokasi lain
    // sebelum lokasi penerima melakukan KONFIRMASI / DITOLAK
    const hasPending = rawRotations.some(
      (r) => r.assetCode.toUpperCase() === assetCode.trim().toUpperCase() && r.status === 'MENUNGGU'
    );
    if (hasPending) {
      addToast(
        `Aset ${asset.code} masih memiliki rotasi keluar yang MENUNGGU konfirmasi di lokasi tujuan. Selesaikan (konfirmasi / tolak) terlebih dahulu sebelum melakukan rotasi baru.`,
        'warning'
      );
      return false;
    }

    const finalTap = readerTap !== undefined ? readerTap : asset.readerTap;
    const finalSwipe = readerSwipe !== undefined ? readerSwipe : asset.readerSwipe;

    const finalDate = exitDate || new Date().toISOString().slice(0, 10);

    // CATATAN PENTING: Sebelum lokasi tujuan klik konfirmasi di menu 4.4.2,
    // data aset MASIH terdaftar di lokasi asal (asset.locationCode).
    // Lokasi master rawAssets TIDAK diubah di sini!

    const newRot: RotationRecord = {
      id: 'rot-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      assetId: asset.id,
      assetCode: asset.code,
      assetName: asset.name,
      assetType: asset.typeCode,
      exitDate: finalDate,
      fromLocationCode: asset.locationCode,
      toLocationCode,
      status: 'MENUNGGU',
      confirmDate: finalDate,
      entryDate: finalDate,
      notes: notes || `Rotasi keluar ke ${toLocationCode}`,
      type: 'ROTASI KELUAR',
      readerTap: finalTap,
      readerSwipe: finalSwipe,
    };

    setRawRotations((prev) => [newRot, ...prev]);
    addToast(`Rotasi keluar untuk aset ${asset.code} dari ${asset.locationCode} ke ${toLocationCode} berhasil disimpan. Aset tetap di ${asset.locationCode} menunggu konfirmasi masuk.`, 'success');
    return true;
  };

  const confirmRotationIn = (rotationId: string, accept: boolean) => {
    const today = new Date().toISOString().slice(0, 10);
    const rot = rawRotations.find((r) => r.id === rotationId);
    if (!rot) return;

    if (accept) {
      // Update rotation status to DITERIMA
      setRawRotations((prev) =>
        prev.map((r) =>
          r.id === rotationId
            ? { ...r, status: 'DITERIMA', confirmDate: today, entryDate: rot.entryDate || today, type: 'ROTASI MASUK' }
            : r
        )
      );

      // Sekarang dan baru pada saat inilah aset benar-benar pindah ke lokasi tujuan
      setRawAssets((prev) =>
        prev.map((a) =>
          a.code.toUpperCase() === rot.assetCode.toUpperCase()
            ? {
                ...a,
                locationCode: rot.toLocationCode,
                entryDate: a.entryDate || rot.entryDate || today,
                readerTap: rot.readerTap !== undefined ? rot.readerTap : a.readerTap,
                readerSwipe: rot.readerSwipe !== undefined ? rot.readerSwipe : a.readerSwipe,
              }
            : a
        )
      );
      addToast(`Aset ${rot.assetCode} telah DITERIMA di lokasi ${rot.toLocationCode}`, 'success');
    } else {
      // DITOLAK oleh lokasi penerima
      setRawRotations((prev) =>
        prev.map((r) =>
          r.id === rotationId
            ? { ...r, status: 'DITOLAK', confirmDate: today, notes: (r.notes ? r.notes + ' - ' : '') + 'Ditolak oleh penerima' }
            : r
        )
      );

      // Pastikan lokasi aset tetap di fromLocationCode (lokasi pengirim)
      setRawAssets((prev) =>
        prev.map((a) =>
          a.code.toUpperCase() === rot.assetCode.toUpperCase()
            ? {
                ...a,
                locationCode: rot.fromLocationCode,
              }
            : a
        )
      );
      addToast(`Rotasi aset ${rot.assetCode} telah DITOLAK. Lokasi aset tetap di ${rot.fromLocationCode}`, 'warning');
    }
  };

  const deleteRotationHistory = (filterStatus: 'DITERIMA' | 'DITOLAK') => {
    setRawRotations((prev) => prev.filter((r) => r.status !== filterStatus));
    addToast(`Semua riwayat rotasi berstatus ${filterStatus} berhasil dibersihkan`, 'info');
  };

  const setPeriodLock = (locationCode: string, month: number | 'ALL', year: number | 'ALL', status: 'TUTUP' | 'BUKA') => {
    const locItem = locations.find((l) => l.code === locationCode);
    const locName = locItem ? locItem.name : locationCode;

    setPeriodLocks((prev) => {
      const existingIdx = prev.findIndex(
        (p) => p.locationCode === locationCode && p.month === month && p.year === year
      );
      const nowStr = new Date().toLocaleString('id-ID');
      if (existingIdx >= 0) {
        const next = [...prev];
        next[existingIdx] = {
          ...next[existingIdx],
          status,
          closedAt: status === 'TUTUP' ? nowStr : undefined,
        };
        return next;
      } else {
        const newLock: PeriodLock = {
          id: 'lock-' + Date.now().toString(36),
          locationCode,
          locationName: locName,
          month,
          year,
          status,
          closedAt: status === 'TUTUP' ? nowStr : undefined,
        };
        return [newLock, ...prev];
      }
    });

    addToast(`Periode ${month}/${year} di ${locationCode} berhasil di-${status}`, status === 'TUTUP' ? 'warning' : 'success');
  };

  const saveRevenue = (rev: Omit<MachineRevenue, 'id' | 'updatedAt'>) => {
    const nowStr = new Date().toISOString().slice(0, 10);
    setRawRevenues((prev) => {
      const idx = prev.findIndex(
        (r) => r.assetCode.toUpperCase() === rev.assetCode.toUpperCase() && r.month === rev.month && r.year === rev.year
      );
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = {
          ...next[idx],
          ...rev,
          updatedAt: nowStr,
        };
        return next;
      } else {
        const newRev: MachineRevenue = {
          id: 'rev-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
          ...rev,
          updatedAt: nowStr,
        };
        return [newRev, ...prev];
      }
    });
    addToast(`Data pendapatan mesin ${rev.assetCode} periode ${rev.month}/${rev.year} tersimpan`, 'success');
  };

  const addLocation = (item: LocationItem): boolean => {
    const code = item.code.trim().toUpperCase();
    if (locations.some((l) => l.code === code)) {
      addToast(`Kode lokasi ${code} sudah ada!`, 'error');
      return false;
    }
    setLocations((prev) => {
      const next = [...prev, { ...item, code }];
      return next.sort((a, b) => a.code.localeCompare(b.code, 'id', { numeric: true, sensitivity: 'base' }));
    });
    addToast(`Lokasi ${code} - ${item.name} berhasil ditambahkan`, 'success');
    return true;
  };

  const updateLocation = (code: string, item: Partial<LocationItem>): boolean => {
    setLocations((prev) => {
      const next = prev.map((l) => (l.code === code ? { ...l, ...item, code: (item.code || l.code).trim().toUpperCase() } : l));
      return next.sort((a, b) => a.code.localeCompare(b.code, 'id', { numeric: true, sensitivity: 'base' }));
    });
    addToast(`Lokasi ${code} berhasil diperbarui`, 'success');
    return true;
  };

  const deleteLocation = (code: string): { success: boolean; error?: string } => {
    // Check if any assets belong to this location
    const count = assets.filter((a) => a.locationCode === code && a.status === 'ACTIVE').length;
    if (count > 0) {
      const msg = `Tidak bisa menghapus lokasi ${code} karena masih memiliki ${count} aset aktif!`;
      addToast(msg, 'error');
      return { success: false, error: msg };
    }

    setLocations((prev) => prev.filter((l) => l.code !== code));
    addToast(`Lokasi ${code} berhasil dihapus`, 'info');
    return { success: true };
  };

  const addAssetType = (item: AssetTypeItem): boolean => {
    const code = item.code.trim().toUpperCase();
    if (assetTypes.some((t) => t.code === code)) {
      addToast(`Singkatan jenis ${code} sudah ada!`, 'error');
      return false;
    }
    setAssetTypes((prev) => {
      const next = [...prev, { ...item, code }];
      return next.sort((a, b) => a.name.localeCompare(b.name, 'id', { numeric: true, sensitivity: 'base' }));
    });
    addToast(`Jenis aset ${code} - ${item.name} (${item.category}) berhasil ditambahkan`, 'success');
    return true;
  };

  const updateAssetType = (code: string, item: Partial<AssetTypeItem>): boolean => {
    const oldCode = code.trim().toUpperCase();
    const newCode = (item.code || oldCode).trim().toUpperCase();

    // If singkatan code is changed, ensure no collision with another existing type
    if (newCode !== oldCode && assetTypes.some((t) => t.code === newCode)) {
      addToast(`Singkatan jenis ${newCode} sudah ada!`, 'error');
      return false;
    }

    setAssetTypes((prev) => {
      const next = prev.map((t) => (t.code === oldCode ? { ...t, ...item, code: newCode } : t));
      return next.sort((a, b) => a.name.localeCompare(b.name, 'id', { numeric: true, sensitivity: 'base' }));
    });

    const codeMap = new Map<string, string>();

    setRawAssets((prev) =>
      prev.map((a) => {
        if (a.typeCode === oldCode) {
          let updatedAssetCode = a.code;
          if (newCode !== oldCode) {
            if (a.code.startsWith(a.locationCode + oldCode)) {
              updatedAssetCode = a.locationCode + newCode + a.code.slice((a.locationCode + oldCode).length);
            } else if (a.code.startsWith(oldCode)) {
              updatedAssetCode = newCode + a.code.slice(oldCode.length);
            }
            if (updatedAssetCode !== a.code) {
              codeMap.set(a.code, updatedAssetCode);
            }
          }
          return {
            ...a,
            code: updatedAssetCode,
            typeCode: newCode,
            category: item.category || a.category,
          };
        }
        return a;
      })
    );

    setRawRotations((prev) =>
      prev.map((r) => {
        const mappedCode = codeMap.get(r.assetCode) || r.assetCode;
        if (r.assetType === oldCode) {
          return {
            ...r,
            assetCode: mappedCode,
            assetType: newCode,
          };
        }
        if (mappedCode !== r.assetCode) {
          return { ...r, assetCode: mappedCode };
        }
        return r;
      })
    );

    if (codeMap.size > 0) {
      setRawRevenues((prev) =>
        prev.map((rev) => {
          const mappedCode = codeMap.get(rev.assetCode);
          return mappedCode ? { ...rev, assetCode: mappedCode } : rev;
        })
      );
    }

    if (newCode !== oldCode) {
      addToast(`Jenis aset ${oldCode} berhasil diubah menjadi ${newCode} (${item.name || ''}) beserta seluruh data aset terkait`, 'success');
    } else {
      addToast(`Jenis aset ${oldCode} berhasil diperbarui`, 'success');
    }
    return true;
  };

  const deleteAssetType = (code: string): { success: boolean; error?: string } => {
    const count = assets.filter((a) => a.typeCode === code && a.status === 'ACTIVE').length;
    if (count > 0) {
      const msg = `Singkatan ${code} masih dipakai oleh ${count} aset, tidak bisa dihapus!`;
      addToast(msg, 'error');
      return { success: false, error: msg };
    }
    setAssetTypes((prev) => prev.filter((t) => t.code !== code));
    addToast(`Jenis aset ${code} berhasil dihapus`, 'info');
    return { success: true };
  };

  const clearDatabase = () => {
    localStorage.removeItem(STORAGE_KEYS.ASSETS);
    localStorage.removeItem(STORAGE_KEYS.ROTATIONS);
    localStorage.removeItem(STORAGE_KEYS.PERIOD_LOCKS);
    localStorage.removeItem(STORAGE_KEYS.REVENUES);
    setRawAssets([]);
    setRawRotations([]);
    setPeriodLocks([]);
    setRawRevenues([]);
    addToast('Database aset, rotasi, dan pendapatan berhasil dikosongkan total.', 'info');
  };

  const resetToInitialData = () => {
    localStorage.removeItem(STORAGE_KEYS.LOCATIONS);
    localStorage.removeItem(STORAGE_KEYS.ASSET_TYPES);
    localStorage.removeItem(STORAGE_KEYS.ASSETS);
    localStorage.removeItem(STORAGE_KEYS.ROTATIONS);
    localStorage.removeItem(STORAGE_KEYS.PERIOD_LOCKS);
    localStorage.removeItem(STORAGE_KEYS.REVENUES);
    setLocations([...INITIAL_LOCATIONS].sort((a, b) => a.code.localeCompare(b.code, 'id', { numeric: true, sensitivity: 'base' })));
    setAssetTypes([...INITIAL_ASSET_TYPES].sort((a, b) => a.name.localeCompare(b.name, 'id', { numeric: true, sensitivity: 'base' })));
    setRawAssets(INITIAL_ASSETS);
    setRawRotations(INITIAL_ROTATIONS);
    setPeriodLocks(INITIAL_PERIOD_LOCKS);
    setRawRevenues(INITIAL_REVENUES);
    addToast('Data telah dikembalikan ke kondisi default awal (kosong)', 'info');
  };

  const BACKUP_STORAGE_KEY = 'gm_assetflow_latest_backup';

  const getLastBackupInfo = (): DatabaseBackupSnapshot | null => {
    try {
      const raw = localStorage.getItem(BACKUP_STORAGE_KEY);
      if (raw) {
        return JSON.parse(raw);
      }
    } catch (e) {
      console.error('Failed to parse last backup', e);
    }
    return null;
  };

  const backupDatabase = (downloadFile: boolean = false): DatabaseBackupSnapshot => {
    let savedUsers: UserAccount[] = [];
    try {
      const usersRaw = localStorage.getItem('gm_users_account');
      if (usersRaw) savedUsers = JSON.parse(usersRaw);
    } catch {}

    const revenueSheets: Record<string, any> = {};
    const tableDimensions: Record<string, any> = {};

    try {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (!key) continue;
        if (key.startsWith('gm_rev_data_')) {
          try {
            const val = localStorage.getItem(key);
            if (val) revenueSheets[key] = JSON.parse(val);
          } catch {
            revenueSheets[key] = localStorage.getItem(key);
          }
        } else if (key.startsWith('gm_col_width_') || key.startsWith('gm_row_height_')) {
          try {
            const val = localStorage.getItem(key);
            if (val) tableDimensions[key] = JSON.parse(val);
          } catch {}
        }
      }
    } catch {}

    const now = new Date();
    const dateStr = now.toLocaleDateString('id-ID', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
    const timeStr = now.toLocaleTimeString('id-ID', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
    const timestamp = `${dateStr} ${timeStr} WIB`;

    const snapshot: DatabaseBackupSnapshot = {
      version: '2.0',
      timestamp,
      isoDate: now.toISOString(),
      summary: {
        totalAssets: rawAssets.length,
        totalRotations: rawRotations.length,
        totalLocations: locations.length,
        totalAssetTypes: assetTypes.length,
        totalPeriodLocks: periodLocks.length,
        totalRevenues: rawRevenues.length,
        totalAccounts: savedUsers.length,
      },
      data: {
        locations,
        assetTypes,
        assets: rawAssets,
        rotations: rawRotations,
        periodLocks,
        revenues: rawRevenues,
        users: savedUsers,
        revenueSheets,
        gridLines,
        tableDimensions,
      },
    };

    try {
      localStorage.setItem(BACKUP_STORAGE_KEY, JSON.stringify(snapshot));
    } catch (err) {
      console.warn('Could not save snapshot to localStorage', err);
    }

    if (downloadFile) {
      try {
        const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(
          JSON.stringify(snapshot, null, 2)
        )}`;
        const downloadAnchor = document.createElement('a');
        downloadAnchor.setAttribute('href', jsonString);
        downloadAnchor.setAttribute(
          'download',
          `AssetFlow_Backup_Database_${now.toISOString().slice(0, 10)}.json`
        );
        document.body.appendChild(downloadAnchor);
        downloadAnchor.click();
        downloadAnchor.remove();
      } catch (e) {
        console.error('Download backup failed', e);
      }
    }

    addToast(
      `Database berhasil dibackup (${snapshot.summary.totalAssets} aset, ${snapshot.summary.totalRotations} rotasi, ${snapshot.summary.totalAccounts} akun)`,
      'success'
    );

    return snapshot;
  };

  const restoreDatabase = (
    snapshotInput?: DatabaseBackupSnapshot
  ): { success: boolean; error?: string } => {
    let targetSnapshot = snapshotInput;

    if (!targetSnapshot) {
      targetSnapshot = getLastBackupInfo() || undefined;
    }

    if (!targetSnapshot || !targetSnapshot.data) {
      const errorMsg = 'Tidak ditemukan data backup untuk dipulihkan.';
      addToast(errorMsg, 'error');
      return { success: false, error: errorMsg };
    }

    try {
      const { data, timestamp } = targetSnapshot;

      // 1. Locations
      if (Array.isArray(data.locations) && data.locations.length > 0) {
        const sortedLocs = [...data.locations].sort((a, b) => a.code.localeCompare(b.code, 'id', { numeric: true, sensitivity: 'base' }));
        setLocations(sortedLocs);
        localStorage.setItem(STORAGE_KEYS.LOCATIONS, JSON.stringify(sortedLocs));
      }

      // 2. Asset Types
      if (Array.isArray(data.assetTypes) && data.assetTypes.length > 0) {
        const sortedTypes = [...data.assetTypes].sort((a, b) => a.name.localeCompare(b.name, 'id', { numeric: true, sensitivity: 'base' }));
        setAssetTypes(sortedTypes);
        localStorage.setItem(STORAGE_KEYS.ASSET_TYPES, JSON.stringify(sortedTypes));
      }

      // 3. Assets
      if (Array.isArray(data.assets)) {
        setRawAssets(data.assets);
        localStorage.setItem(STORAGE_KEYS.ASSETS, JSON.stringify(data.assets));
      }

      // 4. Rotations
      if (Array.isArray(data.rotations)) {
        setRawRotations(data.rotations);
        localStorage.setItem(STORAGE_KEYS.ROTATIONS, JSON.stringify(data.rotations));
      }

      // 5. Period Locks
      if (Array.isArray(data.periodLocks)) {
        setPeriodLocks(data.periodLocks);
        localStorage.setItem(STORAGE_KEYS.PERIOD_LOCKS, JSON.stringify(data.periodLocks));
      }

      // 6. Revenues
      if (Array.isArray(data.revenues)) {
        setRawRevenues(data.revenues);
        localStorage.setItem(STORAGE_KEYS.REVENUES, JSON.stringify(data.revenues));
      }

      // 7. Grid
      if (typeof data.gridLines === 'boolean') {
        setGridLines(data.gridLines);
        localStorage.setItem(STORAGE_KEYS.GRID, JSON.stringify(data.gridLines));
      }

      // 8. Users
      if (Array.isArray(data.users) && data.users.length > 0) {
        const cleanedUsers = data.users.filter((u: any) => u.namaUser && u.namaUser.toLowerCase() !== 'user_kpst');
        saveAccounts(cleanedUsers);
      }

      // 9. Revenue Sheets
      if (data.revenueSheets) {
        Object.entries(data.revenueSheets).forEach(([key, value]) => {
          try {
            localStorage.setItem(
              key,
              typeof value === 'string' ? value : JSON.stringify(value)
            );
          } catch {}
        });
        setRevenueRevision((prev) => prev + 1);
      }

      // 10. Table Dimensions
      if (data.tableDimensions) {
        Object.entries(data.tableDimensions).forEach(([key, value]) => {
          try {
            localStorage.setItem(
              key,
              typeof value === 'string' ? value : JSON.stringify(value)
            );
          } catch {}
        });
      }

      addToast(
        `Database berhasil dipulihkan dari cadangan tanggal ${timestamp || 'terakhir'}!`,
        'success'
      );
      return { success: true };
    } catch (err: any) {
      const msg = `Gagal memulihkan database: ${err?.message || 'Format tidak valid'}`;
      addToast(msg, 'error');
      return { success: false, error: msg };
    }
  };

  return (
    <AssetContext.Provider
      value={{
        locations,
        allowedLocations,
        assetTypes,
        assets,
        rotations,
        allAssets: rawAssets,
        allRotations: rawRotations,
        isSuperAdmin,
        accessDeniedInfo,
        setAccessDeniedInfo,
        validateAssetAccess,
        logIllegalAccess,
        periodLocks,
        revenues,
        accounts,
        saveAccounts,
        revenueRevision,
        saveRevenueSheet,
        gridLines,
        toasts,
        currentUser,
        setCurrentUser,
        hasMenuAccess,
        hasButtonAccess,
        hasColumnAccess,
        hasCategoryAccess,
        isLocationAllowed,
        toggleGridLines,
        addToast,
        removeToast,
        addAssets,
        updateAsset,
        deleteAsset,
        createRotationOut,
        confirmRotationIn,
        deleteRotationHistory,
        setPeriodLock,
        isPeriodLocked,
        cancelActivity,
        saveRevenue,
        addLocation,
        updateLocation,
        deleteLocation,
        addAssetType,
        updateAssetType,
        deleteAssetType,
        clearDatabase,
        resetToInitialData,
        backupDatabase,
        restoreDatabase,
        getLastBackupInfo,
      }}
    >
      {children}
    </AssetContext.Provider>
  );
};

export const useAssets = () => {
  const context = useContext(AssetContext);
  if (!context) {
    throw new Error('useAssets must be used within an AssetProvider');
  }
  return context;
};
