import React, { useState, useEffect } from 'react';
import { AssetProvider, useAssets } from './context/AssetContext';
import { Header } from './components/Header';
import { AssetFlowNav, AssetTab } from './components/AssetFlowNav';
import { ToastContainer } from './components/ToastContainer';
import { AccessDeniedModal } from './components/AccessDeniedModal';

import { ViewDataRinciAset } from './views/ViewDataRinciAset';
import { ViewLaporanRotasi } from './views/ViewLaporanRotasi';
import { ViewRekapJumlahAset } from './views/ViewRekapJumlahAset';
import { ViewAktivitas } from './views/ViewAktivitas';
import { ViewInfoPerpindahan } from './views/ViewInfoPerpindahan';
import { ViewMaster } from './views/ViewMaster';
import { ViewPendapatanMesin } from './views/ViewPendapatanMesin';
import { ViewMesinDirect } from './views/ViewMesinDirect';
import { ViewPengaturan } from './views/ViewPengaturan';
import { ViewLogin } from './views/ViewLogin';

const TAB_MENU_MAP: Record<AssetTab, string> = {
  'data-rinci': 'menu-1',
  'laporan-rotasi': 'menu-2',
  'rekap-lokasi': 'menu-3',
  'aktivitas': 'menu-4',
  'info-perpindahan': 'menu-5',
  'master': 'menu-6',
  'pendapatan-mesin': 'menu-7',
  'pengaturan': 'menu-8',
};

export default function App() {
  return (
    <AssetProvider>
      <MainApp />
    </AssetProvider>
  );
}

