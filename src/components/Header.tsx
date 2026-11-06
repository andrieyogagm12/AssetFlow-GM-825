import React, { useState, useEffect, useRef } from 'react';
import {
  LogOut,
  Trash2,
  User,
  Download,
  RotateCcw,
  Check,
  AlertTriangle,
  Upload,
  Database,
  FileCheck,
} from 'lucide-react';
import { useAssets } from '../context/AssetContext';
import { UserAccount } from '../views/ViewPengaturan';
import { DatabaseBackupSnapshot } from '../types/asset';

interface HeaderProps {
  currentUser?: UserAccount | null;
  onLogout?: () => void;
}

export const Header: React.FC<HeaderProps> = ({ currentUser, onLogout }) => {
  const {
    clearDatabase,
    backupDatabase,
    restoreDatabase,
    getLastBackupInfo,
    hasButtonAccess,
    assets,
    rotations,
    locations,
    assetTypes,
    periodLocks,
    revenues,
  } = useAssets();

  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [showBackupModal, setShowBackupModal] = useState(false);
  const [showRestoreModal, setShowRestoreModal] = useState(false);

  // Backup modal options
  const [downloadJsonChecked, setDownloadJsonChecked] = useState(true);

  // Restore state
  const [latestBackup, setLatestBackup] = useState<DatabaseBackupSnapshot | null>(null);
  const [uploadedBackup, setUploadedBackup] = useState<DatabaseBackupSnapshot | null>(null);
  const [fileError, setFileError] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Permissions
  const canBackup = hasButtonAccess('btn-backup-db');
  const canRestore = hasButtonAccess('btn-pulihkan-db');
  const canClear = hasButtonAccess('btn-hapus-db');

  // Count registered accounts
  const [totalAccounts, setTotalAccounts] = useState<number>(1);
  useEffect(() => {
    try {
      const raw = localStorage.getItem('gm_users_account');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          setTotalAccounts(parsed.length);
        }
      }
    } catch {}
  }, [showBackupModal, showRestoreModal]);

  // Ensure clean white theme
  useEffect(() => {
    if (typeof window !== 'undefined') {
      document.documentElement.classList.remove('dark');
      localStorage.removeItem('assetflow_theme');
    }
  }, []);

  const handleOpenRestore = () => {
    const backup = getLastBackupInfo();
    setLatestBackup(backup);
    setUploadedBackup(null);
    setFileError('');
    setShowRestoreModal(true);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFileError('');
    setUploadedBackup(null);
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.json')) {
      setFileError('File harus berformat .json');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        if (!parsed || !parsed.data) {
          setFileError('Format file backup tidak sesuai (struktur data tidak valid).');
          return;
        }
        setUploadedBackup(parsed as DatabaseBackupSnapshot);
      } catch (err: any) {
        setFileError(`Gagal membaca file: ${err.message || 'JSON tidak valid'}`);
      }
    };
    reader.onerror = () => {
      setFileError('Terjadi kesalahan saat membaca file.');
    };
    reader.readAsText(file);
  };

  return (
    <>
      <header className="h-16 border-b border-zinc-200 bg-white/95 backdrop-blur-md sticky top-0 z-30 flex items-center justify-between px-3 md:px-6 gap-3">
        {/* Brand / Logo */}
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 shrink-0 rounded-lg bg-indigo-600 flex items-center justify-center text-white font-bold text-sm shadow-xs">
            A
          </div>
          <div className="min-w-0 flex items-center">
            <span className="font-extrabold text-[15.5px] text-zinc-900 tracking-wide truncate leading-none">
              ASSETFLOW • GAME MASTER
            </span>
          </div>
        </div>

        {/* Action Buttons Group (Directly to the left of Hapus Database) */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          {/* Active Logged-in User Chip */}
          {currentUser && (
            <div className="hidden lg:flex items-center gap-2 px-2.5 py-1 rounded-lg bg-zinc-50 border border-zinc-200 text-xs mr-1">
              <div className="w-5 h-5 rounded-full bg-indigo-600 text-white font-bold flex items-center justify-center text-[10px]">
                {currentUser.namaUser ? currentUser.namaUser.charAt(0).toUpperCase() : <User className="w-3 h-3" />}
              </div>
              <div className="flex flex-col text-left leading-none">
                <span className="font-semibold text-zinc-800 text-[11px]">{currentUser.namaUser}</span>
                <span className="text-[9px] font-bold text-indigo-600 uppercase">{currentUser.akses === 'ADMIN' ? 'ADMINISTRATOR' : currentUser.akses}</span>
              </div>
            </div>
          )}

          {/* 1. Backup Database Button (Biru) */}
          {canBackup && (
            <button
              type="button"
              onClick={() => setShowBackupModal(true)}
              title="Backup seluruh database (aset, rotasi, master, akun, dll)"
              className="h-8 px-2 sm:px-2.5 rounded-lg flex items-center gap-1.5 text-xs text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 transition font-semibold cursor-pointer shadow-xs whitespace-nowrap"
            >
              <Download className="h-3.5 w-3.5 text-blue-600 shrink-0" />
              <span className="hidden sm:inline">Backup Database</span>
            </button>
          )}

          {/* 2. Pulihkan Database Button (Hijau) */}
          {canRestore && (
            <button
              type="button"
              onClick={handleOpenRestore}
              title="Pulihkan database berdasarkan keadaan terakhir dibackup"
              className="h-8 px-2 sm:px-2.5 rounded-lg flex items-center gap-1.5 text-xs text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 transition font-semibold cursor-pointer shadow-xs whitespace-nowrap"
            >
              <RotateCcw className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
              <span className="hidden sm:inline">Pulihkan Database</span>
            </button>
          )}

          {/* 3. Hapus Database Button (Merah) */}
          {canClear && (
            <button
              type="button"
              onClick={() => setShowClearConfirm(true)}
              title="Hapus / Kosongkan seluruh isi database aset"
              className="h-8 px-2 sm:px-2.5 rounded-lg flex items-center gap-1.5 text-xs text-red-700 bg-red-50 hover:bg-red-100 border border-red-200 transition font-semibold cursor-pointer shadow-xs whitespace-nowrap"
            >
              <Trash2 className="h-3.5 w-3.5 text-red-600 shrink-0" />
              <span className="hidden sm:inline">Hapus Database</span>
            </button>
          )}

          {/* Logout Button */}
          <button
            type="button"
            onClick={() => setShowLogoutConfirm(true)}
            className="h-8 px-2.5 rounded-lg flex items-center gap-1.5 text-xs text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 border border-transparent hover:border-zinc-200 transition font-medium cursor-pointer"
            title="Keluar dari sesi"
          >
            <LogOut className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Keluar</span>
          </button>
        </div>
      </header>

      {/* ------------------------------------------------------------- */}
      {/* MODAL 1: BACKUP DATABASE (BIRU) */}
      {/* ------------------------------------------------------------- */}
      {showBackupModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-5 border border-zinc-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center shrink-0">
                <Download className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-bold text-sm text-zinc-900">Backup Seluruh Database</h4>
                <p className="text-[11px] text-zinc-500">Mencadangkan seluruh data sistem Game Master</p>
              </div>
            </div>

            <p className="text-xs text-zinc-600 mb-3 leading-relaxed">
              Tindakan ini akan membuat salinan snapshot lengkap yang mencakup data aset, riwayat rotasi & mutasi, akun pengguna, master lokasi cabang, master kategori, periode tutup, dan catatan pendapatan.
            </p>

            {/* Rincian data yang akan dibackup */}
            <div className="bg-blue-50/60 rounded-lg p-3 border border-blue-100 mb-4 text-xs space-y-1.5">
              <div className="font-bold text-[11px] uppercase tracking-wider text-blue-900 mb-1 flex items-center gap-1">
                <Database className="w-3.5 h-3.5 text-blue-600" /> Ringkasan Data Saat Ini:
              </div>
              <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-zinc-700 text-[11px]">
                <div>• Total Data Aset: <strong>{assets.length}</strong></div>
                <div>• Riwayat Rotasi: <strong>{rotations.length}</strong></div>
                <div>• Master Lokasi: <strong>{locations.length} Cabang</strong></div>
                <div>• Kategori Aset: <strong>{assetTypes.length}</strong></div>
                <div>• Akun Pengguna: <strong>{totalAccounts} Akun</strong></div>
                <div>• Periode Tutup: <strong>{periodLocks.length} Data</strong></div>
                <div className="col-span-2">• Rekap Pendapatan: <strong>{revenues.length} Data</strong></div>
              </div>
            </div>

            {/* Checkbox download JSON */}
            <label className="flex items-start gap-2.5 p-2.5 rounded-lg border border-zinc-200 bg-zinc-50 hover:bg-zinc-100 cursor-pointer select-none mb-4 text-xs text-zinc-800 transition">
              <input
                type="checkbox"
                checked={downloadJsonChecked}
                onChange={(e) => setDownloadJsonChecked(e.target.checked)}
                className="mt-0.5 w-4 h-4 rounded text-blue-600 border-zinc-300 focus:ring-blue-500 cursor-pointer"
              />
              <div className="min-w-0">
                <span className="font-semibold block">Unduh file backup (.json) ke komputer</span>
                <span className="text-[11px] text-zinc-500 block leading-tight">
                  Simpan file cadangan fisik di penyimpanan lokal komputer Anda sebagai arsip aman.
                </span>
              </div>
            </label>

            <div className="flex justify-end gap-2 pt-2 border-t border-zinc-100">
              <button
                type="button"
                onClick={() => setShowBackupModal(false)}
                className="px-3.5 py-2 rounded-lg text-xs font-semibold text-zinc-600 hover:bg-zinc-100 cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={() => {
                  backupDatabase(downloadJsonChecked);
                  setShowBackupModal(false);
                }}
                className="px-4 py-2 rounded-lg text-xs font-semibold bg-blue-600 text-white hover:bg-blue-700 cursor-pointer shadow-xs flex items-center gap-1.5 transition"
              >
                <Download className="w-3.5 h-3.5" />
                Backup Database Sekarang
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* MODAL 2: PULIHKAN DATABASE (HIJAU) */}
      {/* ------------------------------------------------------------- */}
      {showRestoreModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full p-5 border border-zinc-200 animate-in fade-in zoom-in-95 duration-150 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0">
                <RotateCcw className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-bold text-sm text-zinc-900">Pulihkan Database Sistem</h4>
                <p className="text-[11px] text-zinc-500">
                  Kembalikan seluruh database ke kondisi saat cadangan dibuat
                </p>
              </div>
            </div>

            {/* Opsi 1: Dari Snapshot Terakhir */}
            <div className="space-y-3 mb-4">
              <div className="text-xs font-bold text-zinc-800 uppercase tracking-wider flex items-center gap-1.5">
                <Database className="w-3.5 h-3.5 text-emerald-600" />
                Cadangan Terakhir Tersimpan di Sistem:
              </div>

              {latestBackup ? (
                <div className="bg-emerald-50/70 border border-emerald-200 rounded-lg p-3 text-xs text-zinc-800 space-y-2">
                  <div className="flex items-center justify-between pb-1.5 border-b border-emerald-200/60">
                    <span className="font-semibold text-emerald-950">Waktu Cadangan:</span>
                    <span className="font-mono font-bold text-emerald-700 bg-white px-2 py-0.5 rounded border border-emerald-200">
                      {latestBackup.timestamp}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-1.5 text-[11px] text-zinc-700">
                    <div>• Total Aset: <strong>{latestBackup.summary?.totalAssets ?? latestBackup.data?.assets?.length ?? 0}</strong></div>
                    <div>• Riwayat Rotasi: <strong>{latestBackup.summary?.totalRotations ?? latestBackup.data?.rotations?.length ?? 0}</strong></div>
                    <div>• Cabang Lokasi: <strong>{latestBackup.summary?.totalLocations ?? latestBackup.data?.locations?.length ?? 0}</strong></div>
                    <div>• Akun Pengguna: <strong>{latestBackup.summary?.totalAccounts ?? latestBackup.data?.users?.length ?? 0}</strong></div>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      const res = restoreDatabase(latestBackup);
                      if (res.success) {
                        setShowRestoreModal(false);
                      }
                    }}
                    className="w-full mt-2 py-2 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-xs cursor-pointer transition"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    Pulihkan dari Cadangan Ini ({latestBackup.timestamp})
                  </button>
                </div>
              ) : (
                <div className="p-3 bg-zinc-50 border border-zinc-200 rounded-lg text-xs text-zinc-500">
                  Belum ada snapshot cadangan yang dibuat di peramban ini. Silakan buat cadangan terlebih dahulu atau gunakan file backup (.json) di bawah.
                </div>
              )}
            </div>

            {/* Opsi 2: Dari File Backup JSON */}
            <div className="pt-3 border-t border-zinc-200 space-y-2.5">
              <div className="text-xs font-bold text-zinc-800 uppercase tracking-wider flex items-center gap-1.5">
                <Upload className="w-3.5 h-3.5 text-indigo-600" />
                Atau Pulihkan dari File Backup JSON (.json):
              </div>
              <p className="text-[11px] text-zinc-500 leading-tight">
                Jika Anda memiliki file hasil backup (.json) yang diunduh sebelumnya, pilih file tersebut untuk memulihkan database.
              </p>

              <input
                type="file"
                ref={fileInputRef}
                accept=".json"
                onChange={handleFileSelect}
                className="hidden"
              />

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="px-3 py-1.5 rounded-lg border border-zinc-300 bg-zinc-50 hover:bg-zinc-100 text-xs font-semibold text-zinc-700 cursor-pointer flex items-center gap-1.5 transition"
                >
                  <Upload className="w-3.5 h-3.5 text-zinc-600" />
                  Pilih File Backup (.json)
                </button>
                {uploadedBackup && (
                  <span className="text-[11px] text-emerald-700 font-semibold flex items-center gap-1">
                    <FileCheck className="w-3.5 h-3.5" /> File valid siap dipulihkan
                  </span>
                )}
              </div>

              {fileError && (
                <div className="p-2 bg-red-50 border border-red-200 rounded text-[11px] text-red-700 flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5 text-red-600 shrink-0" />
                  <span>{fileError}</span>
                </div>
              )}

              {uploadedBackup && (
                <div className="p-3 bg-zinc-50 rounded-lg border border-zinc-200 text-xs space-y-1.5">
                  <div className="font-semibold text-zinc-800">
                    Rincian File Cadangan: {uploadedBackup.timestamp || 'Waktu tidak tertera'}
                  </div>
                  <div className="text-[11px] text-zinc-600 grid grid-cols-2 gap-1">
                    <div>• Aset: <strong>{uploadedBackup.summary?.totalAssets ?? uploadedBackup.data?.assets?.length ?? 0}</strong></div>
                    <div>• Rotasi: <strong>{uploadedBackup.summary?.totalRotations ?? uploadedBackup.data?.rotations?.length ?? 0}</strong></div>
                    <div>• Lokasi: <strong>{uploadedBackup.summary?.totalLocations ?? uploadedBackup.data?.locations?.length ?? 0}</strong></div>
                    <div>• Akun: <strong>{uploadedBackup.summary?.totalAccounts ?? uploadedBackup.data?.users?.length ?? 0}</strong></div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      const res = restoreDatabase(uploadedBackup);
                      if (res.success) {
                        setShowRestoreModal(false);
                      }
                    }}
                    className="w-full mt-2 py-2 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-xs cursor-pointer transition"
                  >
                    <Check className="w-3.5 h-3.5" />
                    Pulihkan dari File Ini Sekarang
                  </button>
                </div>
              )}
            </div>

            {/* Warning Message */}
            <div className="mt-4 p-2.5 bg-amber-50 rounded-lg border border-amber-200 text-amber-900 text-[11px] flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <span>
                <strong>Perhatian:</strong> Pemulihan database akan menimpa seluruh data sistem yang sedang aktif saat ini sesuai kondisi isi cadangan yang dipilih.
              </span>
            </div>

            <div className="flex justify-end gap-2 pt-3 mt-4 border-t border-zinc-100">
              <button
                type="button"
                onClick={() => setShowRestoreModal(false)}
                className="px-3.5 py-1.5 rounded-lg text-xs font-semibold text-zinc-600 hover:bg-zinc-100 cursor-pointer"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* MODAL 3: HAPUS DATABASE (MERAH) */}
      {/* ------------------------------------------------------------- */}
      {showClearConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-white rounded-xl shadow-xl max-w-sm w-full p-5 border border-zinc-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="w-10 h-10 rounded-full bg-red-100 text-red-600 flex items-center justify-center mb-3">
              <Trash2 className="w-5 h-5" />
            </div>
            <h4 className="font-bold text-sm text-zinc-900 mb-1">Hapus & Kosongkan Database?</h4>
            <p className="text-xs text-zinc-500 mb-4 leading-relaxed">
              Tindakan ini akan <strong>menghapus seluruh data aset, riwayat rotasi, periode tutup, dan catatan pendapatan</strong> dari database.
              Master lokasi (103 cabang) dan master kategori aset akan tetap disimpan agar Anda dapat menginput data baru secara bersih.
            </p>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowClearConfirm(false)}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold text-zinc-600 hover:bg-zinc-100 cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={() => {
                  clearDatabase();
                  setShowClearConfirm(false);
                }}
                className="px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-red-600 text-white hover:bg-red-700 cursor-pointer shadow-xs transition"
              >
                Ya, Hapus Database Sekarang
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* MODAL 4: LOGOUT CONFIRMATION */}
      {/* ------------------------------------------------------------- */}
      {showLogoutConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-white rounded-xl shadow-xl max-w-sm w-full p-5 border border-zinc-200 animate-in fade-in zoom-in-95 duration-150">
            <h4 className="font-bold text-sm text-zinc-900 mb-1">Konfirmasi Keluar</h4>
            <p className="text-xs text-zinc-500 mb-4">
              Apakah Anda yakin ingin keluar dari sesi Akunting Pusat Game Master?
            </p>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowLogoutConfirm(false)}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold text-zinc-600 hover:bg-zinc-100 cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowLogoutConfirm(false);
                  if (onLogout) {
                    onLogout();
                  } else {
                    window.location.reload();
                  }
                }}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-red-600 text-white hover:bg-red-700 cursor-pointer"
              >
                Keluar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

