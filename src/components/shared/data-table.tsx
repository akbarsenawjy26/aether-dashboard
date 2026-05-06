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
import { ChevronLeft, ChevronRight, ArrowUpDown, Eye, Pencil, Trash2, MoreHorizontal, Columns3 } from "lucide-react";
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
    const badgeCells = displayCells.filter((cell) => {
      const header = String(cell.column.columnDef.header ?? "");
      return ["Status", "Tipe", "Role"].includes(header);
    });

    return (
      <Card key={row.id} className="mb-3 overflow-hidden">
        <CardContent className="p-4">
          {/* Title + Subtitle */}
          <div className="mb-3">
            {firstCell && (
              <div className="mb-1 font-medium text-sm">
                {flexRender(firstCell.column.columnDef.cell, firstCell.getContext())}
              </div>
            )}
            {secondCell && (
              <div className="text-xs text-muted-foreground">
                {flexRender(secondCell.column.columnDef.cell, secondCell.getContext())}
              </div>
            )}
          </div>

          {/* Badges */}
          {badgeCells.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-3">
              {badgeCells.map((cell) => (
                <div key={cell.id}>
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </div>
              ))}
            </div>
          )}

          {/* Actions */}
          {actionCell && actionCell.column.columnDef.cell && (
            <div className="flex items-center gap-2">
              {flexRender(actionCell.column.columnDef.cell, actionCell.getContext())}
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        {/* Search */}
        {searchKey && (
          <Input
            placeholder={searchPlaceholder}
            value={globalFilter}
            onChange={(e) => setGlobalFilter(e.target.value)}
            className="max-w-sm"
          />
        )}

        <div className="flex items-center gap-2 ml-auto">
          {/* Column visibility */}
          <DropdownMenu>
            <DropdownMenuTrigger>
              <Button variant="outline" size="sm">
                <Columns3 className="h-4 w-4 mr-2 hidden sm:inline" />
                Columns
              </Button>
            </DropdownMenuTrigger>
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
                    {String(column.columnDef.header)}
                  </DropdownMenuCheckboxItem>
                ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Mobile Card View - shown on < md screens */}
      <div className="md:hidden space-y-1">
        {isLoading ? (
          // Loading skeleton for cards
          Array.from({ length: 3 }).map((_, i) => (
            <Card key={i} className="mb-3">
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
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id}>
                  {headerGroup.headers.map((header) => (
                    <TableHead
                      key={header.id}
                      className={cn(
                        header.column.getCanSort() && "cursor-pointer select-none"
                      )}
                      onClick={header.column.getToggleSortingHandler()}
                    >
                      <div className="flex items-center gap-1">
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
                  <TableRow key={row.id} data-state={row.getIsSelected() && "selected"}>
                    {row.getVisibleCells().map((cell) => (
                      <TableCell key={cell.id}>
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

      {/* Pagination */}
      {pagination && (
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="text-sm text-muted-foreground">
            Menampilkan{" "}
            {(pagination.page - 1) * pagination.limit + 1}–
            {Math.min(pagination.page * pagination.limit, pagination.total)} dari{" "}
            {pagination.total} data
          </div>
          <div className="flex items-center gap-2">
            <Select
              value={String(pagination.limit)}
              onValueChange={(v) => pagination.onLimitChange(Number(v))}
            >
              <SelectTrigger className="h-8 w-20">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {pageSizes.map((size) => (
                  <SelectItem key={size} value={String(size)}>
                    {size} / hal
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="icon"
                className="h-9 w-9 sm:h-8 sm:w-8"
                onClick={() => pagination.onPageChange(1)}
                disabled={pagination.page <= 1}
              >
                {"<<"}
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

              <span className="text-sm px-2">
                Hal. {pagination.page} / {totalPages}
              </span>

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
                {">>"}
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
            className="inline-flex h-9 w-9 sm:h-8 sm:w-8 items-center justify-center rounded-md text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground"
            aria-label="Open menu"
          />
        }
      >
        <MoreHorizontal className="h-4 w-4" />
      </DropdownMenuTrigger>
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