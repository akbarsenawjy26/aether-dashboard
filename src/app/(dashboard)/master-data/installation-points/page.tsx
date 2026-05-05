"use client";

import * as React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { ColumnDef } from "@tanstack/react-table";
import { z } from "zod";
import { Anchor, Plus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { DataTable, ActionCell } from "@/components/shared/data-table";
import { CrudDialogs } from "@/components/shared/crud-dialogs";
import {
  installationPointApi,
  type InstallationPoint,
  type CreateInstallationPointRequest,
} from "@/lib/api/installation-points";
import { deviceApi } from "@/lib/api/devices";
import { locationApi } from "@/lib/api/locations";
import { formatDate } from "@/lib/utils";

const createSchema = z.object({
  name: z.string().min(1, "Nama wajib diisi").max(100),
  device_guid: z.string().optional(),
  location_guid: z.string().optional(),
  notes: z.string().optional(),
  installed_at: z.string().optional(),
});

const updateSchema = createSchema;

type CreateForm = z.infer<typeof createSchema>;

export default function InstallationPointsPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [page, setPage] = React.useState(1);
  const [limit, setLimit] = React.useState(10);
  const [search, setSearch] = React.useState("");
  const [createOpen, setCreateOpen] = React.useState(false);
  const [editOpen, setEditOpen] = React.useState(false);
  const [deleteOpen, setDeleteOpen] = React.useState(false);
  const [selectedRow, setSelectedRow] = React.useState<InstallationPoint | null>(null);

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ["installation-points", page, limit, search],
    queryFn: () =>
      installationPointApi.list({ page, limit, search: search || undefined }).then((r) => r.data.data),
  });

  // For dropdowns
  const { data: deviceData } = useQuery({
    queryKey: ["devices-all"],
    queryFn: () => deviceApi.list({ limit: 1000 }).then((r) => r.data.data.items ?? []),
  });

  const { data: locationData } = useQuery({
    queryKey: ["locations-all"],
    queryFn: () => locationApi.list({ limit: 1000 }).then((r) => r.data.data.items ?? []),
  });

  const createMutation = useMutation({
    mutationFn: (data: CreateInstallationPointRequest) => installationPointApi.create(data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["installation-points"] }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ guid, data }: { guid: string; data: Partial<CreateInstallationPointRequest> }) =>
      installationPointApi.update(guid, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["installation-points"] }),
  });

  const deleteMutation = useMutation({
    mutationFn: (guid: string) => installationPointApi.delete(guid),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["installation-points"] }),
  });

  const columns: ColumnDef<InstallationPoint>[] = [
    {
      accessorKey: "name",
      header: "Nama",
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
            <Anchor className="h-4 w-4 text-primary" />
          </div>
          <span className="font-medium">{row.original.name}</span>
        </div>
      ),
    },
    {
      accessorKey: "device_sn",
      header: "Device",
      cell: ({ row }) =>
        row.original.device_sn ? (
          <code className="text-xs font-mono">{row.original.device_sn}</code>
        ) : (
          <span className="text-muted-foreground">Belum terdaftar</span>
        ),
    },
    {
      accessorKey: "location_name",
      header: "Lokasi",
      cell: ({ row }) =>
        row.original.location_name ?? <span className="text-muted-foreground">—</span>,
    },
    {
      accessorKey: "installed_at",
      header: "Tanggal Instalasi",
      cell: ({ row }) =>
        row.original.installed_at ? formatDate(row.original.installed_at) : <span className="text-muted-foreground">—</span>,
    },
    {
      accessorKey: "notes",
      header: "Catatan",
      cell: ({ row }) =>
        row.original.notes ? (
          <span className="text-sm text-muted-foreground line-clamp-1">{row.original.notes}</span>
        ) : (
          <span className="text-muted-foreground">—</span>
        ),
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
          onView={() =>
            router.push(
              row.original.device_sn
                ? `/dashboard/history/${row.original.device_sn}`
                : "#"
            )
          }
          onEdit={() => { setSelectedRow(row.original); setEditOpen(true); }}
          onDelete={() => { setSelectedRow(row.original); setDeleteOpen(true); }}
        />
      ),
    },
  ];

  const deviceOptions = deviceData?.map((d) => ({ value: d.guid, label: `${d.name} (${d.serial_number})` })) ?? [];
  const locationOptions = locationData?.map((l) => ({ value: l.guid, label: l.name })) ?? [];

  const fields = [
    { name: "name" as const, label: "Nama Installation Point", type: "text" as const, required: true, placeholder: "Sensor Lantai 1" },
    { name: "device_guid" as const, label: "Device", type: "select" as const, options: deviceOptions },
    { name: "location_guid" as const, label: "Lokasi", type: "select" as const, options: locationOptions },
    { name: "installed_at" as const, label: "Tanggal Instalasi", type: "text" as const, placeholder: "2026-01-15" },
    { name: "notes" as const, label: "Catatan", type: "text" as const, placeholder: "Catatan tambahan..." },
  ];

  const items = data?.items ?? [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Installation Points</h1>
          <p className="text-muted-foreground">
            Kelola installation point — {data?.total ?? 0} titik instalasi
          </p>
        </div>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Tambah Installation Point
        </Button>
      </div>

      <Card>
        <CardContent className="p-6">
          <DataTable
            columns={columns}
            data={items}
            searchPlaceholder="Cari nama installation point..."
            isLoading={isLoading || isFetching}
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

      <CrudDialogs
        title="Installation Point"
        createOpen={createOpen}
        editOpen={editOpen}
        deleteOpen={deleteOpen}
        setCreateOpen={setCreateOpen}
        setEditOpen={setEditOpen}
        setDeleteOpen={setDeleteOpen}
        selectedRow={selectedRow}
        isLoading={false}
        createFields={fields}
        updateFields={fields}
        formSchema={{ create: createSchema, update: updateSchema }}
        onCreate={createMutation.mutateAsync}
        onUpdate={async (guid, data) => updateMutation.mutateAsync({ guid, data })}
        onDelete={deleteMutation.mutateAsync}
        getGuid={(row) => row.guid}
        itemName={(row) => row.name}
      />
    </div>
  );
}