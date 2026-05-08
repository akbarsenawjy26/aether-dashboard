"use client";

import * as React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { ColumnDef } from "@tanstack/react-table";
import { z } from "zod";
import { Anchor, Plus } from "lucide-react";
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
  device_guid: z.string().min(1, "Device wajib dipilih"),
  location_guid: z.string().min(1, "Lokasi wajib dipilih"),
  notes: z.string().max(500).optional().or(z.literal("")),
});

const updateSchema = createSchema.partial();

export default function InstallationPointsPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [page, setPage] = React.useState(1);
  const [limit, setLimit] = React.useState(10);
  const [search] = React.useState("");
  
  const [createOpen, setCreateOpen] = React.useState(false);
  const [editOpen, setEditOpen] = React.useState(false);
  const [deleteOpen, setDeleteOpen] = React.useState(false);
  const [quickDeviceOpen, setQuickDeviceOpen] = React.useState(false);
  const [quickLocationOpen, setQuickLocationOpen] = React.useState(false);
  const [selectedRow, setSelectedRow] = React.useState<InstallationPoint | null>(null);

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ["installation-points", page, limit, search],
    queryFn: () =>
      installationPointApi.list({ page, limit, search: search || undefined }),
  });

  // For dropdowns
  const { data: deviceData } = useQuery({
    queryKey: ["devices-all"],
    queryFn: () => deviceApi.list({ limit: 1000 }).then((r) => r.items ?? []),
  });

  const { data: locationData } = useQuery({
    queryKey: ["locations-all"],
    queryFn: () => locationApi.list({ limit: 1000 }).then((r) => r.items ?? []),
  });

  // Quick Create Mutations
  const quickDeviceMutation = useMutation({
    mutationFn: (data: any) => deviceApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["devices-all"] });
      setQuickDeviceOpen(false);
    },
  });

  const quickLocationMutation = useMutation({
    mutationFn: (data: any) => locationApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["locations-all"] });
      setQuickLocationOpen(false);
    },
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
      accessorKey: "notes",
      header: "Catatan",
      cell: ({ row }) => (
        <span className="text-sm text-muted-foreground truncate max-w-[200px] inline-block">
          {row.original.notes || "—"}
        </span>
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
          onEdit={() => { setSelectedRow(row.original); setEditOpen(true); }}
          onDelete={() => { setSelectedRow(row.original); setDeleteOpen(true); }}
        />
      ),
    },
  ];

  const deviceOptions = Array.isArray(deviceData) 
    ? deviceData.map((d) => ({ value: d.guid, label: d.alias || d.serial_number })) 
    : [];
  const locationOptions = Array.isArray(locationData) 
    ? locationData.map((l) => ({ value: l.guid, label: l.name })) 
    : [];

  const fields = [
    { name: "name" as const, label: "Nama Installation Point", type: "text" as const, required: true, placeholder: "Sensor Lantai 1" },
    { 
      name: "device_guid" as const, 
      label: "Device", 
      type: "select" as const, 
      options: deviceOptions,
      onAddClick: () => setQuickDeviceOpen(true)
    },
    { 
      name: "location_guid" as const, 
      label: "Lokasi", 
      type: "select" as const, 
      options: locationOptions,
      onAddClick: () => setQuickLocationOpen(true)
    },
    { name: "notes" as const, label: "Catatan", type: "textarea" as const, placeholder: "Catatan tambahan..." },
  ];

  const items = data?.items ?? [];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Installation Points</h1>
          <p className="text-sm sm:text-base text-muted-foreground">
            Kelola installation point — {data?.total ?? 0} titik instalasi
          </p>
        </div>
        <Button onClick={() => setCreateOpen(true)} className="w-full sm:w-auto">
          <Plus className="h-4 w-4 mr-2" />
          Tambah Installation Point
        </Button>
      </div>

      <Card>
        <CardContent className="p-0 sm:p-6">
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

      {/* Main Installation Point Dialog */}
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

      {/* Quick Create Device Dialog */}
      <CrudDialogs
        title="Device"
        createOpen={quickDeviceOpen}
        editOpen={false}
        deleteOpen={false}
        setCreateOpen={setQuickDeviceOpen}
        setEditOpen={() => {}}
        setDeleteOpen={() => {}}
        selectedRow={null}
        createFields={[
          { name: "alias", label: "Alias Device", type: "text", required: true, placeholder: "Sensor Ruang Server" },
          { name: "serial_number", label: "Serial Number", type: "text", required: true, placeholder: "SN-001" },
          { name: "type", label: "Tipe", type: "text", required: true, placeholder: "sensor_env" },
          { name: "notes", label: "Catatan", type: "textarea", placeholder: "Sensor untuk monitoring..." },
        ]}
        updateFields={[]}
        formSchema={{ 
          create: z.object({
            alias: z.string().min(1),
            serial_number: z.string().min(1),
            type: z.string().min(1),
            notes: z.string().optional(),
          }), 
          update: z.object({}) 
        }}
        onCreate={quickDeviceMutation.mutateAsync}
        onUpdate={async () => {}}
        onDelete={async () => {}}
      />

      {/* Quick Create Location Dialog */}
      <CrudDialogs
        title="Lokasi"
        createOpen={quickLocationOpen}
        editOpen={false}
        deleteOpen={false}
        setCreateOpen={setQuickLocationOpen}
        setEditOpen={() => {}}
        setDeleteOpen={() => {}}
        selectedRow={null}
        createFields={[
          { name: "name", label: "Nama Lokasi", type: "text", required: true, placeholder: "Kantor Pusat Jakarta" },
          { name: "notes", label: "Catatan", type: "textarea", placeholder: "Lokasi utama perusahaan" },
        ]}
        updateFields={[]}
        formSchema={{ 
          create: z.object({
            name: z.string().min(1),
            notes: z.string().optional(),
          }), 
          update: z.object({}) 
        }}
        onCreate={quickLocationMutation.mutateAsync}
        onUpdate={async () => {}}
        onDelete={async () => {}}
      />
    </div>
  );
}