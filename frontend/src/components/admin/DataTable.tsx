"use client";

import { Search, Pencil, Trash2 } from "lucide-react";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export interface Column<T> {
  key: keyof T | string;
  label: string;
  render?: (row: T) => React.ReactNode;
  className?: string; // applied to <th> and <td>, e.g. "w-32" or "w-48"
}

interface DataTableProps<T> {
  data: T[];
  columns: Column<T>[];
  onAdd?: () => void;
  addLabel?: string;
  onEdit?: (row: T) => void;
  onDelete?: (row: T) => void;
  searchKeys?: (keyof T)[];
}

export function DataTable<T extends { id: number }>({
  data,
  columns,
  onAdd,
  addLabel = "Novo",
  onEdit,
  onDelete,
  searchKeys = [],
}: DataTableProps<T>) {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 7;

  const filtered = search
    ? data.filter((row) =>
        searchKeys.some((key) =>
          String(row[key]).toLowerCase().includes(search.toLowerCase())
        )
      )
    : data;

  const pages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const paged = filtered.slice((page - 1) * pageSize, page * pageSize);

  return (
    <div className="flex flex-col flex-1 rounded-[var(--radius-m)] border border-[var(--border)] bg-[var(--card)] overflow-hidden min-w-0">
      {/* Search + Add */}
      <div className="flex items-center gap-4 px-5 py-4 border-b border-[var(--border)]">
        <div className="relative flex-1 max-w-xs">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted-foreground)]" />
          <Input
            placeholder="Buscar..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="pl-8 h-9 text-sm"
          />
        </div>
        <div className="flex-1" />
        {onAdd && <Button size="sm" onClick={onAdd}>{addLabel}</Button>}
      </div>

      {/* Table */}
      <div className="overflow-x-auto flex-1">
        <table className="w-full border-collapse" style={{ minWidth: 500 }}>
          <thead>
            <tr className="bg-[var(--muted)] border-b border-[var(--border)] h-11">
              {columns.map((col) => (
                <th
                  key={String(col.key)}
                  className={`px-4 text-left text-xs font-mono font-semibold text-[var(--muted-foreground)] uppercase tracking-wide whitespace-nowrap ${col.className ?? ""}`}
                >
                  {col.label}
                </th>
              ))}
              {(onEdit || onDelete) && (
                <th className="px-4 text-right text-xs font-mono font-semibold text-[var(--muted-foreground)] uppercase tracking-wide w-20 whitespace-nowrap">
                  Ações
                </th>
              )}
            </tr>
          </thead>
          <tbody>
            {paged.length === 0 && (
              <tr>
                <td
                  colSpan={columns.length + (onEdit || onDelete ? 1 : 0)}
                  className="text-center py-8 text-sm text-[var(--muted-foreground)]"
                >
                  Nenhum registro encontrado.
                </td>
              </tr>
            )}
            {paged.map((row) => (
              <tr
                key={row.id}
                className="border-b border-[var(--border)] last:border-0 hover:bg-[var(--muted)]/50 transition-colors"
              >
                {columns.map((col) => (
                  <td
                    key={String(col.key)}
                    className={`px-4 py-3 text-sm text-[var(--foreground)] ${col.className ?? ""}`}
                  >
                    {col.render
                      ? col.render(row)
                      : String((row as Record<string, unknown>)[String(col.key)] ?? "")}
                  </td>
                ))}
                {(onEdit || onDelete) && (
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-3">
                      {onEdit && (
                        <button
                          onClick={() => onEdit(row)}
                          title="Editar"
                          className="text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors cursor-pointer"
                        >
                          <Pencil size={15} />
                        </button>
                      )}
                      {onDelete && (
                        <button
                          onClick={() => onDelete(row)}
                          title="Excluir"
                          className="text-[var(--muted-foreground)] hover:text-[var(--destructive)] transition-colors cursor-pointer"
                        >
                          <Trash2 size={15} />
                        </button>
                      )}
                    </div>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Footer / Pagination */}
      <div className="flex items-center justify-between px-5 py-3 border-t border-[var(--border)]">
        <span className="text-xs text-[var(--muted-foreground)] font-mono">
          {filtered.length} registro{filtered.length !== 1 ? "s" : ""}
        </span>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="px-2 py-1 text-xs font-mono rounded border border-[var(--border)] text-[var(--muted-foreground)] disabled:opacity-40 hover:bg-[var(--muted)] transition-colors"
          >‹</button>
          {Array.from({ length: pages }, (_, i) => i + 1).map((p) => (
            <button
              key={p}
              onClick={() => setPage(p)}
              className={`px-2 py-1 text-xs font-mono rounded border transition-colors ${
                p === page
                  ? "border-[var(--primary)] text-[var(--primary)] bg-[var(--primary)]/10"
                  : "border-[var(--border)] text-[var(--muted-foreground)] hover:bg-[var(--muted)]"
              }`}
            >{p}</button>
          ))}
          <button
            onClick={() => setPage((p) => Math.min(pages, p + 1))}
            disabled={page === pages}
            className="px-2 py-1 text-xs font-mono rounded border border-[var(--border)] text-[var(--muted-foreground)] disabled:opacity-40 hover:bg-[var(--muted)] transition-colors"
          >›</button>
        </div>
      </div>
    </div>
  );
}