function MainApp() {
  const { currentUser, setCurrentUser, hasMenuAccess, isSuperAdmin, accessDeniedInfo, setAccessDeniedInfo } = useAssets();
  const [mainView, setMainView] = useState<'accounting' | 'machines'>('accounting');
  const [currentTab, setCurrentTab] = useState<AssetTab>('data-rinci');

  // Jump targets for cross-tab actions
  const [aktivitasInitialSubTab, setAktivitasInitialSubTab] = useState<
    'input' | 'edit' | 'hapus' | 'rotasi' | 'tutup'
  >('input');
  const [aktivitasAssetCode, setAktivitasAssetCode] = useState<string>('');
  const [perpindahanAssetCode, setPerpindahanAssetCode] = useState<string>('');

  // Support opening in new tab/page via URL parameters
  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const tabParam = params.get('tab') as AssetTab | null;
      const subParam = params.get('sub') as
        | 'input'
        | 'edit'
        | 'hapus'
        | 'rotasi'
        | 'tutup'
        | null;
      const codeParam = params.get('code');
      const viewParam = params.get('view') as 'accounting' | 'machines' | null;

      if (viewParam) {
        setMainView(viewParam);
      }
      if (tabParam) {
        setMainView('accounting');
        setCurrentTab(tabParam);
      }
      if (subParam) {
        setAktivitasInitialSubTab(subParam);
      }
      if (codeParam) {
        setAktivitasAssetCode(codeParam);
      }
    } catch {
      // ignore
    }
  }, []);

  const navigateToEdit = (assetCode: string) => {
    setMainView('accounting');
    setCurrentTab('aktivitas');
    setAktivitasInitialSubTab('edit');
    setAktivitasAssetCode(assetCode);
  };

  const navigateToRotate = (assetCode: string) => {
    setMainView('accounting');
    setCurrentTab('aktivitas');
    setAktivitasInitialSubTab('rotasi');
    setAktivitasAssetCode(assetCode);
  };

  const navigateToHistory = (assetCode: string) => {
    setMainView('accounting');
    setCurrentTab('info-perpindahan');
    setPerpindahanAssetCode(assetCode);
  };

  const canAccessPengaturan = React.useMemo(() => {
    if (!currentUser) return false;
    if (isSuperAdmin || currentUser.akses === 'ADMIN' || currentUser.akses === 'ADMINISTRATOR') return true;
    const allowed = currentUser.menuAkses || [];
    // Tetap beri akses ke Menu 8 jika akun (termasuk REGIONAL MANAGER & SUPERVISOR) memiliki hak akses menu-8 atau menu-8.2
    return (
      allowed.includes('menu-8') ||
      allowed.includes('menu-8.2') ||
      allowed.includes('menu-8.1') ||
      allowed.includes('menu-8.3')
    );
  }, [currentUser, isSuperAdmin]);

  // Ensure active tab is within user's permitted menus and permissions
  useEffect(() => {
    if (currentUser) {
      if (!canAccessPengaturan && currentTab === 'pengaturan') {
        setCurrentTab('data-rinci');
        return;
      }
      if (currentUser.akses !== 'ADMIN' && currentUser.akses !== 'ADMINISTRATOR') {
        const curMenuId = TAB_MENU_MAP[currentTab];
        const isCurrentAllowed =
          currentTab === 'pengaturan'
            ? canAccessPengaturan
            : hasMenuAccess(curMenuId);

        if (!isCurrentAllowed) {
          const availableTabs = (Object.keys(TAB_MENU_MAP) as AssetTab[]).filter((tab) => {
            if (tab === 'pengaturan') return canAccessPengaturan;
            return hasMenuAccess(TAB_MENU_MAP[tab]);
          });
          if (availableTabs.length > 0 && !availableTabs.includes(currentTab)) {
            setCurrentTab(availableTabs[0]);
          }
        }
      }
    }
  }, [currentUser, currentTab, hasMenuAccess, canAccessPengaturan]);

  if (!currentUser) {
    return (
      <>
        <ViewLogin onLoginSuccess={(user) => setCurrentUser(user)} />
        <ToastContainer />
      </>
    );
  }

  return (
    <div className="h-screen max-h-screen overflow-hidden bg-[#f6f7fb] text-zinc-900 font-sans antialiased selection:bg-indigo-500/25 flex flex-col">
      {/* Top Header (shrink-0 fixed height) */}
      <Header
        currentUser={currentUser}
        onLogout={() => setCurrentUser(null)}
      />

      {/* Conditional View: Katalog Mesin vs AssetFlow Accounting */}
      {mainView === 'machines' ? (
        <main className="flex-1 min-h-0 overflow-auto">
          <ViewMesinDirect
            onBackToAccounting={() => {
              setMainView('accounting');
              setCurrentTab('data-rinci');
            }}
            onNavigateToRotate={navigateToRotate}
          />
        </main>
      ) : (
        <main className="flex-1 min-h-0 flex flex-col overflow-hidden">
          {/* AssetFlow Navigation Tabs Bar (shrink-0) */}
          <AssetFlowNav
            currentTab={currentTab}
            currentUser={currentUser}
            onChangeTab={(tab) => {
              setCurrentTab(tab);
              if (tab !== 'aktivitas') {
                setAktivitasInitialSubTab('input');
                setAktivitasAssetCode('');
              }
            }}
          />

          {/* Views Container: flex-1 min-h-0 to let tables expand to fill screen and stay bounded */}
          <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
            {currentTab === 'data-rinci' && hasMenuAccess('menu-1') && (
              <ViewDataRinciAset
                onNavigateToEdit={navigateToEdit}
                onNavigateToRotate={navigateToRotate}
              />
            )}
            {currentTab === 'laporan-rotasi' && hasMenuAccess('menu-2') && (
              <ViewLaporanRotasi onInspectAssetHistory={navigateToHistory} />
            )}
            {currentTab === 'rekap-lokasi' && hasMenuAccess('menu-3') && <ViewRekapJumlahAset />}
            {currentTab === 'aktivitas' && hasMenuAccess('menu-4') && (
              <ViewAktivitas
                initialSubTab={aktivitasInitialSubTab}
                initialAssetCode={aktivitasAssetCode}
              />
            )}
            {currentTab === 'info-perpindahan' && hasMenuAccess('menu-5') && (
              <ViewInfoPerpindahan initialCode={perpindahanAssetCode} />
            )}
            {currentTab === 'master' && hasMenuAccess('menu-6') && <ViewMaster />}
            {currentTab === 'pendapatan-mesin' && hasMenuAccess('menu-7') && <ViewPendapatanMesin />}
            {currentTab === 'pengaturan' && canAccessPengaturan && (
              <div className="flex-1 min-h-0 overflow-y-auto">
                <ViewPengaturan currentUser={currentUser} />
              </div>
            )}
          </div>
        </main>
      )}

      {/* Access Denied SweetAlert-Style Modal */}
      <AccessDeniedModal
        info={accessDeniedInfo}
        onClose={() => setAccessDeniedInfo(null)}
      />

      {/* Toast Notification Container */}
      <ToastContainer />
    </div>
  );
}
