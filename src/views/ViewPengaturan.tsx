import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useAssets } from '../context/AssetContext';
import {
  UserPlus,
  KeyRound,
  UserX,
  Shield,
  CheckSquare,
  Square,
  Search,
  Check,
  AlertTriangle,
  Lock,
  Unlock,
  Trash2,
  Edit2,
  Users,
  Eye,
  EyeOff,
} from 'lucide-react';

import type { UserAccount } from '../types/asset';
import { KOLOM_ITEMS, MASTER_CATEGORIES } from '../types/asset';
export type { UserAccount };
export { KOLOM_ITEMS };

const STORAGE_USERS_KEY = 'gm_users_account';

// Menu items definition
export const MENU_ITEMS = [
  { id: 'menu-1', label: '1. DATA RINCI ASET' },
  { id: 'menu-2', label: '2. LAPORAN ROTASI' },
  { id: 'menu-3', label: '3. REKAP JUMLAH ASET LOKASI' },
  { id: 'menu-4.1', label: '4.1 Input Aset Baru' },
  { id: 'menu-4.2', label: '4.2 Edit Data Aset' },
  { id: 'menu-4.3', label: '4.3 Hapus Aset' },
  { id: 'menu-4.4', label: '4.4 Rotasi Aset' },
  { id: 'menu-4.5', label: '4.5 Tutup Periode' },
  { id: 'menu-5', label: '5. INFO PERPINDAHAN ASET' },
  { id: 'menu-6.1', label: '6.1 Master Lokasi' },
  { id: 'menu-6.2', label: '6.2 Master Kategori Aset' },
  { id: 'menu-7.1', label: '7.1 Input Pendapatan' },
  { id: 'menu-7.2', label: '7.2 Laporan Pendapatan' },
  { id: 'menu-8.1', label: '8.1 Tambah Akun' },
  { id: 'menu-8.2', label: '8.2 Ganti Password' },
  { id: 'menu-8.3', label: '8.3 Hapus Akun' },
];

// Tombol dalam menu items definition
export const TOMBOL_ITEMS = [
  { id: 'btn-histori-lokasi-1', label: 'Akses Tombol Riwayat Lokasi' },
  { id: 'btn-import-excel-4.1', label: 'Tambah data dari Excel (Menu 4.1)' },
  { id: 'btn-import-excel-4.3', label: 'Isi tabel dari Excel (Menu 4.3)' },
  { id: 'btn-import-excel-4.4.1', label: 'Isi tabel dari Excel (Menu 4.4.1)' },
  { id: 'btn-tutup-periode-4.5', label: 'Tutup Periode (Menu 4.5)' },
  { id: 'btn-buka-periode-4.5', label: 'Buka Periode (Menu 4.5)' },
  { id: 'btn-tambah-lokasi-6.1', label: 'Tambah Lokasi (Menu 6.1)' },
  { id: 'btn-simpan-lokasi-6.1', label: 'Simpan Lokasi (Menu 6.1)' },
  { id: 'btn-tambah-kategori-6.2', label: 'Tambah Kategori (Menu 6.2)' },
  { id: 'btn-simpan-kategori-6.2', label: 'Simpan Kategori (Menu 6.2)' },
  { id: 'btn-edit-pendapatan-7.2', label: 'Edit Pendapatan (Menu 7.2)' },
  { id: 'btn-backup-db', label: 'Backup Database' },
  { id: 'btn-pulihkan-db', label: 'Pulihkan Database' },
  { id: 'btn-hapus-db', label: 'Hapus Database' },
];

// Fallback locations as specified
const FALLBACK_LOCATIONS = [
  { code: 'BHSC', name: 'GAME MASTER GANDAWIJAYA' },
  { code: 'FSCL', name: 'FESTIVAL CITY LINK' },
  { code: 'KPST', name: 'KANTOR PUSAT' },
  { code: 'YJPR', name: 'YOGYA JUNCTION PARAHYANGAN' },
  { code: 'PVJF', name: 'JOY N FUN PARIS VAN JAVA' },
  { code: 'KISC', name: 'KINGS SHOPPING CENTRE' },
  { code: 'BTJF', name: 'JOY N FUN BOGOR TRADE' },
  { code: 'BEC2', name: 'BEC JOY N FUN' },
  { code: 'BODA', name: 'BORMA DAGO' },
  { code: 'YMCR', name: 'YOMART CISURUPAN GARUT' },
  { code: 'PNMP', name: 'PANAMA PARK 825' },
];

export interface ViewPengaturanProps {
  currentUser?: UserAccount | null;
}

