import React, { useState, useRef, useEffect, useMemo } from 'react';
import { AssetTypeItem } from '../types/asset';
import { ChevronDown, Search, X, Tag } from 'lucide-react';

interface MultiSpecificTypeFilterProps {
  types: AssetTypeItem[];
  selectedTypes: string[]; // ['ALL'] or list of codes e.g. ['MEC', 'RED']
  onChange: (selected: string[]) => void;
  label?: string;
  className?: string;
  disabled?: boolean;
  assetCountsByType?: Record<string, number>;
}

export const MultiSpecificTypeFilter: React.FC<MultiSpecificTypeFilterProps> = ({
  types,
  selectedTypes,
  onChange,
  label,
  className = '',
  disabled = false,
  assetCountsByType,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const isAllSelected = useMemo(() => {
    return (
      selectedTypes.includes('ALL') ||
      (types.length > 0 && selectedTypes.length === types.length)
    );
  }, [selectedTypes, types.length]);

  const isNoneSelected = useMemo(() => {
    return selectedTypes.length === 0;
  }, [selectedTypes]);

  const effectiveSelected = useMemo(() => {
    if (isAllSelected) {
      return types.map((t) => t.code);
    }
    if (isNoneSelected) {
      return [];
    }
    return selectedTypes.filter((c) => c !== 'ALL');
  }, [isAllSelected, isNoneSelected, selectedTypes, types]);

  const filteredTypes = useMemo(() => {
    if (!searchTerm.trim()) return types;
    const q = searchTerm.toLowerCase().trim();
    return types.filter(
      (t) =>
        t.code.toLowerCase().includes(q) ||
        t.name.toLowerCase().includes(q) ||
        (t.category && t.category.toLowerCase().includes(q))
    );
  }, [types, searchTerm]);

  const handleToggleSelectAll = () => {
    if (isAllSelected) {
      onChange([]);
    } else {
      onChange(['ALL']);
    }
  };

  const handleToggleType = (code: string) => {
    if (isAllSelected) {
      const remaining = types.map((t) => t.code).filter((c) => c !== code);
      onChange(remaining);
    } else if (isNoneSelected) {
      onChange([code]);
    } else {
      let updated: string[];
      if (effectiveSelected.includes(code)) {
        updated = effectiveSelected.filter((c) => c !== code);
      } else {
        updated = [...effectiveSelected, code];
      }
      if (types.length > 0 && updated.length === types.length) {
        onChange(['ALL']);
      } else {
        onChange(updated);
      }
    }
  };

  // Button title label
  const buttonLabel = useMemo(() => {
    if (types.length === 0) {
      return 'Tidak ada jenis';
    }
    if (isNoneSelected) {
      return 'Pilih Jenis (0 Terpilih)';
    }
    if (isAllSelected) {
      return `SEMUA JENIS (${types.length})`;
    }
    if (effectiveSelected.length === 1) {
      const t = types.find((item) => item.code === effectiveSelected[0]);
      const count = t ? assetCountsByType?.[t.code] : undefined;
      const countText = count !== undefined ? ` (${count})` : '';
      return t ? `${t.code} - ${t.name}${countText}` : effectiveSelected[0];
    }
    if (effectiveSelected.length <= 2) {
      return `${effectiveSelected.join(', ')} (${effectiveSelected.length} Jenis)`;
    }
    return `${effectiveSelected.length} Jenis Terpilih`;
  }, [types, isNoneSelected, isAllSelected, effectiveSelected, assetCountsByType]);

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      {label && (
        <label className="text-[11px] font-semibold text-zinc-500 block uppercase tracking-wider mb-1">
          {label}
        </label>
      )}

      {/* Dropdown Toggle Button */}
      <button
        type="button"
        disabled={disabled || types.length === 0}
        onClick={() => setIsOpen((prev) => !prev)}
        className={`h-8 px-2.5 rounded-lg border text-xs flex items-center justify-between gap-2 transition ${
          disabled || types.length === 0
            ? 'bg-zinc-100/90 border-zinc-300 text-zinc-500 cursor-not-allowed shadow-none'
            : 'bg-white border-zinc-300 text-zinc-900 hover:border-zinc-400 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 cursor-pointer shadow-xs'
        }`}
        title="Filter Jenis Spesifik (Checkbox Multi-Pilih)"
      >
        <span className="truncate font-semibold flex items-center gap-1.5 text-zinc-800">
          <Tag className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
          <span className="truncate max-w-[190px]">{buttonLabel}</span>
        </span>
        <ChevronDown
          className={`w-3.5 h-3.5 text-zinc-500 shrink-0 transition-transform ${
            isOpen ? 'rotate-180' : ''
          }`}
        />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute right-0 sm:right-0 mt-1 w-80 max-w-[90vw] bg-white border border-zinc-200 rounded-xl shadow-xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-100">
          {/* Search Header */}
          <div className="p-2 border-b border-zinc-100 bg-zinc-50/70">
            <div className="relative">
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Cari kode / nama jenis spesifik..."
                className="w-full h-8 pl-7 pr-3 bg-white border border-zinc-200 rounded-lg text-xs outline-hidden focus:border-indigo-500"
                autoFocus
              />
              <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-2 top-2.5" />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm('')}
                  className="absolute right-2 top-2 text-zinc-400 hover:text-zinc-600 cursor-pointer"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>

            {/* Quick Actions */}
            <div className="flex items-center justify-between pt-2 px-1 text-[11px]">
              <label className="flex items-center gap-1.5 cursor-pointer font-bold text-zinc-700 select-none">
                <input
                  type="checkbox"
                  checked={isAllSelected}
                  onChange={handleToggleSelectAll}
                  className="rounded text-indigo-600 focus:ring-indigo-500 w-3.5 h-3.5 cursor-pointer"
                />
                <span>Pilih Semua ({types.length})</span>
              </label>

              <button
                type="button"
                onClick={() => onChange([])}
                className="text-rose-600 hover:text-rose-700 font-semibold cursor-pointer"
              >
                Kosongkan
              </button>
            </div>
          </div>

          {/* Type Checkbox List */}
          <div className="max-h-64 overflow-y-auto p-1.5 space-y-0.5 divide-y divide-zinc-50 scrollbar-thin">
            {filteredTypes.length === 0 ? (
              <div className="p-3 text-center text-xs text-zinc-400">
                Jenis spesifik tidak ditemukan
              </div>
            ) : (
              filteredTypes.map((t) => {
                const isChecked =
                  !isNoneSelected && (isAllSelected || effectiveSelected.includes(t.code));
                const count = assetCountsByType?.[t.code];

                return (
                  <label
                    key={t.code}
                    className="flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg hover:bg-indigo-50/60 cursor-pointer text-xs transition select-none"
                  >
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => handleToggleType(t.code)}
                      className="rounded text-indigo-600 focus:ring-indigo-500 w-3.5 h-3.5 shrink-0 cursor-pointer"
                    />
                    <span className="font-mono font-bold text-indigo-900 bg-indigo-50/80 px-1.5 py-0.5 rounded text-[11px] shrink-0 border border-indigo-100">
                      {t.code}
                    </span>
                    <span className="text-zinc-700 truncate flex-1 font-medium">{t.name}</span>
                    {count !== undefined && (
                      <span className="text-[10px] text-zinc-400 font-mono shrink-0 bg-zinc-100 px-1.5 py-0.5 rounded-full">
                        {count} aset
                      </span>
                    )}
                  </label>
                );
              })
            )}
          </div>

          {/* Footer Info */}
          <div className="p-2 border-t border-zinc-100 bg-zinc-50 flex items-center justify-between text-[11px] text-zinc-500">
            <span>
              Terpilih:{' '}
              <strong className="text-indigo-700">
                {isNoneSelected ? 0 : isAllSelected ? types.length : effectiveSelected.length}
              </strong>{' '}
              dari {types.length}
            </span>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-md text-[10px] cursor-pointer shadow-xs"
            >
              Terapkan
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
