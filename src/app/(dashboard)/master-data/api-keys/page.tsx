"use client";

import * as React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ColumnDef } from "@tanstack/react-table";
import { z } from "zod";
import { Key, Plus, Copy, Check, Eye, EyeOff } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { DataTable, ActionCell } from "@/components/shared/data-table";
import { apiKeyApi, type APIKey, type CreateAPIKeyRequest } from "@/lib/api/api-keys";
import { deviceApi } from "@/lib/api/devices";
import { formatDate } from "@/lib/utils";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

const createSchema = z.object({
  name: z.string().min(1, "Nama wajib diisi"),
  device_guid: z.string().optional(),
  expires_at: z.string().optional(),
});

type CreateForm = z.infer<typeof createSchema>;

export default function APIKeysPage() {
  const queryClient = useQueryClient();
  const [page, setPage] = React.useState(1);
  const [limit, setLimit] = React.useState(10);
  const [search] = React.useState("");

  // Dialog states
  const [createOpen, setCreateOpen] = React.useState(false);
  const [deleteOpen, setDeleteOpen] = React.useState(false);
  const [selectedRow, setSelectedRow] = React.useState<APIKey | null>(null);
  const [newlyCreatedKey, setNewlyCreatedKey] = React.useState<string | null>(null);
  const [showKey, setShowKey] = React.useState(false);
  const [copied, setCopied] = React.useState(false);

  // Fetch API keys
  const { data, isLoading, isFetching } = useQuery({
    queryKey: ["api-keys", page, limit, search],
    queryFn: () =>
      apiKeyApi.list({ page, limit, search: search || undefined }),
  });

  // Fetch devices for dropdown
  const { data: deviceData } = useQuery({
    queryKey: ["devices-all"],
    queryFn: () => deviceApi.list({ limit: 1000 }).then((r) => r.items ?? []),
  });

  // Mutations
  const createMutation = useMutation({
    mutationFn: (data: CreateAPIKeyRequest) => apiKeyApi.create(data),
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: ["api-keys"] });
      setCreateOpen(false);
      // Show the full key ONCE
      const key = response.data.data.key_full;
      if (key) {
        setNewlyCreatedKey(key);
        setShowKey(true);
      }
      form.reset();
    },
    onError: (e: unknown) => {
      const error = e as { response?: { data?: { error?: { message?: string } } } };
      toast.error(error?.response?.data?.error?.message ?? "Gagal membuat API key");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (guid: string) => apiKeyApi.delete(guid),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["api-keys"] });
      setDeleteOpen(false);
      toast.success("API key berhasil direvoke");
    },
    onError: (e: unknown) => {
      const error = e as { response?: { data?: { error?: { message?: string } } } };
      toast.error(error?.response?.data?.error?.message ?? "Gagal merevoke API key");
    },
  });

  const form = useForm<CreateForm>({
    resolver: zodResolver(createSchema),
    defaultValues: { name: "", device_guid: "", expires_at: "" },
  });

  const columns: ColumnDef<APIKey>[] = [
    {
      accessorKey: "name",
      header: "Nama",
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
            <Key className="h-4 w-4 text-primary" />
          </div>
          <span className="font-medium">{row.original.name}</span>
        </div>
      ),
    },
    {
      accessorKey: "key_masked",
      header: "API Key",
      cell: ({ row }) => (
        <code className="text-xs font-mono text-muted-foreground">
          {row.original.key_masked}
        </code>
      ),
    },
    {
      accessorKey: "device_sn",
      header: "Device",
      cell: ({ row }) =>
        row.original.device_sn ? (
          <code className="text-xs font-mono">{row.original.device_sn}</code>
        ) : (
          <span className="text-muted-foreground">Semua device</span>
        ),
    },
    {
      accessorKey: "is_active",
      header: "Status",
      cell: ({ row }) => (
        <Badge variant={row.original.is_active ? "default" : "secondary"}>
          {row.original.is_active ? "Aktif" : "Revoked"}
        </Badge>
      ),
    },
    {
      accessorKey: "expires_at",
      header: "Berlaku Hingga",
      cell: ({ row }) =>
        row.original.expires_at ? (
          formatDate(row.original.expires_at)
        ) : (
          <span className="text-muted-foreground">Tidak terbatas</span>
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
          onDelete={
            row.original.is_active
              ? () => { setSelectedRow(row.original); setDeleteOpen(true); }
              : undefined
          }
        />
      ),
    },
  ];

  const deviceOptions = [
    { value: "", label: "Semua device" },
    ...(deviceData?.map((d) => ({ value: d.guid, label: `${d.name} (${d.serial_number})` })) ?? []),
  ];

  const items = data?.items ?? [];

  const handleCopyKey = () => {
    if (newlyCreatedKey) {
      navigator.clipboard.writeText(newlyCreatedKey);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="space-y-6">
      {/* Newly Created Key Dialog */}
      <Dialog open={!!newlyCreatedKey} onOpenChange={(o) => !o && setNewlyCreatedKey(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>API Key Berhasil Dibuat!</DialogTitle>
            <DialogDescription>
              Simpan API key ini di tempat yang aman. Key tidak akan ditampilkan lagi.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <code className="flex-1 break-all rounded-md bg-muted p-3 text-sm font-mono">
                {showKey ? newlyCreatedKey : "•".repeat(Math.min(newlyCreatedKey?.length ?? 40, 40))}
              </code>
              <Button
                variant="outline"
                size="icon"
                onClick={() => setShowKey((s) => !s)}
              >
                {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
            </div>
            <Button variant="outline" className="w-full" onClick={handleCopyKey}>
              {copied ? <Check className="h-4 w-4 mr-2" /> : <Copy className="h-4 w-4 mr-2" />}
              {copied ? "Tersalin!" : "Salin API Key"}
            </Button>
          </div>
          <DialogFooter>
            <Button onClick={() => setNewlyCreatedKey(null)} className="w-full">
              Saya sudah menyimpan key ini
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm */}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Revoke API Key?</AlertDialogTitle>
            <AlertDialogDescription>
              API key <strong>{selectedRow?.name}</strong> akan dinonaktifkan. Device yang menggunakan key ini akan kehilangan akses.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => selectedRow && deleteMutation.mutate(selectedRow.guid)}
              disabled={deleteMutation.isPending}
              className="bg-destructive hover:bg-destructive/90"
            >
              {deleteMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Revoke"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">API Keys</h1>
          <p className="text-muted-foreground">
            Kelola API key untuk device authentication — {data?.total ?? 0} key
          </p>
        </div>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Buat API Key
        </Button>
      </div>

      {/* Create Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Buat API Key Baru</DialogTitle>
            <DialogDescription>
              API key akan langsung ditampilkan setelah dibuat. Simpan di tempat yang aman.
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit((d) => createMutation.mutate(d))}
              className="space-y-4"
            >
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nama Key <span className="text-destructive">*</span></FormLabel>
                    <FormControl>
                      <Input placeholder="Production Key" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="device_guid"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Device (Opsional)</FormLabel>
                    <Select
                      value={field.value ?? ""}
                      onValueChange={field.onChange}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Semua device" />
                      </SelectTrigger>
                      <SelectContent>
                        {deviceOptions.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value}>
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="expires_at"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Berlaku Hingga (Opsional)</FormLabel>
                    <FormControl>
                      <Input type="datetime-local" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button
                  type="submit"
                  disabled={createMutation.isPending}
                  className="w-full"
                >
                  {createMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Buat API Key
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Table */}
      <Card>
        <CardContent className="p-6">
          <DataTable
            columns={columns}
            data={items}
            searchPlaceholder="Cari nama API key..."
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
    </div>
  );
}