export const ViewPengaturan: React.FC<ViewPengaturanProps> = ({ currentUser: propUser }) => {
  const {
    locations,
    assetTypes,
    addToast,
    currentUser: contextUser,
    setCurrentUser,
    hasMenuAccess,
    hasButtonAccess,
    accounts,
    saveAccounts,
  } = useAssets();
  const currentUser = propUser || contextUser;

  const availableCategories = useMemo(() => {
    const fromTypes = assetTypes.map((t) => t.category).filter(Boolean);
    return Array.from(new Set([...MASTER_CATEGORIES, ...fromTypes]));
  }, [assetTypes]);

  const isAdmin = currentUser?.akses === 'ADMIN' || currentUser?.akses === 'ADMINISTRATOR';

  // Sub-tabs in Menu 8:
  // ADMINISTRATOR always has full access to 8.1, 8.2, and 8.3.
  // Non-admin (REGIONAL MANAGER / SUPERVISOR) strictly follows granted menu permissions.
  // Akun REGIONAL MANAGER & SUPERVISOR yang diberi akses menu 8 / 8.2 dapat membuka sub-tab 8.2.
  const can81 = isAdmin || hasMenuAccess('menu-8.1');
  const can83 = isAdmin || hasMenuAccess('menu-8.3');
  const can82 = isAdmin || hasMenuAccess('menu-8.2') || (hasMenuAccess('menu-8') && !can81 && !can83);

  // Active Sub-tab (8.1, 8.2, 8.3)
  const [activeSubTab, setActiveSubTab] = useState<'8.1' | '8.2' | '8.3'>(
    can81 ? '8.1' : can82 ? '8.2' : '8.3'
  );

  useEffect(() => {
    if (activeSubTab === '8.1' && !can81) {
      if (can82) setActiveSubTab('8.2');
      else if (can83) setActiveSubTab('8.3');
    } else if (activeSubTab === '8.3' && !can83) {
      if (can82) setActiveSubTab('8.2');
      else if (can81) setActiveSubTab('8.1');
    }
  }, [can81, can82, can83, activeSubTab]);

  // 8.1 Form State
  const [editingId, setEditingId] = useState<string | null>(null);
  const [namaUser, setNamaUser] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [confirmPassword, setConfirmPassword] = useState<string>('');
  const [akses, setAkses] = useState<
    'ADMIN' | 'ADMINISTRATOR' | 'REGIONAL MANAGER' | 'SUPERVISOR' | 'STAFF' | 'CUSTOMER SERVICE' | 'USER'
  >('ADMINISTRATOR');
  const [selectedMenus, setSelectedMenus] = useState<string[]>(MENU_ITEMS.map((m) => m.id));
  const [selectedTombol, setSelectedTombol] = useState<string[]>(TOMBOL_ITEMS.map((t) => t.id));
  const [selectedKolom, setSelectedKolom] = useState<string[]>(KOLOM_ITEMS.map((k) => k.id));
  const [selectedKategori, setSelectedKategori] = useState<string[]>([...MASTER_CATEGORIES]);
  const [selectedLocations, setSelectedLocations] = useState<string[]>([]);
  const [locationSearch, setLocationSearch] = useState<string>('');

  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [formError, setFormError] = useState<string>('');

  // 8.2 Ganti Password Form State - default ke nama user aktif
  const [gantiUser, setGantiUser] = useState<string>(currentUser?.namaUser || '');
  const [gantiPasswordLama, setGantiPasswordLama] = useState<string>('');
  const [gantiPassword, setGantiPassword] = useState<string>('');
  const [gantiConfirmPassword, setGantiConfirmPassword] = useState<string>('');
  const [gantiShowPassword, setGantiShowPassword] = useState<boolean>(false);

  useEffect(() => {
    if (currentUser?.namaUser && !gantiUser) {
      setGantiUser(currentUser.namaUser);
    }
  }, [currentUser]);

  // 8.3 Hapus Akun Form State
  const [hapusUser, setHapusUser] = useState<string>('');
  const [showDeleteConfirmModal, setShowDeleteConfirmModal] = useState<boolean>(false);

  // Combined locations list from context with fallback
  const combinedLocations = useMemo(() => {
    if (locations && locations.length > 0) return locations;
    return FALLBACK_LOCATIONS;
  }, [locations]);

  // Filtered locations based on search
  const filteredLocationList = useMemo(() => {
    if (!locationSearch.trim()) return combinedLocations;
    const q = locationSearch.toLowerCase().trim();
    return combinedLocations.filter(
      (l) => l.code.toLowerCase().includes(q) || l.name.toLowerCase().includes(q)
    );
  }, [combinedLocations, locationSearch]);

  // Save accounts to AssetContext (updates context state immediately and syncs persistence)
  const persistAccounts = (newAccounts: UserAccount[]) => {
    saveAccounts(newAccounts);
  };

  // Reset 8.1 Form
  const resetForm81 = () => {
    setEditingId(null);
    setNamaUser('');
    setPassword('');
    setConfirmPassword('');
    setAkses('ADMINISTRATOR');
    setSelectedMenus(MENU_ITEMS.map((m) => m.id));
    setSelectedTombol(TOMBOL_ITEMS.map((t) => t.id));
    setSelectedKolom(KOLOM_ITEMS.map((k) => k.id));
    setSelectedKategori([...availableCategories]);
    setSelectedLocations(combinedLocations.map((l) => l.code));
    setFormError('');
    setShowPassword(false);
  };

  // Set default selected locations only once on initial mount
  const hasInitializedLocsRef = useRef(false);
  useEffect(() => {
    if (!hasInitializedLocsRef.current && combinedLocations.length > 0) {
      setSelectedLocations(combinedLocations.map((l) => l.code));
      hasInitializedLocsRef.current = true;
    }
  }, [combinedLocations]);

  // ------------------------------------------------------------------
  // 8.1 SUBMIT / SIMPAN AKUN
  // ------------------------------------------------------------------
  const handleSaveAccount = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setFormError('');

    const cleanName = namaUser.trim();
    if (!cleanName) {
      const msg = 'NAMA USER wajib diisi!';
      setFormError(msg);
      addToast(msg, 'error');
      return;
    }

    if (!editingId && !password) {
      const msg = 'PASWORD wajib diisi!';
      setFormError(msg);
      addToast(msg, 'error');
      return;
    }

    if (!editingId && password !== confirmPassword) {
      const msg = 'KONFIRMASI PASWORD tidak sama dengan PASWORD!';
      setFormError(msg);
      addToast(msg, 'error');
      return;
    }

    if (editingId && password && password !== confirmPassword) {
      const msg = 'KONFIRMASI PASWORD tidak sama dengan PASWORD baru!';
      setFormError(msg);
      addToast(msg, 'error');
      return;
    }

    if (!akses) {
      const msg = 'AKSES wajib dipilih!';
      setFormError(msg);
      addToast(msg, 'error');
      return;
    }

    if (selectedMenus.length === 0) {
      const msg = 'Pilih minimal 1 MENU AKSES!';
      setFormError(msg);
      addToast(msg, 'error');
      return;
    }

    // Check duplicate username (case-insensitive)
    const duplicate = accounts.find(
      (a) => a.namaUser.toLowerCase() === cleanName.toLowerCase() && a.fid !== editingId
    );
    if (duplicate) {
      const msg = `Nama user "${cleanName}" sudah terdaftar! Gunakan nama lain.`;
      setFormError(msg);
      addToast(msg, 'error');
      return;
    }

    // Check superadmin and global location access
    const hasAllLocations = selectedLocations.length >= combinedLocations.length || (selectedLocations.length === 0 && (akses === 'ADMIN' || akses === 'ADMINISTRATOR'));
    const isSuper = (akses === 'ADMIN' || akses === 'ADMINISTRATOR') && hasAllLocations;
    const locationsToSave = selectedLocations.length > 0
      ? selectedLocations
      : hasAllLocations
      ? combinedLocations.map((l) => l.code)
      : [];

    if (editingId) {
      // Update existing account
      const updated = accounts.map((acc) => {
        if (acc.fid !== editingId) return acc;
        return {
          ...acc,
          namaUser: cleanName,
          password: password ? password : acc.password,
          akses,
          isSuperAdmin: isSuper,
          aksesAllLokasi: hasAllLocations,
          menuAkses: selectedMenus,
          tombolAkses: selectedTombol,
          kolomAkses: selectedKolom,
          kategoriAkses: selectedKategori,
          lokasiAkses: locationsToSave,
        };
      });
      persistAccounts(updated);

      // If updating currently logged in user, refresh context immediately
      if (currentUser && (currentUser.fid === editingId || currentUser.namaUser.toLowerCase() === cleanName.toLowerCase())) {
        const selfUpdated = updated.find((a) => a.fid === editingId);
        if (selfUpdated) setCurrentUser(selfUpdated);
      }

      addToast(`Akun "${cleanName}" berhasil diperbarui`, 'success');
      resetForm81();
    } else {
      // Create new account
      const newAccount: UserAccount = {
        fid: `${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        namaUser: cleanName,
        password,
        akses,
        isSuperAdmin: isSuper,
        aksesAllLokasi: hasAllLocations,
        menuAkses: selectedMenus,
        tombolAkses: selectedTombol,
        kolomAkses: selectedKolom,
        kategoriAkses: selectedKategori,
        lokasiAkses: locationsToSave,
        createdAt: new Date().toLocaleDateString('id-ID'),
      };
      persistAccounts([...accounts, newAccount]);
      addToast(`Akun "${cleanName}" berhasil ditambahkan!`, 'success');
      resetForm81();
    }
  };

  // Edit account button in table
  const handleEditClick = (acc: UserAccount) => {
    setActiveSubTab('8.1');
    setEditingId(acc.fid);
    setNamaUser(acc.namaUser);
    setPassword('');
    setConfirmPassword('');
    setAkses(acc.akses === 'ADMIN' ? 'ADMINISTRATOR' : acc.akses);
    setSelectedMenus(acc.menuAkses || []);
    setSelectedTombol(acc.tombolAkses || []);
    setSelectedKolom(acc.kolomAkses || KOLOM_ITEMS.map((k) => k.id));
    setSelectedKategori(acc.kategoriAkses || [...availableCategories]);

    // Restore selected locations exactly matching previous choice:
    // If the account has full location access (aksesAllLokasi: true) or empty array (default for admin),
    // or all locations, check all locations.
    // Otherwise restore the exact list of locations saved for this account.
    if (
      acc.aksesAllLokasi ||
      !acc.lokasiAkses ||
      acc.lokasiAkses.length === 0 ||
      acc.lokasiAkses.length >= combinedLocations.length
    ) {
      setSelectedLocations(combinedLocations.map((l) => l.code));
    } else {
      setSelectedLocations(acc.lokasiAkses);
    }

    setFormError('');
    window.scrollTo({ top: 0, behavior: 'smooth' });
    addToast(`Mengedit akun "${acc.namaUser}". Masukkan password baru hanya jika ingin mengubahnya.`, 'info');
  };

  // ------------------------------------------------------------------
  // 8.2 GANTI PASSWORD
  // ------------------------------------------------------------------
  const handleGantiPassword = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmedUser = gantiUser.trim();
    if (!trimmedUser) {
      addToast('Ketik NAMA USER terlebih dahulu!', 'error');
      return;
    }
    if (!gantiPasswordLama) {
      addToast('PASWORD LAMA wajib diisi!', 'error');
      return;
    }
    if (!gantiPassword) {
      addToast('PASWORD BARU wajib diisi!', 'error');
      return;
    }
    if (gantiPassword.length < 4) {
      addToast('Password minimal 4 karakter!', 'error');
      return;
    }
    if (gantiPassword !== gantiConfirmPassword) {
      addToast('KONFIRMASI PASWORD tidak sama dengan PASWORD BARU!', 'error');
      return;
    }

    const targetAccount = accounts.find(
      (a) => a.namaUser.toLowerCase() === trimmedUser.toLowerCase()
    );
    if (!targetAccount) {
      addToast(`User "${trimmedUser}" tidak ditemukan!`, 'error');
      return;
    }

    if (targetAccount.password !== gantiPasswordLama) {
      addToast('PASWORD LAMA tidak sesuai / salah!', 'error');
      return;
    }

    const updated = accounts.map((a) =>
      a.fid === targetAccount.fid ? { ...a, password: gantiPassword } : a
    );
    persistAccounts(updated);
    if (currentUser && (currentUser.fid === targetAccount.fid || currentUser.namaUser.toLowerCase() === targetAccount.namaUser.toLowerCase())) {
      setCurrentUser({ ...currentUser, password: gantiPassword });
    }
    addToast(`Password untuk user "${targetAccount.namaUser}" berhasil diubah!`, 'success');
    setGantiPasswordLama('');
    setGantiPassword('');
    setGantiConfirmPassword('');
  };

  // ------------------------------------------------------------------
  // 8.3 HAPUS AKUN
  // ------------------------------------------------------------------
  const handleDeleteAccount = () => {
    if (!hapusUser) {
      alert('Pilih atau masukkan NAMA USER yang ingin dihapus!');
      addToast('Pilih NAMA USER yang ingin dihapus!', 'error');
      return;
    }

    const targetAccount = accounts.find(
      (a) => a.namaUser.toLowerCase() === hapusUser.toLowerCase()
    );
    if (!targetAccount) {
      alert(`User "${hapusUser}" tidak ditemukan!`);
      addToast(`User "${hapusUser}" tidak ditemukan!`, 'error');
      return;
    }

    if (accounts.length <= 1) {
      alert('Tidak dapat menghapus satu-satunya akun di sistem!');
      addToast('Minimal harus ada 1 akun di sistem!', 'error');
      return;
    }

    const updated = accounts.filter((a) => a.fid !== targetAccount.fid);
    persistAccounts(updated);
    addToast(`Akun "${targetAccount.namaUser}" berhasil dihapus dari sistem!`, 'success');
    setHapusUser('');
    setShowDeleteConfirmModal(false);
  };

  const selectedTargetForDelete = useMemo(() => {
    if (!hapusUser) return null;
    return accounts.find((a) => a.namaUser.toLowerCase() === hapusUser.toLowerCase()) || null;
  }, [accounts, hapusUser]);

  return (
    <div className="p-3 md:p-4 space-y-4">
      {/* Tab Navigation (Styled like Menu 7) */}
      <div className="bg-white border border-zinc-200 rounded-xl shadow-xs overflow-hidden">
        <div className="p-3 md:p-4 border-b border-zinc-200 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap gap-2" role="tablist">
            {can81 && (
              <button
                type="button"
                role="tab"
                aria-selected={activeSubTab === '8.1'}
                onClick={() => setActiveSubTab('8.1')}
                className={`px-4 h-9 rounded-full text-xs font-bold transition whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
                  activeSubTab === '8.1'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'bg-zinc-100 text-zinc-700 hover:bg-zinc-200'
                }`}
              >
                <UserPlus className="w-3.5 h-3.5" /> 8.1 TAMBAH AKUN
              </button>
            )}
            {can82 && (
              <button
                type="button"
                role="tab"
                aria-selected={activeSubTab === '8.2'}
                onClick={() => setActiveSubTab('8.2')}
                className={`px-4 h-9 rounded-full text-xs font-bold transition whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
                  activeSubTab === '8.2'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'bg-zinc-100 text-zinc-700 hover:bg-zinc-200'
                }`}
              >
                <KeyRound className="w-3.5 h-3.5" /> 8.2 GANTI PASSWORD
              </button>
            )}
            {can83 && (
              <button
                type="button"
                role="tab"
                aria-selected={activeSubTab === '8.3'}
                onClick={() => setActiveSubTab('8.3')}
                className={`px-4 h-9 rounded-full text-xs font-bold transition whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
                  activeSubTab === '8.3'
                    ? 'bg-red-600 text-white shadow-xs'
                    : 'bg-zinc-100 text-zinc-700 hover:bg-zinc-200'
                }`}
              >
                <UserX className="w-3.5 h-3.5" /> 8.3 HAPUS AKUN
              </button>
            )}
          </div>

          <div className="text-[11px] text-zinc-500 flex items-center gap-2">
            <Users className="w-4 h-4 text-indigo-600" />
            <span>
              Total Terdaftar: <strong>{accounts.length}</strong> Akun
            </span>
          </div>
        </div>

        {/* --------------------------------------------------------------- */}
        {/* TAB 8.1: TAMBAH / EDIT AKUN */}
        {/* --------------------------------------------------------------- */}
        {activeSubTab === '8.1' && (
          <div className="p-4 md:p-6 space-y-6">
            {formError && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-700 text-xs font-medium">
                <AlertTriangle className="w-4 h-4 shrink-0 text-red-600" />
                <span>{formError}</span>
              </div>
            )}

            {editingId && (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-center justify-between text-xs text-amber-900 font-medium">
                <span>
                  Mode Edit: Sedang memperbarui akun <strong>{namaUser}</strong>.
                </span>
                <button
                  type="button"
                  onClick={resetForm81}
                  className="px-2.5 py-1 text-[11px] bg-white border border-amber-300 rounded hover:bg-amber-100 text-amber-800 font-semibold cursor-pointer"
                >
                  Batal Edit
                </button>
              </div>
            )}

            <form onSubmit={handleSaveAccount} className="space-y-6">
              {/* Form Grid: Kiri (Inputs) & Kanan (Logic / Info) */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* SISI KIRI: INPUT DATA USER */}
                <div className="lg:col-span-5 space-y-4 bg-zinc-50/70 p-4 rounded-xl border border-zinc-200">
                  <div className="flex items-center gap-2 pb-2 border-b border-zinc-200">
                    <UserPlus className="w-4 h-4 text-indigo-600" />
                    <h3 className="font-bold text-xs uppercase text-zinc-800 tracking-wider">
                      Informasi Pengguna
                    </h3>
                  </div>

                  {/* NAMA USER input */}
                  <div>
                    <label className="text-[11px] font-semibold text-zinc-700 block uppercase tracking-wider mb-1">
                      NAMA USER <span className="text-red-600">*</span>
                    </label>
                    <input
                      type="text"
                      value={namaUser}
                      onChange={(e) => setNamaUser(e.target.value)}
                      placeholder="Masukkan nama user..."
                      className="bg-white border-zinc-300 text-zinc-900 w-full h-9 px-3 rounded-lg border text-xs focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 outline-hidden transition font-semibold"
                      required
                    />
                  </div>

                  {/* PASWORD input */}
                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <label className="text-[11px] font-semibold text-zinc-700 block uppercase tracking-wider">
                        PASWORD {editingId ? '(KOSONGKAN JIKA TIDAK INGIN DIUBAH)' : <span className="text-red-600">*</span>}
                      </label>
                      <button
                        type="button"
                        onClick={() => setShowPassword((prev) => !prev)}
                        className="text-[10px] text-indigo-600 hover:underline flex items-center gap-1 cursor-pointer"
                      >
                        {showPassword ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                        {showPassword ? 'Sembunyikan' : 'Lihat'}
                      </button>
                    </div>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder={editingId ? 'Masukkan password baru...' : 'Masukkan password...'}
                      className="bg-white border-zinc-300 text-zinc-900 w-full h-9 px-3 rounded-lg border text-xs focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 outline-hidden transition font-mono"
                      required={!editingId}
                    />
                  </div>

                  {/* KONFIRMASI PASWORD input */}
                  <div>
                    <label className="text-[11px] font-semibold text-zinc-700 block uppercase tracking-wider mb-1">
                      KONFIRMASI PASWORD {editingId ? '' : <span className="text-red-600">*</span>}
                    </label>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Ulangi password..."
                      className="bg-white border-zinc-300 text-zinc-900 w-full h-9 px-3 rounded-lg border text-xs focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 outline-hidden transition font-mono"
                      required={!editingId}
                    />
                  </div>

                  {/* AKSES select */}
                  <div>
                    <label className="text-[11px] font-semibold text-zinc-700 block uppercase tracking-wider mb-1">
                      AKSES <span className="text-red-600">*</span>
                    </label>
                    <select
                      value={akses === 'ADMIN' ? 'ADMINISTRATOR' : akses}
                      onChange={(e) => setAkses(e.target.value as any)}
                      className="bg-white border-zinc-300 text-zinc-900 w-full h-9 px-3 rounded-lg border text-xs focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 outline-hidden transition font-semibold"
                    >
                      <option value="ADMINISTRATOR">ADMINISTRATOR</option>
                      <option value="REGIONAL MANAGER">REGIONAL MANAGER</option>
                      <option value="SUPERVISOR">SUPERVISOR</option>
                      <option value="STAFF">STAFF</option>
                      <option value="CUSTOMER SERVICE">CUSTOMER SERVICE</option>
                    </select>
                  </div>
                </div>

                {/* SISI KANAN: RINGKASAN KONFIGURASI HAK AKSES */}
                <div className="lg:col-span-7 bg-zinc-50/70 p-4 rounded-xl border border-zinc-200 space-y-3">
                  <div className="flex items-center gap-2 pb-2 border-b border-zinc-200">
                    <Shield className="w-4 h-4 text-indigo-600" />
                    <h3 className="font-bold text-xs uppercase text-zinc-800 tracking-wider">
                      Ringkasan Hak Akses Pengguna
                    </h3>
                  </div>

                  <div className="space-y-2.5 text-xs text-zinc-700">
                    <div className="p-3 bg-white rounded-lg border border-zinc-200 flex items-start gap-2.5">
                      <div className={`w-7 h-7 rounded-lg font-bold flex items-center justify-center shrink-0 text-xs shadow-xs ${
                        akses === 'ADMIN' || akses === 'ADMINISTRATOR'
                          ? 'bg-indigo-600 text-white'
                          : akses === 'REGIONAL MANAGER'
                          ? 'bg-amber-500 text-white'
                          : akses === 'SUPERVISOR'
                          ? 'bg-emerald-600 text-white'
                          : akses === 'STAFF'
                          ? 'bg-blue-600 text-white'
                          : akses === 'CUSTOMER SERVICE'
                          ? 'bg-purple-600 text-white'
                          : 'bg-zinc-600 text-white'
                      }`}>
                        {akses.charAt(0)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-zinc-900 uppercase">Level: {akses === 'ADMIN' ? 'ADMINISTRATOR' : akses}</span>
                          <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                            {editingId ? 'Mode Edit' : 'Akun Baru'}
                          </span>
                        </div>
                        <p className="text-[11px] text-zinc-500 mt-1 leading-relaxed">
                          {akses === 'ADMIN' || akses === 'ADMINISTRATOR'
                            ? 'ADMINISTRATOR memiliki wewenang penuh atas seluruh sistem (semua menu 1–8, semua sub-tab, seluruh tombol aksi, dan seluruh lokasi).'
                            : 'Wewenang akun ini dibatasi secara mutlak sesuai centang pada Menu Akses, Tombol Akses, dan Lokasi Akses di bawah. Menu/tombol yang tidak dicentang otomatis hilang/terkunci.'}
                        </p>
                      </div>
                    </div>

                    {/* Permission Counters Grid */}
                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                      <div className="p-2.5 bg-white rounded-lg border border-zinc-200 text-center">
                        <span className="text-[10px] uppercase font-bold text-zinc-400 block">Menu Aktif</span>
                        <span className="text-sm font-bold text-indigo-700 font-mono">
                          {selectedMenus.length} <span className="text-[10px] text-zinc-400 font-normal">/ {MENU_ITEMS.length}</span>
                        </span>
                      </div>
                      <div className="p-2.5 bg-white rounded-lg border border-zinc-200 text-center">
                        <span className="text-[10px] uppercase font-bold text-zinc-400 block">Tombol Aktif</span>
                        <span className="text-sm font-bold text-emerald-700 font-mono">
                          {selectedTombol.length} <span className="text-[10px] text-zinc-400 font-normal">/ {TOMBOL_ITEMS.length}</span>
                        </span>
                      </div>
                      <div className="p-2.5 bg-white rounded-lg border border-zinc-200 text-center">
                        <span className="text-[10px] uppercase font-bold text-zinc-400 block">Kolom Aktif</span>
                        <span className="text-sm font-bold text-purple-700 font-mono">
                          {selectedKolom.length} <span className="text-[10px] text-zinc-400 font-normal">/ {KOLOM_ITEMS.length}</span>
                        </span>
                      </div>
                      <div className="p-2.5 bg-white rounded-lg border border-zinc-200 text-center">
                        <span className="text-[10px] uppercase font-bold text-zinc-400 block">Kategori Aktif</span>
                        <span className="text-sm font-bold text-amber-700 font-mono">
                          {selectedKategori.length} <span className="text-[10px] text-zinc-400 font-normal">/ {availableCategories.length}</span>
                        </span>
                      </div>
                      <div className="p-2.5 bg-white rounded-lg border border-zinc-200 text-center">
                        <span className="text-[10px] uppercase font-bold text-zinc-400 block">Lokasi Akses</span>
                        <span className="text-sm font-bold text-blue-700 font-mono">
                          {selectedLocations.length} <span className="text-[10px] text-zinc-400 font-normal">/ {combinedLocations.length}</span>
                        </span>
                      </div>
                    </div>

                    <div className="p-2.5 bg-indigo-50/70 rounded-lg border border-indigo-100 text-indigo-900 text-[11px] leading-relaxed flex items-start gap-2">
                      <CheckSquare className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
                      <span>
                        Pilihan centang di bawah disimpan langsung ke hak akses akun. Saat user ini login, sistem hanya merender menu dan tombol yang telah diberi izin.
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* ------------------------------------------------------------- */}
              {/* BAGIAN 1: MENU AKSES (GRID 3 KOLOM) */}
              {/* ------------------------------------------------------------- */}
              <div className="bg-white border border-zinc-200 rounded-xl p-4 md:p-5 space-y-3 shadow-xs">
                <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-zinc-200">
                  <div>
                    <h4 className="font-bold text-xs uppercase tracking-wider text-zinc-900">
                      MENU AKSES
                    </h4>
                    <p className="text-[11px] text-indigo-700 font-medium">
                      Pilih minimal 1 MENU AKSES ({selectedMenus.length}/{MENU_ITEMS.length} dipilih)
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setSelectedMenus(MENU_ITEMS.map((m) => m.id))}
                      className="px-2.5 py-1 text-[11px] font-semibold bg-indigo-50 text-indigo-700 hover:bg-indigo-100 rounded border border-indigo-200 cursor-pointer"
                    >
                      Pilih Semua
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedMenus([])}
                      className="px-2.5 py-1 text-[11px] font-semibold bg-zinc-100 text-zinc-700 hover:bg-zinc-200 rounded border border-zinc-300 cursor-pointer"
                    >
                      Hapus Semua
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
                  {MENU_ITEMS.map((menu) => {
                    const isChecked = selectedMenus.includes(menu.id);
                    return (
                      <label
                        key={menu.id}
                        className={`flex items-center gap-2 p-2.5 rounded-lg border text-xs cursor-pointer transition select-none ${
                          isChecked
                            ? 'bg-indigo-50/80 border-indigo-300 text-indigo-950 font-semibold'
                            : 'bg-zinc-50/50 border-zinc-200 text-zinc-600 hover:bg-zinc-100'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedMenus((prev) => [...prev, menu.id]);
                            } else {
                              setSelectedMenus((prev) => prev.filter((id) => id !== menu.id));
                            }
                          }}
                          className="w-4 h-4 rounded text-indigo-600 border-zinc-300 focus:ring-indigo-500 cursor-pointer"
                        />
                        <span className="truncate">{menu.label}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* ------------------------------------------------------------- */}
              {/* BAGIAN 2: TOMBOL DALAM MENU AKSES (GRID 3 KOLOM) */}
              {/* ------------------------------------------------------------- */}
              <div className="bg-white border border-zinc-200 rounded-xl p-4 md:p-5 space-y-3 shadow-xs">
                <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-zinc-200">
                  <div>
                    <h4 className="font-bold text-xs uppercase tracking-wider text-zinc-900">
                      TOMBOL DALAM MENU AKSES
                    </h4>
                    <p className="text-[11px] text-indigo-700 font-medium">
                      Pilih minimal 1 TOMBOL DALAM MENU AKSES ({selectedTombol.length}/{TOMBOL_ITEMS.length} dipilih)
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setSelectedTombol(TOMBOL_ITEMS.map((t) => t.id))}
                      className="px-2.5 py-1 text-[11px] font-semibold bg-indigo-50 text-indigo-700 hover:bg-indigo-100 rounded border border-indigo-200 cursor-pointer"
                    >
                      Pilih Semua
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedTombol([])}
                      className="px-2.5 py-1 text-[11px] font-semibold bg-zinc-100 text-zinc-700 hover:bg-zinc-200 rounded border border-zinc-300 cursor-pointer"
                    >
                      Hapus Semua
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
                  {TOMBOL_ITEMS.map((btn) => {
                    const isChecked = selectedTombol.includes(btn.id);
                    return (
                      <label
                        key={btn.id}
                        className={`flex items-center gap-2 p-2.5 rounded-lg border text-xs cursor-pointer transition select-none ${
                          isChecked
                            ? 'bg-indigo-50/80 border-indigo-300 text-indigo-950 font-semibold'
                            : 'bg-zinc-50/50 border-zinc-200 text-zinc-600 hover:bg-zinc-100'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedTombol((prev) => [...prev, btn.id]);
                            } else {
                              setSelectedTombol((prev) => prev.filter((id) => id !== btn.id));
                            }
                          }}
                          className="w-4 h-4 rounded text-indigo-600 border-zinc-300 focus:ring-indigo-500 cursor-pointer"
                        />
                        <span className="truncate">{btn.label}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* ------------------------------------------------------------- */}
              {/* BAGIAN 3: KOLOM DALAM MENU AKSES (GRID 3 KOLOM) */}
              {/* ------------------------------------------------------------- */}
              <div className="bg-white border border-zinc-200 rounded-xl p-4 md:p-5 space-y-3 shadow-xs">
                <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-zinc-200">
                  <div>
                    <h4 className="font-bold text-xs uppercase tracking-wider text-zinc-900">
                      KOLOM DALAM MENU AKSES
                    </h4>
                    <p className="text-[11px] text-indigo-700 font-medium">
                      Pilih kolom dalam menu yang dapat diakses ({selectedKolom.length}/{KOLOM_ITEMS.length} dipilih)
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setSelectedKolom(KOLOM_ITEMS.map((k) => k.id))}
                      className="px-2.5 py-1 text-[11px] font-semibold bg-indigo-50 text-indigo-700 hover:bg-indigo-100 rounded border border-indigo-200 cursor-pointer"
                    >
                      Pilih Semua
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedKolom([])}
                      className="px-2.5 py-1 text-[11px] font-semibold bg-zinc-100 text-zinc-700 hover:bg-zinc-200 rounded border border-zinc-300 cursor-pointer"
                    >
                      Hapus Semua
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
                  {KOLOM_ITEMS.map((col) => {
                    const isChecked = selectedKolom.includes(col.id);
                    return (
                      <label
                        key={col.id}
                        className={`flex items-center gap-2 p-2.5 rounded-lg border text-xs cursor-pointer transition select-none ${
                          isChecked
                            ? 'bg-indigo-50/80 border-indigo-300 text-indigo-950 font-semibold'
                            : 'bg-zinc-50/50 border-zinc-200 text-zinc-600 hover:bg-zinc-100'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedKolom((prev) => [...prev, col.id]);
                            } else {
                              setSelectedKolom((prev) => prev.filter((id) => id !== col.id));
                            }
                          }}
                          className="w-4 h-4 rounded text-indigo-600 border-zinc-300 focus:ring-indigo-500 cursor-pointer"
                        />
                        <span className="truncate">{col.label}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* ------------------------------------------------------------- */}
              {/* BAGIAN 4: KATEGORI ASET AKSES */}
              {/* ------------------------------------------------------------- */}
              <div className="bg-white border border-zinc-200 rounded-xl p-4 md:p-5 space-y-3 shadow-xs">
                <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-zinc-200">
                  <div>
                    <h4 className="font-bold text-xs uppercase tracking-wider text-zinc-900">
                      KATEGORI ASET AKSES
                    </h4>
                    <p className="text-[11px] text-indigo-700 font-medium">
                      Pilih kategori aset yang dapat diakses ({selectedKategori.length}/{availableCategories.length} dipilih)
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setSelectedKategori([...availableCategories])}
                      className="px-2.5 py-1 text-[11px] font-semibold bg-indigo-50 text-indigo-700 hover:bg-indigo-100 rounded border border-indigo-200 cursor-pointer"
                    >
                      Pilih Semua
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedKategori([])}
                      className="px-2.5 py-1 text-[11px] font-semibold bg-zinc-100 text-zinc-700 hover:bg-zinc-200 rounded border border-zinc-300 cursor-pointer"
                    >
                      Hapus Semua
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
                  {availableCategories.map((cat) => {
                    const isChecked = selectedKategori.includes(cat);
                    return (
                      <label
                        key={cat}
                        className={`flex items-center gap-2 p-2.5 rounded-lg border text-xs cursor-pointer transition select-none ${
                          isChecked
                            ? 'bg-amber-50/80 border-amber-300 text-amber-950 font-semibold'
                            : 'bg-zinc-50/50 border-zinc-200 text-zinc-600 hover:bg-zinc-100'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedKategori((prev) => [...prev, cat]);
                            } else {
                              setSelectedKategori((prev) => prev.filter((c) => c !== cat));
                            }
                          }}
                          className="w-4 h-4 rounded text-amber-600 border-zinc-300 focus:ring-amber-500 cursor-pointer"
                        />
                        <span className="truncate font-semibold">{cat}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* ------------------------------------------------------------- */}
              {/* BAGIAN 5: LOKASI AKSES */}
              {/* ------------------------------------------------------------- */}
              <div className="bg-white border border-zinc-200 rounded-xl p-4 md:p-5 space-y-3 shadow-xs">
                <div className="flex flex-wrap items-center justify-between gap-3 pb-2 border-b border-zinc-200">
                  <div>
                    <h4 className="font-bold text-xs uppercase tracking-wider text-zinc-900">
                      LOKASI AKSES - Pilih lokasi yang bisa diakses oleh user
                    </h4>
                    <p className="text-[11px] text-indigo-700 font-semibold">
                      ({selectedLocations.length} dari {combinedLocations.length} Lokasi Dipilih)
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <div className="relative">
                      <input
                        type="text"
                        value={locationSearch}
                        onChange={(e) => setLocationSearch(e.target.value)}
                        placeholder="Cari lokasi (kode atau nama)..."
                        className="bg-white border-zinc-300 text-zinc-900 h-8 pl-7 pr-3 rounded-lg border text-xs focus:ring-1 focus:ring-indigo-500 outline-hidden w-64"
                      />
                      <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-2 top-2.5" />
                    </div>

                    <button
                      type="button"
                      onClick={() => setSelectedLocations(combinedLocations.map((l) => l.code))}
                      className="px-2.5 py-1 text-[11px] font-semibold bg-indigo-50 text-indigo-700 hover:bg-indigo-100 rounded border border-indigo-200 cursor-pointer h-8"
                    >
                      Pilih Semua
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedLocations([])}
                      className="px-2.5 py-1 text-[11px] font-semibold bg-zinc-100 text-zinc-700 hover:bg-zinc-200 rounded border border-zinc-300 cursor-pointer h-8"
                    >
                      Hapus Semua
                    </button>
                  </div>
                </div>

                {/* Location Checkbox Grid */}
                <div className="max-h-72 overflow-y-auto pr-1 scrollbar-thin">
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                    {filteredLocationList.map((loc) => {
                      const isChecked = selectedLocations.includes(loc.code);
                      return (
                        <label
                          key={loc.code}
                          className={`flex items-start gap-2 p-2 rounded-lg border text-xs cursor-pointer transition select-none ${
                            isChecked
                              ? 'bg-indigo-50/90 border-indigo-300 text-indigo-950 font-medium'
                              : 'bg-zinc-50/50 border-zinc-200 text-zinc-600 hover:bg-zinc-100'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedLocations((prev) => [...prev, loc.code]);
                              } else {
                                setSelectedLocations((prev) =>
                                  prev.filter((c) => c !== loc.code)
                                );
                              }
                            }}
                            className="mt-0.5 w-4 h-4 rounded text-indigo-600 border-zinc-300 focus:ring-indigo-500 cursor-pointer"
                          />
                          <div className="min-w-0">
                            <span className="font-mono font-bold text-zinc-900">{loc.code}</span>
                            <p className="text-[11px] text-zinc-500 truncate leading-tight">
                              {loc.name}
                            </p>
                          </div>
                        </label>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Tombol Simpan Akun */}
              <div className="flex items-center gap-3 pt-2">
                <button
                  type="submit"
                  className="px-6 h-10 rounded-lg text-xs font-bold bg-indigo-600 text-white hover:bg-indigo-700 transition shadow-xs flex items-center gap-2 cursor-pointer"
                >
                  <Check className="w-4 h-4" />
                  {editingId ? 'SIMPAN PERUBAHAN AKUN' : 'SIMPAN AKUN'}
                </button>

                {editingId && (
                  <button
                    type="button"
                    onClick={resetForm81}
                    className="px-4 h-10 rounded-lg text-xs font-semibold bg-zinc-100 text-zinc-700 hover:bg-zinc-200 transition cursor-pointer"
                  >
                    Batal
                  </button>
                )}
              </div>
            </form>

            {/* ------------------------------------------------------------- */}
            {/* TABEL DAFTAR AKUN TERDAFTAR */}
            {/* ------------------------------------------------------------- */}
            <div className="mt-8 pt-6 border-t border-zinc-200 space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="font-bold text-xs uppercase tracking-wider text-zinc-900">
                  DAFTAR AKUN PENGGUNA ({accounts.length})
                </h4>
              </div>

              <div className="overflow-x-auto rounded-lg border border-zinc-200 bg-white">
                <table className="w-full text-xs text-left border-collapse">
                  <thead className="bg-zinc-100 text-zinc-700 text-[11px] font-bold uppercase tracking-wider border-b border-zinc-200">
                    <tr>
                      <th className="py-2.5 px-3 text-center w-12">NO</th>
                      <th className="py-2.5 px-3">NAMA USER</th>
                      <th className="py-2.5 px-3 text-center">HAK AKSES</th>
                      <th className="py-2.5 px-3 text-center">MENU AKSES</th>
                      <th className="py-2.5 px-3 text-center">KATEGORI AKSES</th>
                      <th className="py-2.5 px-3 text-center">LOKASI AKSES</th>
                      <th className="py-2.5 px-3 text-center">TGL DAFTAR</th>
                      <th className="py-2.5 px-3 text-center w-28">AKSI</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-200">
                    {accounts.map((acc, idx) => (
                      <tr key={acc.fid} className="hover:bg-zinc-50 transition">
                        <td className="py-2.5 px-3 text-center font-medium text-zinc-500">
                          {idx + 1}
                        </td>
                        <td className="py-2.5 px-3 font-bold text-zinc-900">
                          {acc.namaUser}
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              acc.akses === 'ADMIN' || acc.akses === 'ADMINISTRATOR'
                                ? 'bg-indigo-100 text-indigo-700'
                                : acc.akses === 'REGIONAL MANAGER'
                                ? 'bg-amber-100 text-amber-800'
                                : acc.akses === 'SUPERVISOR'
                                ? 'bg-emerald-100 text-emerald-700'
                                : acc.akses === 'STAFF'
                                ? 'bg-blue-100 text-blue-700'
                                : acc.akses === 'CUSTOMER SERVICE'
                                ? 'bg-purple-100 text-purple-700'
                                : 'bg-zinc-100 text-zinc-700'
                            }`}
                          >
                            {acc.akses === 'ADMIN' ? 'ADMINISTRATOR' : acc.akses}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-center text-zinc-600">
                          {acc.menuAkses?.length || 0} Menu
                        </td>
                        <td className="py-2.5 px-3 text-center text-zinc-600">
                          {acc.kategoriAkses ? `${acc.kategoriAkses.length} Kategori` : 'Semua'}
                        </td>
                        <td className="py-2.5 px-3 text-center text-zinc-600">
                          {acc.aksesAllLokasi || !acc.lokasiAkses || acc.lokasiAkses.length === 0 || acc.lokasiAkses.length >= combinedLocations.length
                            ? `${combinedLocations.length} Lokasi (Semua)`
                            : `${acc.lokasiAkses.length} Lokasi`}
                        </td>
                        <td className="py-2.5 px-3 text-center text-zinc-500 text-[11px]">
                          {acc.createdAt}
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleEditClick(acc)}
                              title="Edit Akun"
                              className="p-1 rounded hover:bg-indigo-50 text-indigo-600 transition cursor-pointer"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setHapusUser(acc.namaUser);
                                setActiveSubTab('8.3');
                              }}
                              title="Hapus Akun"
                              className="p-1 rounded hover:bg-red-50 text-red-600 transition cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* --------------------------------------------------------------- */}
        {/* TAB 8.2: GANTI PASSWORD */}
        {/* --------------------------------------------------------------- */}
        {activeSubTab === '8.2' && (
          <div className="p-4 md:p-6 max-w-xl space-y-5">
            <div className="flex items-center gap-2 pb-2 border-b border-zinc-200">
              <KeyRound className="w-4 h-4 text-indigo-600" />
              <h3 className="font-bold text-xs uppercase text-zinc-800 tracking-wider">
                Ganti Password Pengguna
              </h3>
            </div>

            <form onSubmit={handleGantiPassword} className="space-y-4">
              {/* NAMA USER input (ketik manual) */}
              <div>
                <label className="text-[11px] font-semibold text-zinc-700 block uppercase tracking-wider mb-1">
                  NAMA USER <span className="text-red-600">*</span>
                </label>
                <input
                  type="text"
                  value={gantiUser}
                  onChange={(e) => setGantiUser(e.target.value)}
                  placeholder="Ketik nama user..."
                  className="bg-white border-zinc-300 text-zinc-900 w-full h-9 px-3 rounded-lg border text-xs focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 outline-hidden transition font-semibold"
                  required
                />
              </div>

              {/* PASWORD LAMA input */}
              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="text-[11px] font-semibold text-zinc-700 block uppercase tracking-wider">
                    PASWORD LAMA <span className="text-red-600">*</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => setGantiShowPassword((p) => !p)}
                    className="text-[10px] text-indigo-600 hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    {gantiShowPassword ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                    {gantiShowPassword ? 'Sembunyikan' : 'Lihat'}
                  </button>
                </div>
                <input
                  type={gantiShowPassword ? 'text' : 'password'}
                  value={gantiPasswordLama}
                  onChange={(e) => setGantiPasswordLama(e.target.value)}
                  placeholder="Masukkan password lama..."
                  className="bg-white border-zinc-300 text-zinc-900 w-full h-9 px-3 rounded-lg border text-xs focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 outline-hidden transition font-mono"
                  required
                />
              </div>

              {/* PASWORD BARU input */}
              <div>
                <label className="text-[11px] font-semibold text-zinc-700 block uppercase tracking-wider mb-1">
                  PASWORD BARU <span className="text-red-600">*</span>
                </label>
                <input
                  type={gantiShowPassword ? 'text' : 'password'}
                  value={gantiPassword}
                  onChange={(e) => setGantiPassword(e.target.value)}
                  placeholder="Masukkan password baru..."
                  className="bg-white border-zinc-300 text-zinc-900 w-full h-9 px-3 rounded-lg border text-xs focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 outline-hidden transition font-mono"
                  required
                />
              </div>

              {/* KONFIRMASI PASWORD input */}
              <div>
                <label className="text-[11px] font-semibold text-zinc-700 block uppercase tracking-wider mb-1">
                  KONFIRMASI PASWORD BARU <span className="text-red-600">*</span>
                </label>
                <input
                  type={gantiShowPassword ? 'text' : 'password'}
                  value={gantiConfirmPassword}
                  onChange={(e) => setGantiConfirmPassword(e.target.value)}
                  placeholder="Ulangi password baru..."
                  className="bg-white border-zinc-300 text-zinc-900 w-full h-9 px-3 rounded-lg border text-xs focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 outline-hidden transition font-mono"
                  required
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  className="px-6 h-10 rounded-lg text-xs font-bold bg-indigo-600 text-white hover:bg-indigo-700 transition shadow-xs flex items-center gap-2 cursor-pointer"
                >
                  <Check className="w-4 h-4" /> Simpan Edit Password
                </button>
              </div>
            </form>
          </div>
        )}

        {/* --------------------------------------------------------------- */}
        {/* TAB 8.3: HAPUS AKUN */}
        {/* --------------------------------------------------------------- */}
        {activeSubTab === '8.3' && (
          <div className="p-4 md:p-6 max-w-xl space-y-5">
            <div className="flex items-center gap-2 pb-2 border-b border-zinc-200">
              <UserX className="w-4 h-4 text-red-600" />
              <h3 className="font-bold text-xs uppercase text-zinc-800 tracking-wider">
                Hapus Akun Pengguna
              </h3>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-[11px] font-semibold text-zinc-700 block uppercase tracking-wider mb-1">
                  NAMA USER (KUNCI AKUN) <span className="text-red-600">*</span>
                </label>
                <select
                  value={hapusUser}
                  onChange={(e) => setHapusUser(e.target.value)}
                  className="bg-white border-zinc-300 text-zinc-900 w-full h-9 px-3 rounded-lg border text-xs focus:ring-2 focus:ring-red-500/20 focus:border-red-600 outline-hidden transition font-bold"
                >
                  <option value="">-- PILIH USER YANG INGIN DIHAPUS --</option>
                  {accounts.map((a) => (
                    <option key={a.fid} value={a.namaUser}>
                      {a.namaUser} ({a.akses === 'ADMIN' ? 'ADMINISTRATOR' : a.akses})
                    </option>
                  ))}
                </select>
              </div>

              {selectedTargetForDelete && (
                <div className="p-3.5 bg-red-50 border border-red-200 rounded-lg space-y-1.5 text-xs text-red-900">
                  <p className="font-bold">Detail Akun Yang Akan Dihapus:</p>
                  <p>Nama: <strong>{selectedTargetForDelete.namaUser}</strong></p>
                  <p>Level Akses: <strong>{selectedTargetForDelete.akses === 'ADMIN' ? 'ADMINISTRATOR' : selectedTargetForDelete.akses}</strong></p>
                  <p>Jumlah Menu Akses: <strong>{selectedTargetForDelete.menuAkses?.length || 0}</strong></p>
                  <p>Jumlah Lokasi Akses: <strong>{selectedTargetForDelete.lokasiAkses?.length || 0}</strong></p>
                  <p className="text-[11px] text-red-700 italic pt-1">
                    Peringatan: Akun yang telah dihapus tidak dapat dipulihkan kembali.
                  </p>
                </div>
              )}

              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => setShowDeleteConfirmModal(true)}
                  disabled={!hapusUser}
                  className="px-6 h-10 rounded-lg text-xs font-bold bg-red-600 text-white hover:bg-red-700 transition shadow-xs flex items-center gap-2 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <Trash2 className="w-4 h-4" /> Tombol Hapus Akun
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Confirmation Modal for Delete */}
      {showDeleteConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-white rounded-xl shadow-xl max-w-sm w-full p-5 border border-zinc-200">
            <div className="w-10 h-10 rounded-full bg-red-100 text-red-600 flex items-center justify-center mb-3">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <h4 className="font-bold text-sm text-zinc-900 mb-1">Konfirmasi Hapus Akun</h4>
            <p className="text-xs text-zinc-600 mb-4 leading-relaxed">
              Apakah Anda yakin ingin menghapus akun <strong>{hapusUser}</strong> secara permanen?
            </p>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowDeleteConfirmModal(false)}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold text-zinc-600 hover:bg-zinc-100 cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleDeleteAccount}
                className="px-4 py-1.5 rounded-lg text-xs font-semibold bg-red-600 text-white hover:bg-red-700 cursor-pointer shadow-xs"
              >
                Ya, Hapus Akun
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
