import React from 'react';
import { Gamepad2, ClipboardList, ChevronRight, ChevronLeft, Gamepad } from 'lucide-react';

interface SidebarProps {
  currentMainView: 'accounting' | 'machines';
  onChangeMainView: (view: 'accounting' | 'machines') => void;
  expanded: boolean;
  onToggleExpanded: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentMainView,
  onChangeMainView,
  expanded,
  onToggleExpanded,
}) => {
  return (
    <aside
      className={`hidden lg:flex lg:flex-col shrink-0 border-r border-zinc-200 bg-white h-screen sticky top-0 transition-[width] duration-200 z-40 select-none ${
        expanded ? 'w-56' : 'w-16'
      }`}
    >
      {/* Brand Header */}
      <div className={`h-16 flex items-center border-b border-zinc-200 ${expanded ? 'px-4 justify-between' : 'justify-center px-0'}`}>
        <div className="flex items-center gap-2.5">
          <div className="h-9 w-9 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center shrink-0 shadow-xs">
            <Gamepad className="h-5 w-5 text-indigo-600" />
          </div>
          {expanded && (
            <div className="min-w-0 leading-tight">
              <span className="font-bold text-xs text-zinc-900 block truncate">GAME MASTER</span>
              <span className="text-[10px] text-zinc-400 font-medium">Ops & Finance</span>
            </div>
          )}
        </div>
      </div>

      {/* Main Nav */}
      <nav className="flex-1 overflow-y-auto py-4 space-y-1 scrollbar-thin px-2">
        <button
          type="button"
          onClick={() => onChangeMainView('machines')}
          className={`w-full flex items-center rounded-xl py-2.5 text-sm font-medium transition-colors ${
            expanded ? 'px-3 gap-3 justify-start' : 'justify-center px-0'
          } ${
            currentMainView === 'machines'
              ? 'bg-indigo-50 text-indigo-700 font-semibold shadow-xs'
              : 'text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900'
          }`}
          title="Mesin"
          aria-label="Mesin"
        >
          <Gamepad2 className="h-4.5 w-4.5 shrink-0" />
          {expanded && <span className="text-xs truncate">Katalog Mesin</span>}
        </button>

        <button
          type="button"
          onClick={() => onChangeMainView('accounting')}
          className={`w-full flex items-center rounded-xl py-2.5 text-sm font-medium transition-colors ${
            expanded ? 'px-3 gap-3 justify-start' : 'justify-center px-0'
          } ${
            currentMainView === 'accounting'
              ? 'bg-indigo-600 text-white font-semibold shadow-sm'
              : 'text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900'
          }`}
          title="Laporan Akuntansi"
          aria-label="Laporan Akuntansi"
        >
          <ClipboardList className="h-4.5 w-4.5 shrink-0" />
          {expanded && <span className="text-xs truncate">Laporan Akuntansi</span>}
        </button>
      </nav>

      {/* Footer Toggle */}
      <button
        type="button"
        onClick={onToggleExpanded}
        title={expanded ? 'Kecilkan menu' : 'Lebarkan menu'}
        aria-label={expanded ? 'Kecilkan menu' : 'Lebarkan menu'}
        className={`h-12 border-t border-zinc-200 flex items-center text-zinc-500 hover:text-zinc-900 hover:bg-zinc-50 transition-colors ${
          expanded ? 'px-4 justify-between' : 'justify-center px-0'
        }`}
      >
        {expanded && <span className="text-xs font-medium">Tutup Menu</span>}
        {expanded ? <ChevronLeft className="h-4.5 w-4.5" /> : <ChevronRight className="h-4.5 w-4.5" />}
      </button>
    </aside>
  );
};
