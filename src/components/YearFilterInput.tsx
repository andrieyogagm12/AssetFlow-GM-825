import React, { useState, useEffect, useRef } from 'react';

export interface YearFilterInputProps {
  value: string | number;
  onChange: (value: string) => void;
  allowAll?: boolean;
  allLabel?: string;
  compact?: boolean;
  className?: string;
  placeholder?: string;
  title?: string;
  disabled?: boolean;
}

export const YearFilterInput: React.FC<YearFilterInputProps> = ({
  value,
  onChange,
  allowAll = true,
  allLabel = 'SEMUA TAHUN',
  compact = false,
  className = '',
  placeholder = 'Tahun...',
  title = 'Pilihan tahun',
  disabled = false,
}) => {
  const currentStrValue = String(value ?? (allowAll ? 'ALL' : new Date().getFullYear()));

  // Default preset years: 2020 through 2034
  const defaultYears = Array.from({ length: 15 }, (_, i) => String(2020 + i));

  const [isManual, setIsManual] = useState<boolean>(false);
  const [manualInput, setManualInput] = useState<string>(
    currentStrValue === 'ALL' ? '' : currentStrValue
  );
  const inputRef = useRef<HTMLInputElement>(null);

  // Keep manualInput in sync with value
  useEffect(() => {
    if (currentStrValue !== 'ALL') {
      setManualInput(currentStrValue);
    }
  }, [currentStrValue]);

  // Focus input when entering manual mode
  useEffect(() => {
    if (isManual && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isManual]);

  // Build the list of options: include default years plus current custom value if not present
  const availableYears = React.useMemo(() => {
    const set = new Set<string>(defaultYears);
    if (currentStrValue && currentStrValue !== 'ALL' && /^\d+$/.test(currentStrValue)) {
      set.add(currentStrValue);
    }
    return Array.from(set).sort((a, b) => parseInt(a, 10) - parseInt(b, 10));
  }, [defaultYears, currentStrValue]);

  const handleApplyManual = () => {
    const trimmed = manualInput.trim();
    if (!trimmed) {
      if (allowAll) {
        onChange('ALL');
      }
      setIsManual(false);
      return;
    }

    const num = parseInt(trimmed, 10);
    if (!isNaN(num) && num > 1900 && num < 2100) {
      onChange(String(num));
    } else if (trimmed.toUpperCase() === 'ALL' && allowAll) {
      onChange('ALL');
    }
    setIsManual(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleApplyManual();
    } else if (e.key === 'Escape') {
      setIsManual(false);
      setManualInput(currentStrValue === 'ALL' ? '' : currentStrValue);
    }
  };

  const heightClass = compact ? 'h-8 text-xs' : 'h-9 text-xs';
  const padClass = compact ? 'px-1.5 text-center' : 'px-2.5';

  if (isManual) {
    return (
      <div className={`relative ${className}`}>
        <input
          ref={inputRef}
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          value={manualInput}
          onChange={(e) => setManualInput(e.target.value.replace(/[^0-9]/g, ''))}
          onKeyDown={handleKeyDown}
          onBlur={handleApplyManual}
          placeholder={placeholder}
          maxLength={4}
          disabled={disabled}
          className={`w-full bg-white border-2 border-indigo-500 text-zinc-900 rounded-lg ${padClass} font-bold outline-hidden shadow-xs focus:ring-1 focus:ring-indigo-500 ${heightClass}`}
          title="Ketik tahun (contoh: 2018, 2035) lalu tekan Enter"
        />
      </div>
    );
  }

  return (
    <div className={`relative ${className}`}>
      <select
        value={currentStrValue}
        disabled={disabled}
        onChange={(e) => {
          const val = e.target.value;
          if (val === '__MANUAL__') {
            setIsManual(true);
            setManualInput(currentStrValue === 'ALL' ? '' : currentStrValue);
          } else {
            onChange(val);
          }
        }}
        className={`w-full bg-white border border-zinc-300 text-zinc-900 rounded-lg ${padClass} font-semibold focus:ring-1 focus:ring-indigo-500 outline-hidden transition cursor-pointer ${heightClass}`}
        title={title}
      >
        {allowAll && <option value="ALL">{allLabel}</option>}
        {availableYears.map((yr) => (
          <option key={yr} value={yr}>
            {yr} {!defaultYears.includes(yr) ? '(Manual)' : ''}
          </option>
        ))}
        <option value="__MANUAL__">Ketik tahun manual...</option>
      </select>
    </div>
  );
};
