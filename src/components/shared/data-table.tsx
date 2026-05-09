"use client";

import * as React from "react";
import {
  ColumnDef,
  SortingState,
  ColumnFiltersState,
  VisibilityState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, ArrowUpDown, Eye, Pencil, Trash2, MoreHorizontal, Columns3, Search } from "lucide-react";
import { cn } from "@/lib/utils";

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  searchKey?: string;
  searchPlaceholder?: string;
  pageSizes?: number[];
  onRowAction?: (action: "view" | "edit" | "delete", row: TData) => void;
  isLoading?: boolean;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    onPageChange: (page: number) => void;
    onLimitChange: (limit: number) => void;
  };
}

export function DataTable<TData, TValue>({
  columns,
  data,
  searchKey,
  searchPlaceholder = "Cari...",
  pageSizes = [10, 25, 50],
  onRowAction, // eslint-disable-line @typescript-eslint/no-unused-vars -- kept for future use
  isLoading,
  pagination,
}: DataTableProps<TData, TValue>) {
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([]);
  const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({});
  const [globalFilter, setGlobalFilter] = React.useState("");

  const table = useReactTable({
    data,
    columns,
    state: {
      sorting,
      columnFilters,
      columnVisibility,
      globalFilter,
    },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onColumnVisibilityChange: setColumnVisibility,
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  const totalPages = pagination
    ? Math.ceil(pagination.total / pagination.limit)
    : table.getPageCount();

  // Find action column
  const actionColumn = table.getAllColumns().find((col) => col.id === "actions");
  // Find non-action columns for mobile card
  const displayColumns = table.getAllColumns().filter((col) => col.id !== "actions");

  // Mobile card render - extracts rendered cell content
  const renderMobileCard = (row: ReturnType<typeof table.getRowModel>["rows"][number]) => {
    const cells = row.getVisibleCells();
    const actionCell = cells.find((cell) => cell.column.id === "actions");
    const displayCells = cells.filter((cell) => cell.column.id !== "actions");
    
    const firstCell = displayCells[0];
    const secondCell = displayCells[1];
    
    const badgeHeaders = ["Status", "Tipe", "Role", "Severity", "Status"];
    const badgeCells = displayCells.filter((cell) => {
      const header = cell.column.columnDef.header;
      return typeof header === "string" && badgeHeaders.includes(header);
    });

    const detailCells = displayCells.filter((cell) => {
      const header = cell.column.columnDef.header;
      return cell !== firstCell && cell !== secondCell && !badgeCells.includes(cell);
    });

    return (
      <Card key={row.id} className="mb-4 overflow-hidden shadow-md border-border/40 bg-card hover:bg-muted/5 transition-all duration-200">
        <CardContent className="p-0">
          {/* Header Bar */}
          <div className="bg-muted/30 px-5 py-3 border-b border-border/40 flex justify-between items-center">
            <div className="space-y-0.5 min-w-0">
              {firstCell && (
                <div className="font-black text-[10px] text-muted-foreground/60 uppercase tracking-[0.2em] leading-none">
                  {typeof firstCell.column.columnDef.header === 'string' ? firstCell.column.columnDef.header : firstCell.column.id}
                </div>
              )}
              {firstCell && (
                <div className="font-bold text-xs text-foreground truncate">
                  {flexRender(firstCell.column.columnDef.cell, firstCell.getContext())}
                </div>
              )}
            </div>
            {actionCell && (
              <div className="shrink-0 scale-90">
                {flexRender(actionCell.column.columnDef.cell, actionCell.getContext())}
              </div>
            )}
          </div>

          {/* Body Section */}
          <div className="p-5 space-y-4">
            {secondCell && (
              <div className="flex justify-between items-start gap-4">
                <span className="text-[9px] font-black uppercase tracking-[0.2em] text-muted-foreground/50 pt-0.5">
                  {typeof secondCell.column.columnDef.header === 'string' ? secondCell.column.columnDef.header : secondCell.column.id}
                </span>
                <div className="text-xs font-bold text-foreground text-right">
                  {flexRender(secondCell.column.columnDef.cell, secondCell.getContext())}
                </div>
              </div>
            )}

            {detailCells.length > 0 && (
              <div className="space-y-3 pt-3 border-t border-dashed border-border/50">
                {detailCells.map((cell) => (
                  <div key={cell.id} className="flex justify-between items-center gap-4">
                    <span className="text-[9px] font-black uppercase tracking-[0.2em] text-muted-foreground/40">
                      {typeof cell.column.columnDef.header === 'string' ? cell.column.columnDef.header : cell.column.id}
                    </span>
                    <div className="text-[11px] font-bold text-foreground/80 text-right">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {badgeCells.length > 0 && (
              <div className="flex flex-wrap items-center justify-end gap-2 pt-2 border-t border-border/20">
                {badgeCells.map((cell) => (
                  <div key={cell.id} className="scale-[0.85] origin-right">
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </div>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-4 py-3 sm:px-0 sm:py-0">
        {/* Search */}
        {(searchKey || searchPlaceholder) && (
          <div className="relative w-full sm:max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder={searchPlaceholder}
              value={globalFilter}
              onChange={(e) => setGlobalFilter(e.target.value)}
              className="pl-9 w-full h-9"
            />
          </div>
        )}

        <div className="flex items-center gap-2 w-full sm:w-auto">
          {/* Column visibility */}
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <button
                  type="button"
                  className="inline-flex items-center justify-center gap-2 rounded-md border border-input bg-background text-sm font-medium hover:bg-accent hover:text-accent-foreground px-3 py-2 h-9 w-full sm:w-auto"
                >
                  <Columns3 className="h-4 w-4" />
                  <span className="sm:inline">Columns</span>
                </button>
              }
            />
            <DropdownMenuContent align="end">
              {table
                .getAllColumns()
                .filter((column) => column.getCanHide())
                .map((column) => (
                  <DropdownMenuCheckboxItem
                    key={column.id}
                    checked={column.getIsVisible()}
                    onCheckedChange={(value) => column.toggleVisibility(!!value)}
                  >
                    {typeof column.columnDef.header === "string"
                      ? column.columnDef.header
                      : column.id}
                  </DropdownMenuCheckboxItem>
                ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Mobile Card View - shown on < md screens */}
      <div className="md:hidden space-y-2 px-4 pb-4">
        {isLoading ? (
          // Loading skeleton for cards
          Array.from({ length: 3 }).map((_, i) => (
            <Card key={i} className="mb-4">
              <CardContent className="p-4">
                <div className="h-4 w-2/3 animate-pulse rounded bg-muted mb-2" />
                <div className="h-3 w-1/2 animate-pulse rounded bg-muted mb-3" />
                <div className="flex gap-2">
                  <div className="h-6 w-16 animate-pulse rounded bg-muted" />
                  <div className="h-6 w-16 animate-pulse rounded bg-muted" />
                </div>
              </CardContent>
            </Card>
          ))
        ) : table.getRowModel().rows.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center text-muted-foreground">
              Tidak ada data.
            </CardContent>
          </Card>
        ) : (
          table.getRowModel().rows.map(renderMobileCard)
        )}
      </div>

      {/* Desktop Table View - hidden on mobile */}
      <div className="hidden md:block">
        <div className="p-1">
          <div className="rounded-xl bg-card overflow-hidden">
            <Table className="border-none">
              <TableHeader className="bg-muted/50 border-none">
                {table.getHeaderGroups().map((headerGroup) => (
                  <TableRow key={headerGroup.id}>
                    {headerGroup.headers.map((header) => (
                      <TableHead
                        key={header.id}
                        className={cn(
                          "text-center",
                          header.column.getCanSort() && "cursor-pointer select-none"
                        )}
                        onClick={header.column.getToggleSortingHandler()}
                      >
                        <div className="flex items-center justify-center gap-1">
                          {header.isPlaceholder
                            ? null
                            : flexRender(
                                header.column.columnDef.header,
                                header.getContext()
                              )}
                          {header.column.getCanSort() && (
                            <ArrowUpDown className="h-3 w-3 text-muted-foreground" />
                          )}
                        </div>
                      </TableHead>
                    ))}
                  </TableRow>
                ))}
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  // Loading skeleton
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>
                      {columns.map((_, j) => (
                        <TableCell key={j}>
                          <div className="h-4 w-full animate-pulse rounded bg-muted" />
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : table.getRowModel().rows.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={columns.length}
                      className="h-24 text-center text-muted-foreground"
                    >
                      Tidak ada data.
                    </TableCell>
                  </TableRow>
                ) : (
                  table.getRowModel().rows.map((row) => (
                    <TableRow key={row.id} data-state={row.getIsSelected() && "selected"} className="even:bg-muted/30 hover:bg-muted/50 border-none h-16">
                      {row.getVisibleCells().map((cell) => (
                        <TableCell key={cell.id} className="text-center px-6 py-6">
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </div>

      {/* Pagination */}
      {pagination && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-4 py-4 sm:px-0 sm:py-0">
          <div className="text-xs sm:text-sm text-muted-foreground order-2 sm:order-1">
            Menampilkan <span className="font-medium">{(pagination.page - 1) * pagination.limit + 1}</span>–
            <span className="font-medium">{Math.min(pagination.page * pagination.limit, pagination.total)}</span> dari{" "}
            <span className="font-medium">{pagination.total}</span> data
          </div>
          
          <div className="flex flex-col xs:flex-row items-center gap-3 sm:gap-6 order-1 sm:order-2 w-full sm:w-auto">
            <div className="flex items-center gap-2">
              <span className="text-[10px] sm:text-xs text-muted-foreground whitespace-nowrap">Baris per hal:</span>
              <Select
                value={String(pagination.limit)}
                onValueChange={(v) => pagination.onLimitChange(Number(v))}
              >
                <SelectTrigger className="h-8 w-[70px] sm:w-20">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {pageSizes.map((size) => (
                    <SelectItem key={size} value={String(size)}>
                      {size}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="icon"
                className="h-9 w-9 sm:h-8 sm:w-8"
                onClick={() => pagination.onPageChange(1)}
                disabled={pagination.page <= 1}
              >
                <ChevronsLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="h-9 w-9 sm:h-8 sm:w-8"
                onClick={() => pagination.onPageChange(pagination.page - 1)}
                disabled={pagination.page <= 1}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>

              <div className="flex items-center justify-center min-w-[80px] text-xs sm:text-sm font-medium">
                {pagination.page} / {totalPages}
              </div>

              <Button
                variant="outline"
                size="icon"
                className="h-9 w-9 sm:h-8 sm:w-8"
                onClick={() => pagination.onPageChange(pagination.page + 1)}
                disabled={pagination.page >= totalPages}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="h-9 w-9 sm:h-8 sm:w-8"
                onClick={() => pagination.onPageChange(totalPages)}
                disabled={pagination.page >= totalPages}
              >
                <ChevronsRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Action cell for CRUD operations
export function ActionCell(props: {
  onView?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <button
            type="button"
            className="inline-flex h-9 w-9 sm:h-8 sm:w-8 items-center justify-center rounded-full text-sm font-medium transition-all hover:scale-105 active:scale-95 hover:bg-accent hover:text-accent-foreground border border-border"
            aria-label="Open menu"
          >
            <MoreHorizontal className="h-4 w-4" />
          </button>
        }
      />
      <DropdownMenuContent align="end">
        {props.onView && (
          <DropdownMenuItem onClick={props.onView}>
            <Eye className="h-4 w-4 mr-2" />
            Lihat
          </DropdownMenuItem>
        )}
        {props.onEdit && (
          <DropdownMenuItem onClick={props.onEdit}>
            <Pencil className="h-4 w-4 mr-2" />
            Edit
          </DropdownMenuItem>
        )}
        {props.onDelete && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={props.onDelete}
              className="text-destructive focus:text-destructive"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Hapus
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}