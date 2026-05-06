"use client";

import * as React from "react";
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
import { Button } from "@/components/ui/button";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

// Generic form field types
type FormFieldConfig<T> = {
  name: keyof T;
  label: string;
  type?: "text" | "number" | "email" | "password" | "select";
  placeholder?: string;
  required?: boolean;
  options?: { value: string; label: string }[];
};

// Generic CRUD Dialog Props
interface CrudDialogsProps<T, TCreate extends z.ZodType, TUpdate extends z.ZodType> {
  // Dialog open states
  createOpen: boolean;
  editOpen: boolean;
  deleteOpen: boolean;
  setCreateOpen: (open: boolean) => void;
  setEditOpen: (open: boolean) => void;
  setDeleteOpen: (open: boolean) => void;

  // Data
  selectedRow: T | null;
  isLoading?: boolean;

  // API handlers
  onCreate: (data: z.infer<TCreate>) => Promise<unknown>;
  onUpdate: (guid: string, data: z.infer<TUpdate>) => Promise<unknown>;
  onDelete: (guid: string) => Promise<unknown>;

  // Form configs
  createFields: FormFieldConfig<z.infer<TCreate>>[];
  updateFields: FormFieldConfig<z.infer<TUpdate>>[];
  formSchema: {
    create: TCreate;
    update: TUpdate;
  };

  // Labels
  title: string;
  itemName?: (row: T) => string;
  getGuid?: (row: T) => string;
}

export function CrudDialogs<T, TCreate extends z.ZodType, TUpdate extends z.ZodType>(
  props: CrudDialogsProps<T, TCreate, TUpdate>
) {
  const {
    createOpen, editOpen, deleteOpen,
    setCreateOpen, setEditOpen, setDeleteOpen,
    selectedRow, isLoading,
    onCreate, onUpdate, onDelete,
    createFields, updateFields, formSchema,
    title,
  } = props;

  const [submitting, setSubmitting] = React.useState(false);

  const handleCreate = async (data: z.infer<TCreate>) => {
    setSubmitting(true);
    try {
      await onCreate(data);
      toast.success(`${title} berhasil dibuat`);
      setCreateOpen(false);
    } catch (e: unknown) {
      const error = e as { response?: { data?: { error?: { message?: string } } } };
      toast.error(error?.response?.data?.error?.message ?? `${title} gagal dibuat`);
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdate = async (data: z.infer<TUpdate>) => {
    if (!props.getGuid || !selectedRow) return;
    setSubmitting(true);
    try {
      await onUpdate(props.getGuid(selectedRow), data);
      toast.success(`${title} berhasil diupdate`);
      setEditOpen(false);
    } catch (e: unknown) {
      const error = e as { response?: { data?: { error?: { message?: string } } } };
      toast.error(error?.response?.data?.error?.message ?? `${title} gagal diupdate`);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!props.getGuid || !selectedRow) return;
    setSubmitting(true);
    try {
      await onDelete(props.getGuid(selectedRow));
      toast.success(`${title} berhasil dihapus`);
      setDeleteOpen(false);
    } catch (e: unknown) {
      const error = e as { response?: { data?: { error?: { message?: string } } } };
      toast.error(error?.response?.data?.error?.message ?? `${title} gagal dihapus`);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      {/* CREATE Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Tambah {title}</DialogTitle>
            <DialogDescription>
              Lengkapi form untuk menambahkan {title.toLowerCase()} baru.
            </DialogDescription>
          </DialogHeader>
          <GenericForm
            fields={createFields}
            schema={formSchema.create}
            onSubmit={handleCreate}
            isLoading={submitting}
            submitLabel={`Simpan`}
          />
        </DialogContent>
      </Dialog>

      {/* EDIT Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit {title}</DialogTitle>
            <DialogDescription>
              Lengkapi form untuk mengedit {title.toLowerCase()}.
            </DialogDescription>
          </DialogHeader>
          {isLoading ? (
            <div className="space-y-3">
              {updateFields.map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : (
            <GenericForm
              fields={updateFields}
              schema={formSchema.update}
              onSubmit={handleUpdate}
              defaultValues={selectedRow as z.infer<TUpdate>}
              isLoading={submitting}
              submitLabel="Update"
            />
          )}
        </DialogContent>
      </Dialog>

      {/* DELETE Alert Dialog */}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus {title}?</AlertDialogTitle>
            <AlertDialogDescription>
              Tindakan ini tidak dapat dibatalkan. {title}{" "}
              <strong>{selectedRow && props.itemName ? props.itemName(selectedRow) : ""}</strong>{" "}
              akan dihapus permanen.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={submitting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Hapus"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

// GenericForm - a simple generic form component
function GenericForm(props: {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  fields: FormFieldConfig<any>[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  schema: z.ZodType<any, any, any>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onSubmit: (data: any) => void;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  defaultValues?: any;
  isLoading?: boolean;
  submitLabel?: string;
}) {
  const { fields, schema, onSubmit, defaultValues, isLoading, submitLabel = "Simpan" } = props;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const form = useForm<any>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(schema as any),
    defaultValues: defaultValues ?? {},
    values: defaultValues,
  });

  React.useEffect(() => {
    if (defaultValues) {
      form.reset(defaultValues);
    }
  }, [defaultValues, form]);

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        {fields.map((field) => (
          <FormField
            key={String(field.name)}
            control={form.control}
            name={String(field.name)}
            render={({ field: formField }) => (
              <FormItem>
                <FormLabel>
                  {field.label}
                  {field.required && <span className="text-destructive ml-1">*</span>}
                </FormLabel>
                <FormControl>
                  {field.type === "select" ? (
                    <Select
                      value={String(formField.value ?? "")}
                      onValueChange={formField.onChange}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={field.placeholder} />
                      </SelectTrigger>
                      <SelectContent>
                        {field.options?.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value}>
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <Input
                      {...formField}
                      value={formField.value ?? ""}
                      placeholder={field.placeholder}
                      type={field.type ?? "text"}
                    />
                  )}
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        ))}
        <DialogFooter>
          <Button
            type="submit"
            disabled={isLoading}
            className="w-full"
          >
            {isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {submitLabel}
          </Button>
        </DialogFooter>
      </form>
    </Form>
  );
}