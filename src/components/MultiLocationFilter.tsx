import React, { useState, useRef, useEffect, useMemo } from 'react';
import { LocationItem } from '../types/asset';
import { ChevronDown, Search, Check, X, MapPin } from 'lucide-react';

interface MultiLocationFilterProps {
  locations: LocationItem[];
  selectedLocations: string[]; // ['ALL'] or list of codes e.g. ['BECO', 'CWLK']
  onChange: (selected: string[]) => void;
  label?: string;
  className?: string;
  disabled?: boolean;
  assetCountsByLocation?: Record<string, number>;
}

export const MultiLocationFilter: React.FC<MultiLocationFilterProps> = ({
  locations,
  selectedLocations,
  onChange,
  label = 'LOKASI',
  className = '',
  disabled = false,
  assetCountsByLocation,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);

  // If only 1 location is available, it is effectively locked/restricted
  const isLockedSingleLocation = locations.length === 1 || disabled;

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
      selectedLocations.includes('ALL') ||
      (locations.length > 0 && selectedLocations.length === locations.length)
    );
  }, [selectedLocations, locations.length]);

  const isNoneSelected = useMemo(() => {
    return selectedLocations.length === 0;
  }, [selectedLocations]);

  const effectiveSelected = useMemo(() => {
    if (isAllSelected) {
      return locations.map((l) => l.code);
    }
    if (isNoneSelected) {
      return [];
    }
    return selectedLocations.filter((c) => c !== 'ALL');
  }, [isAllSelected, isNoneSelected, selectedLocations, locations]);

  const filteredLocations = useMemo(() => {
    if (!searchTerm.trim()) return locations;
    const q = searchTerm.toLowerCase().trim();
    return locations.filter(
      (l) => l.code.toLowerCase().includes(q) || l.name.toLowerCase().includes(q)
    );
  }, [locations, searchTerm]);

  const handleToggleSelectAll = () => {
    if (isAllSelected) {
      // Deselect all
      onChange([]);
    } else {
      // Select all
      onChange(['ALL']);
    }
  };

  const handleToggleLocation = (code: string) => {
    if (isAllSelected) {
      // Starting from ALL selected, deselect this one
      const remaining = locations.map((l) => l.code).filter((c) => c !== code);
      onChange(remaining);
    } else if (isNoneSelected) {
      // Starting from none selected, select this one
      onChange([code]);
    } else {
      let updated: string[];
      if (effectiveSelected.includes(code)) {
        updated = effectiveSelected.filter((c) => c !== code);
      } else {
        updated = [...effectiveSelected, code];
      }
      if (locations.length > 0 && updated.length === locations.length) {
        onChange(['ALL']);
      } else {
        onChange(updated);
      }
    }
  };

  // Button title label
  const buttonLabel = useMemo(() => {
    if (locations.length === 1) {
      const loc = locations[0];
      const count = assetCountsByLocation?.[loc.code];
      const countText = count !== undefined ? ` (${count} Aset)` : '';
      return `${loc.code} - ${loc.name}${countText}`;
    }
    if (isNoneSelected) {
      return 'Pilih Lokasi (0 Terpilih)';
    }
    if (isAllSelected) {
      return `SEMUA LOKASI (${locations.length})`;
    }
    if (effectiveSelected.length === 1) {
      const loc = locations.find((l) => l.code === effectiveSelected[0]);
      const count = loc ? assetCountsByLocation?.[loc.code] : undefined;
      const countText = count !== undefined ? ` (${count} Aset)` : '';
      return loc ? `${loc.code} - ${loc.name}${countText}` : effectiveSelected[0];
    }
    if (effectiveSelected.length <= 2) {
      return `${effectiveSelected.join(', ')} (${effectiveSelected.length} Lokasi)`;
    }
    return `${effectiveSelected.length} Lokasi Terpilih`;
  }, [locations, assetCountsByLocation, isNoneSelected, isAllSelected, effectiveSelected]);

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
        disabled={isLockedSingleLocation}
        onClick={() => {
          if (!isLockedSingleLocation) {
            setIsOpen((prev) => !prev);
          }
        }}
        className={`w-full h-9 px-3 rounded-lg border text-xs flex items-center justify-between gap-2 transition ${
          isLockedSingleLocation
            ? 'bg-zinc-100/90 border-zinc-300 text-zinc-700 cursor-not-allowed shadow-none'
            : 'bg-white border-zinc-300 text-zinc-900 hover:border-zinc-400 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 cursor-pointer shadow-xs'
        }`}
        title={
          isLockedSingleLocation
            ? 'Akses lokasi dibatasi oleh akun Anda'
            : 'Pilih lokasi filter'
        }
      >
        <span className="truncate font-semibold flex items-center gap-1.5 text-zinc-800">
          <MapPin className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
          <span className="truncate">{buttonLabel}</span>
        </span>
        {!isLockedSingleLocation ? (
          <ChevronDown
            className={`w-3.5 h-3.5 text-zinc-500 shrink-0 transition-transform ${
              isOpen ? 'rotate-180' : ''
            }`}
          />
        ) : (
          <span className="text-[10px] uppercase font-bold text-zinc-500 bg-zinc-200/80 px-1.5 py-0.5 rounded">
            Terkunci
          </span>
        )}
      </button>

      {/* Dropdown Menu */}
      {!isLockedSingleLocation && isOpen && (
        <div className="absolute left-0 mt-1 w-72 max-w-[90vw] bg-white border border-zinc-200 rounded-xl shadow-xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-100">
          {/* Search Header */}
          <div className="p-2 border-b border-zinc-100 bg-zinc-50/70">
            <div className="relative">
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Cari kode / nama lokasi..."
                className="w-full h-8 pl-7 pr-3 bg-white border border-zinc-200 rounded-lg text-xs outline-hidden focus:border-indigo-500"
                autoFocus
              />
              <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-2 top-2.5" />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm('')}
                  className="absolute right-2 top-2 text-zinc-400 hover:text-zinc-600"
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
                  className="rounded text-indigo-600 focus:ring-indigo-500 w-3.5 h-3.5"
                />
                <span>Pilih Semua ({locations.length})</span>
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

          {/* Location Checkbox List */}
          <div className="max-h-60 overflow-y-auto p-1.5 space-y-0.5 divide-y divide-zinc-50">
            {filteredLocations.length === 0 ? (
              <div className="p-3 text-center text-xs text-zinc-400">
                Lokasi tidak ditemukan
              </div>
            ) : (
              filteredLocations.map((loc) => {
                const isChecked = !isNoneSelected && (isAllSelected || effectiveSelected.includes(loc.code));

                return (
                  <label
                    key={loc.code}
                    className="flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg hover:bg-indigo-50/60 cursor-pointer text-xs transition select-none"
                  >
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => handleToggleLocation(loc.code)}
                      className="rounded text-indigo-600 focus:ring-indigo-500 w-3.5 h-3.5 shrink-0"
                    />
                    <span className="font-mono font-bold text-indigo-950 w-12 shrink-0">
                      {loc.code}
                    </span>
                    <span className="text-zinc-700 truncate flex-1">{loc.name}</span>
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
                {isNoneSelected ? 0 : isAllSelected ? locations.length : effectiveSelected.length}
              </strong>{' '}
              dari {locations.length}
            </span>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-md text-[10px] cursor-pointer"
            >
              Terapkan
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
