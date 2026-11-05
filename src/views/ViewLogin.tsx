import React, { useState } from 'react';
import { Lock, User, Eye, EyeOff, ArrowRight, ShieldCheck } from 'lucide-react';
import { UserAccount, MENU_ITEMS, TOMBOL_ITEMS, KOLOM_ITEMS } from './ViewPengaturan';
import { MASTER_CATEGORIES } from '../types/asset';

const STORAGE_USERS_KEY = 'gm_users_account';

interface ViewLoginProps {
  onLoginSuccess: (user: UserAccount) => void;
}

export const ViewLogin: React.FC<ViewLoginProps> = ({ onLoginSuccess }) => {
  const [username, setUsername] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);

  const getAccounts = (): UserAccount[] => {
    const defaultAdmin: UserAccount = {
      fid: 'usr_admin_default_01',
      namaUser: 'ADMIN',
      password: '@set825',
      akses: 'ADMINISTRATOR',
      isSuperAdmin: true,
      aksesAllLokasi: true,
      menuAkses: MENU_ITEMS.map((m) => m.id),
      tombolAkses: TOMBOL_ITEMS.map((t) => t.id),
      kolomAkses: KOLOM_ITEMS.map((k) => k.id),
      kategoriAkses: [...MASTER_CATEGORIES],
      lokasiAkses: [],
      createdAt: new Date().toLocaleDateString('id-ID'),
    };

    try {
      const saved = localStorage.getItem(STORAGE_USERS_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          // Permanently purge any user_kpst
          const cleaned = parsed.filter(
            (acc: UserAccount) => acc.namaUser && acc.namaUser.toLowerCase() !== 'user_kpst'
          );

          const updated = cleaned.map((acc: UserAccount) => {
            if (acc.namaUser?.toLowerCase() === 'admin' || acc.fid === 'usr_admin_default_01') {
              return {
                ...acc,
                namaUser: 'ADMIN',
                password: '@set825',
                isSuperAdmin: true,
                aksesAllLokasi: true,
              };
            }
            return acc;
          });

          if (updated.length > 0) {
            localStorage.setItem(STORAGE_USERS_KEY, JSON.stringify(updated));
            return updated;
          }
        }
      }
    } catch {
      // ignore
    }

    try {
      localStorage.setItem(STORAGE_USERS_KEY, JSON.stringify([defaultAdmin]));
    } catch {
      // ignore
    }
    return [defaultAdmin];
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    const cleanUser = username.trim();
    if (!cleanUser) {
      setErrorMsg('Masukkan Nama User!');
      return;
    }
    if (!password) {
      setErrorMsg('Masukkan Password!');
      return;
    }

    setLoading(true);

    setTimeout(() => {
      const accounts = getAccounts();
      const matched = accounts.find(
        (acc) =>
          acc.namaUser.toLowerCase() === cleanUser.toLowerCase() &&
          acc.password === password
      );

      if (matched) {
        onLoginSuccess(matched);
      } else {
        setErrorMsg('Nama user atau password salah! Silakan periksa kembali.');
        setLoading(false);
      }
    }, 250);
  };

  return (
    <div className="min-h-screen bg-[#f3f4f8] flex flex-col justify-center items-center p-4 selection:bg-indigo-500/25">
      {/* Background Subtle Gradient Accents */}
      <div className="absolute inset-0 bg-radial from-indigo-100/50 via-transparent to-transparent pointer-events-none" />

      <div className="w-full max-w-md relative z-10">
        {/* Login Card */}
        <div className="bg-white border border-zinc-200/80 rounded-2xl shadow-xl shadow-zinc-200/50 p-6 md:p-8">
          <div className="mb-5 pb-4 border-b border-zinc-100 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 shrink-0 rounded-xl bg-indigo-600 flex items-center justify-center text-white font-bold text-sm shadow-xs">
                A
              </div>
              <div className="min-w-0 flex items-center">
                <span className="font-extrabold text-[15.5px] text-zinc-900 tracking-wide truncate leading-none">
                  ASSETFLOW • GAME MASTER
                </span>
              </div>
            </div>
            <div className="hidden sm:flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              <span>Login</span>
            </div>
          </div>

          {errorMsg && (
            <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700 font-medium flex items-start gap-2 animate-in fade-in">
              <span className="font-bold text-red-600">!</span>
              <span>{errorMsg}</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            {/* Nama User */}
            <div>
              <label className="text-[11px] font-semibold text-zinc-700 block uppercase tracking-wider mb-1.5">
                Nama User / ID
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Masukan Akun/Id"
                  autoFocus
                  className="w-full h-10 pl-9 pr-3 rounded-xl border border-zinc-300 bg-white text-xs font-semibold text-zinc-900 placeholder:text-zinc-400 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 outline-hidden transition"
                  required
                />
                <User className="w-4 h-4 text-zinc-400 absolute left-3 top-3" />
              </div>
            </div>

            {/* Password */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-[11px] font-semibold text-zinc-700 block uppercase tracking-wider">
                  Password
                </label>
                <button
                  type="button"
                  onClick={() => setShowPassword((p) => !p)}
                  className="text-[11px] text-indigo-600 hover:underline flex items-center gap-1 cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  {showPassword ? 'Sembunyikan' : 'Lihat'}
                </button>
              </div>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Masukkan password..."
                  className="w-full h-10 pl-9 pr-3 rounded-xl border border-zinc-300 bg-white text-xs font-mono text-zinc-900 placeholder:text-zinc-400 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 outline-hidden transition"
                  required
                />
                <Lock className="w-4 h-4 text-zinc-400 absolute left-3 top-3" />
              </div>
            </div>

            {/* Tombol Masuk */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={loading}
                className="w-full h-10 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition shadow-md shadow-indigo-600/20 cursor-pointer disabled:opacity-60"
              >
                {loading ? (
                  <span>Memverifikasi...</span>
                ) : (
                  <>
                    <span>Masuk ke Akun</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </form>

          {/* Lupa Password Notice */}
          <div className="mt-5 pt-4 border-t border-zinc-100 text-center">
            <p className="text-xs text-zinc-500 font-medium">
              Lupa password? <span className="font-semibold text-zinc-800">Hubungi Akunting!</span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
