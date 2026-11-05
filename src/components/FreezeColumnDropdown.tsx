import React, { useState, useRef, useEffect } from 'react';
import { Snowflake, ChevronDown, Check } from 'lucide-react';

export interface FreezeOption {
  id: string; // e.g. '1-6', '1-15', 'none', '1-3', '1-5'
  label: string; // e.g. 'Freeze Kolom 1-6', 'Tidak Freeze'
  description?: string;
}

interface FreezeColumnDropdownProps {
  value: string;
  options: FreezeOption[];
  onChange: (val: string) => void;
  className?: string;
}

export const FreezeColumnDropdown: React.FC<FreezeColumnDropdownProps> = ({
  value,
  options,
  onChange,
  className = '',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement | null>(null);

  const isActive = value !== 'none';
  const currentOption = options.find((o) => o.id === value);

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

  return (
    <div className={`relative inline-block text-left ${className}`} ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        title={isActive ? `Freeze Kolom Aktif: ${currentOption?.label || value}` : 'Freeze Kolom (Tidak Aktif)'}
        aria-haspopup="true"
        aria-expanded={isOpen}
        className={`inline-flex items-center gap-1 h-7 px-2.5 rounded-lg border text-[11px] font-semibold whitespace-nowrap transition cursor-pointer select-none ${
          isActive
            ? 'bg-blue-600 text-white border-blue-600 hover:bg-blue-700 shadow-xs'
            : 'bg-zinc-100 text-zinc-600 border-zinc-300 hover:bg-zinc-200'
        }`}
      >
        <Snowflake className={`w-3 h-3 ${isActive ? 'text-white' : 'text-zinc-500'}`} />
        <span>Freeze Kolom</span>
        <ChevronDown className={`w-3 h-3 transition-transform duration-150 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-1 w-52 bg-white rounded-lg shadow-xl border border-zinc-200 py-1 z-50 animate-in fade-in zoom-in-95 duration-100">
          <div className="px-2.5 py-1 text-[10px] font-bold text-zinc-400 uppercase tracking-wider border-b border-zinc-100 mb-1">
            Pilihan Freeze Kolom
          </div>
          {options.map((opt) => {
            const isSelected = opt.id === value;
            return (
              <button
                key={opt.id}
                type="button"
                onClick={() => {
                  onChange(opt.id);
                  setIsOpen(false);
                }}
                className={`w-full text-left px-3 py-1.5 text-xs flex items-center justify-between transition cursor-pointer ${
                  isSelected
                    ? 'bg-blue-50 text-blue-700 font-bold'
                    : 'text-zinc-700 hover:bg-zinc-100'
                }`}
              >
                <span>{opt.label}</span>
                {isSelected && <Check className="w-3.5 h-3.5 text-blue-600 shrink-0" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};
