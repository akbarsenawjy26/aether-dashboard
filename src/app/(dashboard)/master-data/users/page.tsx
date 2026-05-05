"use client";

import * as React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ColumnDef } from "@tanstack/react-table";
import { z } from "zod";
import { Users, Plus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { DataTable, ActionCell } from "@/components/shared/data-table";
import { CrudDialogs } from "@/components/shared/crud-dialogs";
import { userApi, type User, type CreateUserRequest } from "@/lib/api/users";
import { formatDate } from "@/lib/utils";
import { useAuthStore } from "@/lib/stores/authStore";

const createSchema = z.object({
  name: z.string().min(2, "Nama minimal 2 karakter"),
  email: z.string().email("Email tidak valid"),
  password: z.string().min(8, "Password minimal 8 karakter"),
  role: z.enum(["admin", "operator", "viewer"]),
});

const updateSchema = z.object({
  name: z.string().min(2, "Nama minimal 2 karakter").optional(),
  email: z.string().email("Email tidak valid").optional(),
  password: z.string().min(8, "Password minimal 8 karakter").optional(),
  role: z.enum(["admin", "operator", "viewer"]).optional(),
});

type CreateForm = z.infer<typeof createSchema>;
type UpdateForm = z.infer<typeof updateSchema>;

const ROLES = [
  { value: "admin", label: "Admin" },
  { value: "operator", label: "Operator" },
  { value: "viewer", label: "Viewer" },
];

const ROLE_COLORS: Record<string, string> = {
  admin: "bg-red-500/10 text-red-600",
  operator: "bg-blue-500/10 text-blue-600",
  viewer: "bg-green-500/10 text-green-600",
};

export default function UsersPage() {
  const queryClient = useQueryClient();
  const { user: currentUser } = useAuthStore();
  const [page, setPage] = React.useState(1);
  const [limit, setLimit] = React.useState(10);
  const [search, setSearch] = React.useState("");
  const [createOpen, setCreateOpen] = React.useState(false);
  const [editOpen, setEditOpen] = React.useState(false);
  const [deleteOpen, setDeleteOpen] = React.useState(false);
  const [selectedRow, setSelectedRow] = React.useState<User | null>(null);

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ["users", page, limit, search],
    queryFn: () =>
      userApi.list({ page, limit, search: search || undefined }).then((r) => r.data.data),
  });

  const createMutation = useMutation({
    mutationFn: (data: CreateUserRequest) => userApi.create(data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["users"] }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ guid, data }: { guid: string; data: Partial<CreateUserRequest> }) =>
      userApi.update(guid, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["users"] }),
  });

  const deleteMutation = useMutation({
    mutationFn: (guid: string) => userApi.delete(guid),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["users"] }),
  });

  const columns: ColumnDef<User>[] = [
    {
      accessorKey: "name",
      header: "Nama",
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10">
            <Users className="h-4 w-4 text-primary" />
          </div>
          <div>
            <p className="font-medium">{row.original.name}</p>
            {row.original.guid === currentUser?.guid && (
              <p className="text-xs text-primary">Anda</p>
            )}
          </div>
        </div>
      ),
    },
    {
      accessorKey: "email",
      header: "Email",
      cell: ({ row }) => (
        <span className="text-sm">{row.original.email}</span>
      ),
    },
    {
      accessorKey: "role",
      header: "Role",
      cell: ({ row }) => (
        <Badge variant="secondary" className={ROLE_COLORS[row.original.role]}>
          {row.original.role}
        </Badge>
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
          onDelete={
            row.original.guid !== currentUser?.guid
              ? () => { setSelectedRow(row.original); setDeleteOpen(true); }
              : undefined
          }
        />
      ),
    },
  ];

  const createFields = [
    { name: "name" as const, label: "Nama", type: "text" as const, required: true, placeholder: "John Doe" },
    { name: "email" as const, label: "Email", type: "email" as const, required: true, placeholder: "john@email.com" },
    { name: "password" as const, label: "Password", type: "password" as const, required: true, placeholder: "Min. 8 karakter" },
    { name: "role" as const, label: "Role", type: "select" as const, required: true, options: ROLES },
  ];

  const updateFields = [
    { name: "name" as const, label: "Nama", type: "text" as const, placeholder: "John Doe" },
    { name: "email" as const, label: "Email", type: "email" as const, placeholder: "john@email.com" },
    { name: "password" as const, label: "Password Baru", type: "password" as const, placeholder: "Kosongkan jika tidak diubah" },
    { name: "role" as const, label: "Role", type: "select" as const, options: ROLES },
  ];

  const items = data?.items ?? [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Users</h1>
          <p className="text-muted-foreground">
            Kelola user — {data?.total ?? 0} user terdaftar
          </p>
        </div>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Tambah User
        </Button>
      </div>

      <Card>
        <CardContent className="p-6">
          <DataTable
            columns={columns}
            data={items}
            searchPlaceholder="Cari nama atau email..."
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
        title="User"
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
        itemName={(row) => row.name}
      />
    </div>
  );
}