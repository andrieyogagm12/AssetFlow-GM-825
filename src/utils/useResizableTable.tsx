import React, { useEffect, useRef, useState, useCallback } from 'react';
import { RotateCcw } from 'lucide-react';

interface UseResizableTableOptions {
  storageKey: string;
  minColWidth?: number;
  minRowHeight?: number;
}

interface SavedTableDimensions {
  colWidths: Record<number, number>; // columnIndex -> width in px
  rowHeights: Record<number, number>; // rowIndex -> height in px
}

export const useResizableTable = ({
  storageKey,
  minColWidth = 40,
  minRowHeight = 32,
}: UseResizableTableOptions) => {
  const tableRef = useRef<HTMLTableElement | null>(null);
  const [hasCustomSizes, setHasCustomSizes] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const parsed: SavedTableDimensions = JSON.parse(saved);
        const hasCols = parsed.colWidths && Object.keys(parsed.colWidths).length > 0;
        const hasRows = parsed.rowHeights && Object.keys(parsed.rowHeights).length > 0;
        return !!(hasCols || hasRows);
      }
    } catch {
      // ignore
    }
    return false;
  });

  const getSavedDimensions = useCallback((): SavedTableDimensions => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch {
      // ignore
    }
    return { colWidths: {}, rowHeights: {} };
  }, [storageKey]);

  const saveDimensions = useCallback(
    (dims: SavedTableDimensions) => {
      try {
        localStorage.setItem(storageKey, JSON.stringify(dims));
        setHasCustomSizes(true);
      } catch {
        // ignore
      }
    },
    [storageKey]
  );

  // Apply saved dimensions to the DOM
  const applySavedDimensions = useCallback(() => {
    const table = tableRef.current;
    if (!table) return;

    const saved = getSavedDimensions();
    const hasCols = saved.colWidths && Object.keys(saved.colWidths).length > 0;

    if (hasCols) {
      table.style.tableLayout = 'fixed';
      // Find the deepest th cells (for multi-level headers or standard single row)
      const headerRows = table.querySelectorAll('thead tr');
      if (headerRows.length > 0) {
        const lastHeaderRow = headerRows[headerRows.length - 1];
        const thElements = lastHeaderRow.querySelectorAll('th');
        let totalW = 0;
        thElements.forEach((th, idx) => {
          const w = saved.colWidths[idx];
          if (w) {
            th.style.width = `${w}px`;
            th.style.minWidth = `${w}px`;
            totalW += w;
          }
        });
        if (totalW > 0) {
          table.style.width = `${totalW}px`;
          table.style.minWidth = `${totalW}px`;
        }
      }
    }

    if (saved.rowHeights) {
      const trElements = table.querySelectorAll('tbody tr');
      trElements.forEach((tr, idx) => {
        const h = saved.rowHeights[idx];
        if (h) {
          (tr as HTMLElement).style.height = `${h}px`;
        }
      });
    }
  }, [getSavedDimensions]);

  // Reset sizes back to default
  const resetSizes = useCallback(() => {
    const table = tableRef.current;
    try {
      localStorage.removeItem(storageKey);
    } catch {
      // ignore
    }
    setHasCustomSizes(false);

    if (table) {
      table.style.tableLayout = '';
      table.style.width = '';
      table.style.minWidth = '';
      const allTh = table.querySelectorAll('thead th');
      allTh.forEach((th) => {
        (th as HTMLElement).style.width = '';
        (th as HTMLElement).style.minWidth = '';
      });
      const allTr = table.querySelectorAll('tbody tr');
      allTr.forEach((tr) => {
        (tr as HTMLElement).style.height = '';
      });
    }
  }, [storageKey]);

  // Attach drag handles and events
  useEffect(() => {
    const table = tableRef.current;
    if (!table) return;

    // Apply any existing saved dimensions
    applySavedDimensions();

    let guideV: HTMLDivElement | null = null;
    let guideH: HTMLDivElement | null = null;

    const getGuideV = () => {
      if (!guideV) {
        guideV = document.createElement('div');
        guideV.className = 'table-resize-guide-v';
        document.body.appendChild(guideV);
      }
      return guideV;
    };

    const getGuideH = () => {
      if (!guideH) {
        guideH = document.createElement('div');
        guideH.className = 'table-resize-guide-h';
        document.body.appendChild(guideH);
      }
      return guideH;
    };

    const removeGuides = () => {
      if (guideV && guideV.parentNode) guideV.parentNode.removeChild(guideV);
      if (guideH && guideH.parentNode) guideH.parentNode.removeChild(guideH);
      guideV = null;
      guideH = null;
    };

    // 1. Column Resizers on TH elements
    const thead = table.querySelector('thead');
    if (thead) {
      // Target the bottom-most header row to correctly resize each data column
      const headerRows = thead.querySelectorAll('tr');
      const targetHeaderRow = headerRows[headerRows.length - 1];
      if (targetHeaderRow) {
        const thList = targetHeaderRow.querySelectorAll('th');

        thList.forEach((th, colIdx) => {
          let resizer = th.querySelector(':scope > .resizer-col') as HTMLDivElement | null;
          if (!resizer) {
            resizer = document.createElement('div');
            resizer.className = 'resizer-col';
            th.appendChild(resizer);
          }

          const onMouseDownCol = (e: MouseEvent) => {
            e.preventDefault();
            e.stopPropagation();

            const startX = e.clientX;
            const startWidth = th.getBoundingClientRect().width;

            // Lock all columns to their exact current rendered width so none shift or resize automatically
            const initialWidths: number[] = [];
            thList.forEach((colTh) => {
              initialWidths.push(Math.round(colTh.getBoundingClientRect().width));
            });

            table.style.tableLayout = 'fixed';
            thList.forEach((colTh, idx) => {
              const w = initialWidths[idx];
              colTh.style.width = `${w}px`;
              colTh.style.minWidth = `${w}px`;
            });

            // Set table width to the exact sum of all columns
            const initialTableWidth = initialWidths.reduce((sum, w) => sum + w, 0);
            table.style.width = `${initialTableWidth}px`;
            table.style.minWidth = `${initialTableWidth}px`;

            th.classList.add('col-being-resized');
            const gV = getGuideV();
            gV.style.left = `${e.clientX}px`;

            document.body.style.cursor = 'col-resize';
            document.body.style.userSelect = 'none';

            let latestWidth = startWidth;

            const onMouseMoveCol = (moveEvt: MouseEvent) => {
              const deltaX = moveEvt.clientX - startX;
              latestWidth = Math.max(minColWidth, startWidth + deltaX);
              const actualDelta = latestWidth - startWidth;

              // Only modify the width of the dragged column
              th.style.width = `${latestWidth}px`;
              th.style.minWidth = `${latestWidth}px`;

              // Update table width by the delta so sibling columns retain their exact widths
              table.style.width = `${initialTableWidth + actualDelta}px`;
              table.style.minWidth = `${initialTableWidth + actualDelta}px`;

              gV.style.left = `${moveEvt.clientX}px`;
            };

            const onMouseUpCol = () => {
              window.removeEventListener('mousemove', onMouseMoveCol);
              window.removeEventListener('mouseup', onMouseUpCol);

              th.classList.remove('col-being-resized');
              removeGuides();
              document.body.style.cursor = '';
              document.body.style.userSelect = '';

              // Persist all column widths
              const currentDims = getSavedDimensions();
              const newColWidths: Record<number, number> = { ...currentDims.colWidths };
              thList.forEach((colTh, idx) => {
                newColWidths[idx] = Math.round(colTh.getBoundingClientRect().width);
              });
              saveDimensions({ ...currentDims, colWidths: newColWidths });
            };

            window.addEventListener('mousemove', onMouseMoveCol);
            window.addEventListener('mouseup', onMouseUpCol);
          };

          resizer.onmousedown = onMouseDownCol;
        });
      }
    }

    // 2. Row Resizers on TBODY TR elements
    const tbody = table.querySelector('tbody');
    if (tbody) {
      const trList = tbody.querySelectorAll('tr');
      trList.forEach((tr, rowIdx) => {
        // Attach row resizer to the first cell or bottom of tr
        const firstCell = tr.querySelector('td');
        if (firstCell) {
          let resizer = firstCell.querySelector(':scope > .resizer-row') as HTMLDivElement | null;
          if (!resizer) {
            resizer = document.createElement('div');
            resizer.className = 'resizer-row';
            firstCell.appendChild(resizer);
          }

          const onMouseDownRow = (e: MouseEvent) => {
            e.preventDefault();
            e.stopPropagation();

            const startY = e.clientY;
            const startHeight = tr.getBoundingClientRect().height;

            tr.classList.add('row-being-resized');
            const gH = getGuideH();
            gH.style.top = `${e.clientY}px`;

            document.body.style.cursor = 'row-resize';
            document.body.style.userSelect = 'none';

            let latestHeight = startHeight;

            const onMouseMoveRow = (moveEvt: MouseEvent) => {
              const deltaY = moveEvt.clientY - startY;
              latestHeight = Math.max(minRowHeight, startHeight + deltaY);
              (tr as HTMLElement).style.height = `${latestHeight}px`;
              gH.style.top = `${moveEvt.clientY}px`;
            };

            const onMouseUpRow = () => {
              window.removeEventListener('mousemove', onMouseMoveRow);
              window.removeEventListener('mouseup', onMouseUpRow);

              tr.classList.remove('row-being-resized');
              removeGuides();
              document.body.style.cursor = '';
              document.body.style.userSelect = '';

              const currentDims = getSavedDimensions();
              const newRowHeights = { ...currentDims.rowHeights, [rowIdx]: Math.round(latestHeight) };
              saveDimensions({ ...currentDims, rowHeights: newRowHeights });
            };

            window.addEventListener('mousemove', onMouseMoveRow);
            window.addEventListener('mouseup', onMouseUpRow);
          };

          resizer.onmousedown = onMouseDownRow;
        }
      });
    }

    return () => {
      removeGuides();
    };
  });

  const ResetButton: React.FC<{ className?: string }> = ({ className = '' }) => (
    <button
      type="button"
      onClick={resetSizes}
      title="Kembalikan ukuran kolom dan baris ke ukuran awal"
      className={`inline-flex items-center gap-1 h-7 px-2.5 rounded-lg border text-[11px] font-semibold whitespace-nowrap transition cursor-pointer ${
        hasCustomSizes
          ? 'border-indigo-300 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 shadow-2xs'
          : 'border-zinc-300 bg-white text-zinc-600 hover:bg-zinc-100'
      } ${className}`}
    >
      <RotateCcw className="w-3 h-3 text-zinc-500" />
      <span>Reset Ukuran</span>
    </button>
  );

  return {
    tableRef,
    resetSizes,
    hasCustomSizes,
    ResetButton,
  };
};
