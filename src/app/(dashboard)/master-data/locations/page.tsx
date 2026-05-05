"use client";

import * as React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ColumnDef } from "@tanstack/react-table";
import { z } from "zod";
import { MapPin, Plus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { DataTable, ActionCell } from "@/components/shared/data-table";
import { CrudDialogs } from "@/components/shared/crud-dialogs";
import { locationApi, type Location, type CreateLocationRequest } from "@/lib/api/locations";
import { formatDate } from "@/lib/utils";

const createSchema = z.object({
  name: z.string().min(1, "Nama wajib diisi").max(100),
  address: z.string().optional(),
  latitude: z.coerce.number().optional(),
  longitude: z.coerce.number().optional(),
});

const updateSchema = createSchema;

type CreateForm = z.infer<typeof createSchema>;
type UpdateForm = z.infer<typeof updateSchema>;

export default function LocationsPage() {
  const queryClient = useQueryClient();
  const [page, setPage] = React.useState(1);
  const [limit, setLimit] = React.useState(10);
  const [search, setSearch] = React.useState("");
  const [createOpen, setCreateOpen] = React.useState(false);
  const [editOpen, setEditOpen] = React.useState(false);
  const [deleteOpen, setDeleteOpen] = React.useState(false);
  const [selectedRow, setSelectedRow] = React.useState<Location | null>(null);

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ["locations", page, limit, search],
    queryFn: () =>
      locationApi.list({ page, limit, search: search || undefined }).then((r) => r.data.data),
  });

  const createMutation = useMutation({
    mutationFn: (data: CreateLocationRequest) => locationApi.create(data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["locations"] }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ guid, data }: { guid: string; data: Partial<CreateLocationRequest> }) =>
      locationApi.update(guid, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["locations"] }),
  });

  const deleteMutation = useMutation({
    mutationFn: (guid: string) => locationApi.delete(guid),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["locations"] }),
  });

  const columns: ColumnDef<Location>[] = [
    {
      accessorKey: "name",
      header: "Nama Lokasi",
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
            <MapPin className="h-4 w-4 text-primary" />
          </div>
          <span className="font-medium">{row.original.name}</span>
        </div>
      ),
    },
    {
      accessorKey: "address",
      header: "Alamat",
      cell: ({ row }) => row.original.address ?? <span className="text-muted-foreground">—</span>,
    },
    {
      accessorKey: "latitude",
      header: "Koordinat",
      cell: ({ row }) => {
        const { latitude, longitude } = row.original;
        if (latitude && longitude) {
          return (
            <code className="text-xs font-mono">
              {latitude.toFixed(5)}, {longitude.toFixed(5)}
            </code>
          );
        }
        return <span className="text-muted-foreground">—</span>;
      },
    },
    {
      accessorKey: "device_count",
      header: "Jumlah Device",
      cell: ({ row }) =>
        row.original.device_count !== undefined ? (
          <Badge variant="secondary">{row.original.device_count}</Badge>
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
          onEdit={() => { setSelectedRow(row.original); setEditOpen(true); }}
          onDelete={() => { setSelectedRow(row.original); setDeleteOpen(true); }}
        />
      ),
    },
  ];

  const fields = [
    { name: "name" as const, label: "Nama Lokasi", type: "text" as const, required: true, placeholder: "Gedung A" },
    { name: "address" as const, label: "Alamat", type: "text" as const, placeholder: "Jl. Sudirman No. 1" },
    { name: "latitude" as const, label: "Latitude", type: "number" as const, placeholder: "-6.2" },
    { name: "longitude" as const, label: "Longitude", type: "number" as const, placeholder: "106.8" },
  ];

  const items = data?.items ?? [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Locations</h1>
          <p className="text-muted-foreground">
            Kelola lokasi instalasi — {data?.total ?? 0} lokasi
          </p>
        </div>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Tambah Lokasi
        </Button>
      </div>

      <Card>
        <CardContent className="p-6">
          <DataTable
            columns={columns}
            data={items}
            searchPlaceholder="Cari nama lokasi..."
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
        title="Lokasi"
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