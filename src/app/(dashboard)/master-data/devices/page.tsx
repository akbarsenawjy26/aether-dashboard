"use client";

import * as React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { ColumnDef } from "@tanstack/react-table";
import { z } from "zod";
import { HardDrive, Plus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { DataTable, ActionCell } from "@/components/shared/data-table";
import { CrudDialogs } from "@/components/shared/crud-dialogs";
import { deviceApi, type Device, type CreateDeviceRequest } from "@/lib/api/devices";
import { locationApi } from "@/lib/api/locations";
import { formatDate } from "@/lib/utils";

// Zod schemas
const createSchema = z.object({
  serial_number: z.string().min(1, "Serial number wajib diisi").max(50),
  alias: z.string().min(1, "Alias wajib diisi").max(100),
  type: z.string().min(1, "Tipe wajib diisi"),
  notes: z.string().max(500).optional().or(z.literal("")),
});

const updateSchema = createSchema.partial();

const DEVICE_TYPES = [
  { value: "sensor_env", label: "Sensor Lingkungan" },
  { value: "gateway", label: "Gateway" },
  { value: "controller", label: "Controller" },
  { value: "other", label: "Lainnya" },
];

export default function DevicesPage() {
  const router = useRouter();
  const queryClient = useQueryClient();

  // Pagination state
  const [page, setPage] = React.useState(1);
  const [limit, setLimit] = React.useState(10);
  const [search] = React.useState("");

  // Dialog states
  const [createOpen, setCreateOpen] = React.useState(false);
  const [editOpen, setEditOpen] = React.useState(false);
  const [deleteOpen, setDeleteOpen] = React.useState(false);
  const [selectedRow, setSelectedRow] = React.useState<Device | null>(null);

  // Fetch devices
  const { data, isLoading, isFetching } = useQuery({
    queryKey: ["devices", page, limit, search],
    queryFn: () =>
      deviceApi.list({ page, limit, search: search || undefined }),
  });

  // Fetch locations for dropdown
  const { data: locationData } = useQuery({
    queryKey: ["locations-all"],
    queryFn: () => locationApi.list({ limit: 1000 }).then((r) => r.items ?? []),
  });

  // Mutations
  const createMutation = useMutation({
    mutationFn: (data: CreateDeviceRequest) => deviceApi.create(data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["devices"] }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ guid, data }: { guid: string; data: Partial<CreateDeviceRequest> }) =>
      deviceApi.update(guid, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["devices"] });
      queryClient.invalidateQueries({ queryKey: ["device"] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (guid: string) => deviceApi.delete(guid),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["devices"] }),
  });

  // Table columns
  const columns: ColumnDef<Device>[] = [
    {
      accessorKey: "alias",
      header: "Alias / Nama",
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
            <HardDrive className="h-4 w-4 text-primary" />
          </div>
          <span className="font-medium">{row.original.alias || "No Alias"}</span>
        </div>
      ),
    },
    {
      accessorKey: "serial_number",
      header: "Serial Number",
      cell: ({ row }) => (
        <code className="text-xs font-mono bg-muted px-1.5 py-0.5 rounded">
          {row.original.serial_number}
        </code>
      ),
    },
    {
      accessorKey: "type",
      header: "Tipe",
      cell: ({ row }) => {
        const type = row.original.type;
        const colors: Record<string, string> = {
          sensor: "bg-blue-500/10 text-blue-600 border-blue-500/20",
          gateway: "bg-purple-500/10 text-purple-600 border-purple-500/20",
          controller: "bg-amber-500/10 text-amber-600 border-amber-500/20",
          other: "bg-gray-500/10 text-gray-600 border-gray-500/20",
        };
        return (
          <Badge variant="outline" className={colors[type]}>
            {type}
          </Badge>
        );
      },
    },
    {
      accessorKey: "notes",
      header: "Catatan",
      cell: ({ row }) => (
        <span className="text-sm text-muted-foreground truncate max-w-[150px] inline-block">
          {row.original.notes || "—"}
        </span>
      ),
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => {
        const status = row.original.status;
        const colors: Record<string, string> = {
          online: "bg-green-500/10 text-green-600",
          offline: "bg-red-500/10 text-red-600",
          unknown: "bg-gray-500/10 text-gray-600",
        };
        return (
          <Badge variant="secondary" className={colors[status]}>
            {status}
          </Badge>
        );
      },
    },
    {
      accessorKey: "created_at",
      header: "Dibuat",
      cell: ({ row }) => formatDate(row.original.created_at),
    },
    {
      id: "actions",
      cell: ({ row }) => (
        <ActionCell
          onView={() => router.push(`/master-data/devices/${row.original.guid}`)}
          onEdit={() => {
            setSelectedRow(row.original);
            setEditOpen(true);
          }}
          onDelete={() => {
            setSelectedRow(row.original);
            setDeleteOpen(true);
          }}
        />
      ),
    },
  ];

  // Form field configs
  const locationOptions =
    locationData?.map((loc) => ({ value: loc.guid, label: loc.name })) ?? [];

  const createFields = [
    { name: "alias" as const, label: "Alias Device", type: "text" as const, required: true, placeholder: "Sensor Ruang Server" },
    { name: "serial_number" as const, label: "Serial Number", type: "text" as const, required: true, placeholder: "SN-001" },
    { name: "type" as const, label: "Tipe", type: "text" as const, required: true, placeholder: "sensor_env" },
    { name: "notes" as const, label: "Catatan", type: "textarea" as const, required: false, placeholder: "Sensor untuk monitoring..." },
  ];

  const updateFields = createFields;

  const items = data?.items ?? [];
  const isRefetching = isFetching && !isLoading;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Devices</h1>
          <p className="text-sm sm:text-base text-muted-foreground">
            Kelola device IoT — {data?.total ?? 0} total device
          </p>
        </div>
        <Button onClick={() => setCreateOpen(true)} className="w-full sm:w-auto">
          <Plus className="h-4 w-4 mr-2" />
          Tambah Device
        </Button>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0 sm:p-6">
          <DataTable
            columns={columns}
            data={items}
            searchKey="search"
            searchPlaceholder="Cari name atau serial number..."
            isLoading={isLoading || isRefetching}
            pagination={{
              page,
              limit,
              total: data?.total ?? 0,
              onPageChange: setPage,
              onLimitChange: (l) => { setLimit(l); setPage(1); },
            }}
          />
        </CardContent>
      </Card>

      {/* CRUD Dialogs */}
      <CrudDialogs
        title="Device"
        createOpen={createOpen}
        editOpen={editOpen}
        deleteOpen={deleteOpen}
        setCreateOpen={setCreateOpen}
        setEditOpen={setEditOpen}
        setDeleteOpen={setDeleteOpen}
        selectedRow={selectedRow}
        isLoading={false}
        createFields={createFields}
        updateFields={updateFields}
        formSchema={{ create: createSchema, update: updateSchema }}
        onCreate={createMutation.mutateAsync}
        onUpdate={async (guid, data) => updateMutation.mutateAsync({ guid, data })}
        onDelete={deleteMutation.mutateAsync}
        getGuid={(row) => row.guid}
        itemName={(row) => row.alias || row.serial_number}
      />
    </div>
  );
}
