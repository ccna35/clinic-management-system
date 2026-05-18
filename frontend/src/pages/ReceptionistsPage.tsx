import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Pencil, Plus, Trash2, UserCog } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { api, getErrorMessage } from "../api/client";
import type { ApiListResponse, ApiResponse } from "../api/client";
import { Button } from "../components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Modal } from "../components/ui/modal";
import { Skeleton } from "../components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../components/ui/table";

interface Receptionist {
  id: string;
  name: string;
  email: string;
  role: string;
  createdAt: string;
}

const createSchema = z.object({
  name: z.string().min(2, "Name is required"),
  email: z.string().email("Invalid email"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

const editSchema = z.object({
  name: z.string().min(2, "Name is required"),
  email: z.string().email("Invalid email"),
});

type CreateFormValues = z.infer<typeof createSchema>;
type EditFormValues = z.infer<typeof editSchema>;

const defaultCreateValues: CreateFormValues = {
  name: "",
  email: "",
  password: "",
};
const defaultEditValues: EditFormValues = { name: "", email: "" };

export default function ReceptionistsPage() {
  const queryClient = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);
  const [editingReceptionist, setEditingReceptionist] =
    useState<Receptionist | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<Receptionist | null>(null);

  const createForm = useForm<CreateFormValues>({
    resolver: zodResolver(createSchema),
    defaultValues: defaultCreateValues,
  });

  const editForm = useForm<EditFormValues>({
    resolver: zodResolver(editSchema),
    defaultValues: defaultEditValues,
  });

  const receptionistsQuery = useQuery({
    queryKey: ["receptionists"],
    queryFn: async () => {
      const response = await api.get<ApiListResponse<Receptionist>>(
        "/api/receptionists?limit=50&page=1",
      );
      return response.data.data;
    },
  });

  const createMutation = useMutation({
    mutationFn: async (values: CreateFormValues) => {
      return api.post<ApiResponse<Receptionist>>("/api/receptionists", values);
    },
    onSuccess: async () => {
      toast.success("Receptionist created");
      setCreateOpen(false);
      createForm.reset(defaultCreateValues);
      await queryClient.invalidateQueries({ queryKey: ["receptionists"] });
    },
    onError: (error) =>
      toast.error(getErrorMessage(error, "Could not create receptionist")),
  });

  const updateMutation = useMutation({
    mutationFn: async ({
      id,
      values,
    }: {
      id: string;
      values: EditFormValues;
    }) => {
      return api.patch<ApiResponse<Receptionist>>(
        `/api/receptionists/${id}`,
        values,
      );
    },
    onSuccess: async () => {
      toast.success("Receptionist updated");
      setEditingReceptionist(null);
      editForm.reset(defaultEditValues);
      await queryClient.invalidateQueries({ queryKey: ["receptionists"] });
    },
    onError: (error) =>
      toast.error(getErrorMessage(error, "Could not update receptionist")),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => api.delete(`/api/receptionists/${id}`),
    onSuccess: async () => {
      toast.success("Receptionist deleted");
      setConfirmDelete(null);
      await queryClient.invalidateQueries({ queryKey: ["receptionists"] });
    },
    onError: (error) =>
      toast.error(getErrorMessage(error, "Could not delete receptionist")),
  });

  function openCreateModal(): void {
    createForm.reset(defaultCreateValues);
    setCreateOpen(true);
  }

  function openEditModal(r: Receptionist): void {
    setEditingReceptionist(r);
    editForm.reset({ name: r.name, email: r.email });
  }

  async function submitCreate(values: CreateFormValues): Promise<void> {
    await createMutation.mutateAsync(values);
  }

  async function submitEdit(values: EditFormValues): Promise<void> {
    if (!editingReceptionist) return;
    await updateMutation.mutateAsync({ id: editingReceptionist.id, values });
  }

  const total = receptionistsQuery.data?.length ?? 0;

  return (
    <div className="animate-soft-in space-y-6">
      {/* Summary Card */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card className="flex items-center gap-4 p-5">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-50">
            <UserCog className="h-5 w-5 text-blue-600" />
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
              Total Receptionists
            </p>
            <p className="text-2xl font-bold text-slate-900">{total}</p>
          </div>
        </Card>
      </div>

      <div className="flex justify-end">
        <Button type="button" onClick={openCreateModal}>
          <Plus className="mr-2 h-4 w-4" />
          Add Receptionist
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserCog className="h-4 w-4 text-blue-600" />
            Receptionist List
          </CardTitle>
          <CardDescription>{total} receptionists total</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 pt-5">
          {receptionistsQuery.isLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : null}

          {!receptionistsQuery.isLoading && !receptionistsQuery.data?.length ? (
            <p className="rounded-md border border-dashed border-slate-300 bg-slate-50 px-4 py-6 text-center text-sm text-slate-500">
              No receptionists found.
            </p>
          ) : null}

          {receptionistsQuery.data?.length ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {receptionistsQuery.data.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell className="font-medium">{r.name}</TableCell>
                      <TableCell>{r.email}</TableCell>
                      <TableCell>
                        {new Date(r.createdAt).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => openEditModal(r)}
                          >
                            <Pencil className="mr-1 h-3.5 w-3.5" />
                            Edit
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            className="text-rose-600 hover:text-rose-700"
                            onClick={() => setConfirmDelete(r)}
                          >
                            <Trash2 className="mr-1 h-3.5 w-3.5" />
                            Delete
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : null}
        </CardContent>
      </Card>

      {/* Create Modal */}
      <Modal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        title="Add Receptionist"
        description="Create a new receptionist account."
      >
        <form
          className="grid gap-4"
          onSubmit={createForm.handleSubmit(submitCreate)}
        >
          <div className="space-y-2">
            <Label htmlFor="r-create-name">Name</Label>
            <Input id="r-create-name" {...createForm.register("name")} />
            {createForm.formState.errors.name ? (
              <p className="text-xs text-rose-600">
                {createForm.formState.errors.name.message}
              </p>
            ) : null}
          </div>

          <div className="space-y-2">
            <Label htmlFor="r-create-email">Email</Label>
            <Input
              id="r-create-email"
              type="email"
              {...createForm.register("email")}
            />
            {createForm.formState.errors.email ? (
              <p className="text-xs text-rose-600">
                {createForm.formState.errors.email.message}
              </p>
            ) : null}
          </div>

          <div className="space-y-2">
            <Label htmlFor="r-create-password">Password</Label>
            <Input
              id="r-create-password"
              type="password"
              {...createForm.register("password")}
            />
            {createForm.formState.errors.password ? (
              <p className="text-xs text-rose-600">
                {createForm.formState.errors.password.message}
              </p>
            ) : null}
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setCreateOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={createMutation.isPending}>
              {createMutation.isPending ? "Creating..." : "Create"}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Edit Modal */}
      <Modal
        open={!!editingReceptionist}
        onClose={() => setEditingReceptionist(null)}
        title="Edit Receptionist"
        description="Update name or email."
      >
        <form
          className="grid gap-4"
          onSubmit={editForm.handleSubmit(submitEdit)}
        >
          <div className="space-y-2">
            <Label htmlFor="r-edit-name">Name</Label>
            <Input id="r-edit-name" {...editForm.register("name")} />
            {editForm.formState.errors.name ? (
              <p className="text-xs text-rose-600">
                {editForm.formState.errors.name.message}
              </p>
            ) : null}
          </div>

          <div className="space-y-2">
            <Label htmlFor="r-edit-email">Email</Label>
            <Input
              id="r-edit-email"
              type="email"
              {...editForm.register("email")}
            />
            {editForm.formState.errors.email ? (
              <p className="text-xs text-rose-600">
                {editForm.formState.errors.email.message}
              </p>
            ) : null}
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setEditingReceptionist(null)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={updateMutation.isPending}>
              {updateMutation.isPending ? "Saving..." : "Save"}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        open={!!confirmDelete}
        onClose={() => setConfirmDelete(null)}
        title="Delete Receptionist"
        description={`Are you sure you want to delete "${confirmDelete?.name}"? This cannot be undone.`}
      >
        <div className="flex justify-end gap-2 pt-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => setConfirmDelete(null)}
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="destructive"
            disabled={deleteMutation.isPending}
            onClick={() => {
              if (confirmDelete) deleteMutation.mutate(confirmDelete.id);
            }}
          >
            {deleteMutation.isPending ? "Deleting..." : "Delete"}
          </Button>
        </div>
      </Modal>
    </div>
  );
}
