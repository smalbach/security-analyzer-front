import { useState, type ReactNode } from 'react';
import { cn } from '../../lib/cn';
import { PageSizeSelector } from './PageSizeSelector';

interface Column<T> {
  key: string;
  header: string;
  render: (row: T, index: number) => ReactNode;
  headerClassName?: string;
  cellClassName?: string;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  keyExtractor: (row: T) => string;
  pageSize?: number;
  emptyMessage?: string;
  title?: string;
  subtitle?: string;
  actions?: ReactNode;
  className?: string;
}

export function DataTable<T>({
  columns,
  data,
  keyExtractor,
  pageSize = 5,
  emptyMessage = 'No data available',
  title,
  subtitle,
  actions,
  className,
}: DataTableProps<T>) {
  const [page, setPage] = useState(1);
  const [currentPageSize, setCurrentPageSize] = useState(pageSize);
  const totalPages = Math.ceil(data.length / currentPageSize);
  const items = data.slice((page - 1) * currentPageSize, page * currentPageSize);

  const handlePageSizeChange = (size: number) => {
    setCurrentPageSize(size);
    setPage(1);
  };

  return (
    <div className={cn('dash-card', className)}>
      {(title || actions) && (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            {title && <h3 className="text-sm font-semibold">{title}</h3>}
            {subtitle && <p className="mt-0.5 text-xs text-slate-500">{subtitle}</p>}
          </div>
          {actions && <div className="flex gap-2">{actions}</div>}
        </div>
      )}

      {data.length === 0 ? (
        <p className="mt-6 py-8 text-center text-sm text-slate-500">{emptyMessage}</p>
      ) : (
        <>
          <div className={cn('overflow-x-auto', (title || actions) ? 'mt-4' : undefined)}>
            <table className="dash-table w-full">
              <thead>
                <tr className="text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                  {columns.map((col) => (
                    <th key={col.key} className={cn('pb-3 pr-4', col.headerClassName)}>
                      {col.header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {items.map((row, rowIdx) => (
                  <tr key={keyExtractor(row)} className="dash-table-row">
                    {columns.map((col) => (
                      <td key={col.key} className={cn('py-3 pr-4', col.cellClassName)}>
                        {col.render(row, rowIdx)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="mt-4 flex items-center justify-between text-xs text-slate-500">
              <div className="flex items-center gap-4">
                <span>
                  Showing {(page - 1) * currentPageSize + 1} to {Math.min(page * currentPageSize, data.length)} of{' '}
                  {data.length}
                </span>
                <PageSizeSelector value={currentPageSize} onChange={handlePageSizeChange} />
              </div>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="dash-page-btn"
                >
                  &lt;
                </button>
                {Array.from({ length: totalPages }, (_, i) => (
                  <button
                    key={i + 1}
                    type="button"
                    onClick={() => setPage(i + 1)}
                    className={cn('dash-page-btn', page === i + 1 && 'dash-page-btn-active')}
                  >
                    {i + 1}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="dash-page-btn"
                >
                  &gt;
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
