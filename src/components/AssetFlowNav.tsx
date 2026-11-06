import React from 'react';
import { useAssets } from '../context/AssetContext';
import { UserAccount } from '../views/ViewPengaturan';

export type AssetTab =
  | 'data-rinci'
  | 'laporan-rotasi'
  | 'rekap-lokasi'
  | 'aktivitas'
  | 'info-perpindahan'
  | 'master'
  | 'pendapatan-mesin'
  | 'pengaturan';

interface AssetFlowNavProps {
  currentTab: AssetTab;
  onChangeTab: (tab: AssetTab) => void;
  currentUser?: UserAccount | null;
}

const TAB_TO_MENU_ID: Record<AssetTab, string> = {
  'data-rinci': 'menu-1',
  'laporan-rotasi': 'menu-2',
  'rekap-lokasi': 'menu-3',
  'aktivitas': 'menu-4',
  'info-perpindahan': 'menu-5',
  'master': 'menu-6',
  'pendapatan-mesin': 'menu-7',
  'pengaturan': 'menu-8',
};

const TABS: { id: AssetTab; label: string }[] = [
  { id: 'data-rinci', label: '1. DATA RINCI ASET' },
  { id: 'laporan-rotasi', label: '2. LAPORAN ROTASI' },
  { id: 'rekap-lokasi', label: '3. REKAP JUMLAH ASET LOKASI' },
  { id: 'aktivitas', label: '4. AKTIVITAS' },
  { id: 'info-perpindahan', label: '5. INFO PERPINDAHAN ASET' },
  { id: 'master', label: '6. MASTER' },
  { id: 'pendapatan-mesin', label: '7. PENDAPATAN MESIN' },
  { id: 'pengaturan', label: '8. PENGATURAN' },
];

export const AssetFlowNav: React.FC<AssetFlowNavProps> = ({ currentTab, onChangeTab, currentUser }) => {
  const { isSuperAdmin, hasMenuAccess } = useAssets();

  const canAccessPengaturan = React.useMemo(() => {
    if (!currentUser) return false;
    if (isSuperAdmin || currentUser.akses === 'ADMIN' || currentUser.akses === 'ADMINISTRATOR') return true;
    const allowed = currentUser.menuAkses || [];
    // Menu 8 tetap tampil untuk akun REGIONAL MANAGER, SUPERVISOR, atau user yang diberi akses menu 8 / 8.2
    return (
      allowed.includes('menu-8') ||
      allowed.includes('menu-8.2') ||
      allowed.includes('menu-8.1') ||
      allowed.includes('menu-8.3')
    );
  }, [currentUser, isSuperAdmin]);

  const visibleTabs = React.useMemo(() => {
    let filtered = TABS;
    if (!canAccessPengaturan) {
      filtered = filtered.filter((tab) => tab.id !== 'pengaturan');
    }

    if (!currentUser || currentUser.akses === 'ADMIN' || currentUser.akses === 'ADMINISTRATOR') {
      return filtered;
    }
    return filtered.filter((tab) => {
      if (tab.id === 'pengaturan') {
        return canAccessPengaturan;
      }
      return hasMenuAccess(TAB_TO_MENU_ID[tab.id]);
    });
  }, [currentUser, canAccessPengaturan, hasMenuAccess]);

  return (
    <div className="shrink-0 z-20 bg-white border-b border-zinc-200 transition-shadow shadow-xs">
      <div className="px-4 md:px-6 py-2 flex items-center justify-start">
        {/* 8 Horizontal Nav Buttons */}
        <div className="min-w-0 w-full overflow-x-auto scrollbar-thin">
          <div className="inline-flex flex-nowrap whitespace-nowrap p-0.5 rounded-full bg-zinc-100 gap-1 min-w-max border border-zinc-200/60">
            {visibleTabs.map((tab) => {
              const isActive = currentTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => onChangeTab(tab.id)}
                  className={`px-3 py-1.5 rounded-full text-[10px] md:text-[11px] font-semibold uppercase tracking-wide transition border cursor-pointer ${
                    isActive
                      ? 'bg-indigo-600 text-white border-indigo-400 shadow-sm'
                      : 'border-transparent text-zinc-600 hover:text-zinc-900 hover:bg-zinc-200/50'
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
