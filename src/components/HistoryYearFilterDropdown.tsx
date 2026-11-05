import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, CheckSquare, Square, RotateCcw, Check } from 'lucide-react';

export const ALL_HISTORY_YEARS = ['2026', '2025', '2024', '2023', '2022', '2021', '2020'];

interface HistoryYearFilterDropdownProps {
  selectedYears: string[];
  onChangeYears: (years: string[]) => void;
  className?: string;
}

export const HistoryYearFilterDropdown: React.FC<HistoryYearFilterDropdownProps> = ({
  selectedYears,
  onChangeYears,
  className = '',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [tempSelected, setTempSelected] = useState<string[]>(selectedYears);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Sync tempSelected whenever selectedYears changes or dropdown opens
  useEffect(() => {
    setTempSelected(selectedYears);
  }, [selectedYears, isOpen]);

  // Handle outside click to close dropdown and apply changes
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        if (isOpen) {
          if (tempSelected.length > 0) {
            onChangeYears(tempSelected);
          }
          setIsOpen(false);
        }
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, tempSelected, onChangeYears]);

  const isAllSelected = ALL_HISTORY_YEARS.every((y) => tempSelected.includes(y));

  const toggleSelectAll = () => {
    if (isAllSelected) {
      // Keep at least current year or deselect
      setTempSelected([]);
    } else {
      setTempSelected([...ALL_HISTORY_YEARS]);
    }
  };

  const toggleYear = (year: string) => {
    if (tempSelected.includes(year)) {
      setTempSelected(tempSelected.filter((y) => y !== year));
    } else {
      setTempSelected([...tempSelected, year]);
    }
  };

  const handleApply = () => {
    if (tempSelected.length === 0) {
      // Default fallback if nothing selected: select all
      onChangeYears([...ALL_HISTORY_YEARS]);
    } else {
      onChangeYears(tempSelected);
    }
    setIsOpen(false);
  };

  const handleReset = () => {
    setTempSelected([...ALL_HISTORY_YEARS]);
    onChangeYears([...ALL_HISTORY_YEARS]);
  };

  // Compute dynamic button label based on currently active selectedYears
  const getButtonLabel = () => {
    const isFull = ALL_HISTORY_YEARS.every((y) => selectedYears.includes(y));
    if (isFull || selectedYears.length === 0) {
      return 'SEMUA TAHUN';
    }
    if (selectedYears.length === 1) {
      return selectedYears[0];
    }
    if (selectedYears.length === 2) {
      const sorted = [...selectedYears].sort((a, b) => b.localeCompare(a));
      return `${sorted[0]}, ${sorted[1]}`;
    }
    return `${selectedYears.length} Tahun Terpilih`;
  };

  return (
    <div ref={dropdownRef} className={`relative inline-block ${className}`}>
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className={`h-9 px-3 rounded-lg border text-xs font-semibold flex items-center justify-between gap-2 shadow-xs transition cursor-pointer select-none ${
          isOpen
            ? 'bg-white border-indigo-600 ring-2 ring-indigo-500/20 text-indigo-950'
            : 'bg-white border-zinc-300 text-zinc-800 hover:bg-zinc-50'
        }`}
        title="Filter Tahun Histori Lokasi"
      >
        <span className="truncate max-w-[140px] text-left">{getButtonLabel()}</span>
        <ChevronDown
          className={`w-3.5 h-3.5 text-zinc-500 transition-transform duration-200 shrink-0 ${
            isOpen ? 'rotate-180 text-indigo-600' : ''
          }`}
        />
      </button>

      {/* Dropdown Panel */}
      {isOpen && (
        <div className="absolute left-0 sm:left-auto sm:right-0 top-full mt-1.5 w-56 bg-white border border-zinc-200 rounded-xl shadow-xl z-50 p-2.5 text-xs animate-in fade-in zoom-in-95 duration-100">
          {/* Header Select All */}
          <div
            onClick={toggleSelectAll}
            className="flex items-center justify-between p-2 rounded-lg hover:bg-indigo-50/70 cursor-pointer text-zinc-900 font-bold transition select-none"
          >
            <div className="flex items-center gap-2">
              {isAllSelected ? (
                <CheckSquare className="w-4 h-4 text-indigo-600 shrink-0" />
              ) : (
                <Square className="w-4 h-4 text-zinc-400 shrink-0" />
              )}
              <span className="tracking-wide">SEMUA TAHUN</span>
            </div>
            <span className="text-[10px] text-zinc-400 font-mono font-normal">
              ({ALL_HISTORY_YEARS.length})
            </span>
          </div>

          {/* Divider */}
          <div className="my-1.5 border-t border-zinc-200" />

          {/* Year Checklist List (2026 down to 2020) */}
          <div className="space-y-0.5 max-h-56 overflow-y-auto scrollbar-thin py-0.5">
            {ALL_HISTORY_YEARS.map((yr) => {
              const isChecked = tempSelected.includes(yr);
              return (
                <div
                  key={yr}
                  onClick={() => toggleYear(yr)}
                  className={`flex items-center justify-between px-2.5 py-1.5 rounded-md cursor-pointer transition select-none ${
                    isChecked
                      ? 'bg-indigo-50/60 text-indigo-900 font-semibold'
                      : 'hover:bg-zinc-100 text-zinc-700'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    {isChecked ? (
                      <CheckSquare className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                    ) : (
                      <Square className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                    )}
                    <span>{yr}</span>
                  </div>
                  {isChecked && (
                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-600 shrink-0" />
                  )}
                </div>
              );
            })}
          </div>

          {/* Divider */}
          <div className="my-1.5 border-t border-zinc-200" />

          {/* Action Buttons: Reset & Terapkan */}
          <div className="flex items-center justify-between pt-1 gap-2">
            <button
              type="button"
              onClick={handleReset}
              className="px-2.5 py-1 rounded-md text-[11px] font-medium text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100 flex items-center gap-1 transition cursor-pointer"
            >
              <RotateCcw className="w-3 h-3" />
              Reset
            </button>

            <button
              type="button"
              onClick={handleApply}
              className="px-3 py-1 rounded-md text-[11px] font-bold bg-indigo-600 hover:bg-indigo-700 text-white flex items-center gap-1 transition cursor-pointer shadow-xs"
            >
              <Check className="w-3 h-3" />
              Terapkan
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
