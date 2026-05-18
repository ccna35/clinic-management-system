import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Pencil, Plus, Power } from "lucide-react";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { api, getErrorMessage } from "../api/client";
import type { ApiListResponse, ApiResponse } from "../api/client";
import { Badge } from "../components/ui/badge";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";
import { Skeleton } from "../components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../components/ui/table";
import { Textarea } from "../components/ui/textarea";
import { Link } from "react-router-dom";

interface Patient {
  id: string;
  name: string;
  phone: string;
  age: number | null;
  gender: "MALE" | "FEMALE" | null;
  notes: string | null;
  status: "ACTIVE" | "INACTIVE";
}

const patientFormSchema = z.object({
  name: z.string().min(2, "Name is required"),
  phone: z.string().min(7, "Phone is required"),
  age: z
    .string()
    .optional()
    .refine(
      (value) =>
        !value ||
        (!Number.isNaN(Number(value)) &&
          Number(value) >= 0 &&
          Number(value) <= 120),
      {
        message: "Age must be between 0 and 120",
      },
    ),
  gender: z.enum(["MALE", "FEMALE"]),
  notes: z.string().optional(),
});

type PatientFormValues = z.infer<typeof patientFormSchema>;

const defaultPatientValues: PatientFormValues = {
  name: "",
  phone: "",
  age: "",
  gender: "MALE",
  notes: "",
};

export function PatientsPage() {
  const queryClient = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);
  const [editingPatient, setEditingPatient] = useState<Patient | null>(null);
  const [confirmPatient, setConfirmPatient] = useState<Patient | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { errors },
  } = useForm<PatientFormValues>({
    resolver: zodResolver(patientFormSchema),
    defaultValues: defaultPatientValues,
  });

  const patientsQuery = useQuery({
    queryKey: ["patients"],
    queryFn: async () => {
      const response = await api.get<ApiListResponse<Patient>>(
        "/api/patients?limit=50&page=1",
      );
      return response.data.data;
    },
  });

  const createPatientMutation = useMutation({
    mutationFn: async (values: PatientFormValues) => {
      return api.post<ApiResponse<Patient>>("/api/patients", {
        name: values.name,
        phone: values.phone,
        age: values.age ? Number(values.age) : undefined,
        gender: values.gender,
        notes: values.notes || undefined,
      });
    },
    onSuccess: async () => {
      toast.success("Patient created");
      setCreateOpen(false);
      reset(defaultPatientValues);
      await queryClient.invalidateQueries({ queryKey: ["patients"] });
    },
    onError: (error) => {
      toast.error(getErrorMessage(error, "Could not create patient"));
    },
  });

  const updatePatientMutation = useMutation({
    mutationFn: async ({
      id,
      values,
    }: {
      id: string;
      values: PatientFormValues;
    }) => {
      return api.patch<ApiResponse<Patient>>(`/api/patients/${id}`, {
        name: values.name,
        phone: values.phone,
        age: values.age ? Number(values.age) : null,
        gender: values.gender,
        notes: values.notes || null,
      });
    },
    onSuccess: async () => {
      toast.success("Patient updated");
      setEditingPatient(null);
      reset(defaultPatientValues);
      await queryClient.invalidateQueries({ queryKey: ["patients"] });
    },
    onError: (error) => {
      toast.error(getErrorMessage(error, "Could not update patient"));
    },
  });

  const statusMutation = useMutation({
    mutationFn: async (patient: Patient) => {
      if (patient.status === "ACTIVE") {
        return api.delete(`/api/patients/${patient.id}`);
      }

      return api.patch(`/api/patients/${patient.id}`, { status: "ACTIVE" });
    },
    onSuccess: async (_, patient) => {
      toast.success(
        patient.status === "ACTIVE"
          ? "Patient deactivated"
          : "Patient activated",
      );
      await queryClient.invalidateQueries({ queryKey: ["patients"] });
    },
    onError: (error) =>
      toast.error(getErrorMessage(error, "Status change failed")),
  });

  function openCreateModal(): void {
    reset(defaultPatientValues);
    setEditingPatient(null);
    setCreateOpen(true);
  }

  function openEditModal(patient: Patient): void {
    setCreateOpen(false);
    setEditingPatient(patient);
    reset({
      name: patient.name,
      phone: patient.phone,
      age: patient.age === null ? "" : String(patient.age),
      gender: patient.gender ?? "MALE",
      notes: patient.notes ?? "",
    });
  }

  async function submitCreate(values: PatientFormValues): Promise<void> {
    await createPatientMutation.mutateAsync(values);
  }

  async function submitUpdate(values: PatientFormValues): Promise<void> {
    if (!editingPatient) {
      return;
    }

    await updatePatientMutation.mutateAsync({ id: editingPatient.id, values });
  }

  async function confirmStatusChange(): Promise<void> {
    if (!confirmPatient) {
      return;
    }

    await statusMutation.mutateAsync(confirmPatient);
    setConfirmPatient(null);
  }

  // Card metrics
  const total = patientsQuery.data?.length ?? 0;
  const active =
    patientsQuery.data?.filter((p) => p.status === "ACTIVE").length ?? 0;
  const inactive = total - active;

  return (
    <div className="animate-soft-in space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card className="flex items-center gap-4 p-5">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-50">
            <Plus className="h-5 w-5 text-blue-600" />
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
              Total Patients
            </p>
            <p className="text-2xl font-bold text-slate-900">{total}</p>
          </div>
        </Card>
        <Card className="flex items-center gap-4 p-5">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-50">
            <Power className="h-5 w-5 text-emerald-600" />
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
              Active
            </p>
            <p className="text-2xl font-bold text-slate-900">{active}</p>
          </div>
        </Card>
        <Card className="flex items-center gap-4 p-5">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-slate-100">
            <Power className="h-5 w-5 text-slate-500" />
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
              Inactive
            </p>
            <p className="text-2xl font-bold text-slate-900">{inactive}</p>
          </div>
        </Card>
      </div>

      {/* Add Patient Button aligned right above table */}
      <div className="flex justify-end mt-2">
        <Button type="button" onClick={openCreateModal}>
          <Plus className="mr-2 h-4 w-4" />
          Add Patient
        </Button>
      </div>

      <Card className="animate-fade-up stagger-2">
        <CardHeader>
          <CardTitle>Patient List</CardTitle>
          <CardDescription>
            {patientsQuery.data?.length ?? 0} patients total
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 pt-5">
          {patientsQuery.isLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : null}

          {!patientsQuery.isLoading && !patientsQuery.data?.length ? (
            <p className="rounded-md border border-dashed border-slate-300 bg-slate-50 px-4 py-6 text-center text-sm text-slate-500">
              No patients found.
            </p>
          ) : null}

          {patientsQuery.data?.length ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>Gender</TableHead>
                    <TableHead>Age</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {patientsQuery.data.map((patient) => (
                    <TableRow key={patient.id}>
                      <TableCell className="font-medium">
                        {patient.name}
                      </TableCell>
                      <TableCell>{patient.phone}</TableCell>
                      <TableCell>{patient.gender ?? "—"}</TableCell>
                      <TableCell>{patient.age ?? "—"}</TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            patient.status === "ACTIVE"
                              ? "completed"
                              : "default"
                          }
                        >
                          {patient.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Link
                            to={`/patients/${patient.id}`}
                            className="inline-flex items-center rounded-md border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors"
                          >
                            View Details
                          </Link>
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => openEditModal(patient)}
                          >
                            <Pencil className="mr-1 h-3.5 w-3.5" />
                            Edit
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              if (patient.status === "ACTIVE") {
                                setConfirmPatient(patient);
                                return;
                              }
                              statusMutation.mutate(patient);
                            }}
                            disabled={statusMutation.isPending}
                          >
                            <Power className="mr-1 h-3.5 w-3.5" />
                            {patient.status === "ACTIVE"
                              ? "Deactivate"
                              : "Activate"}
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

      <Modal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        title="Add Patient"
        description="Create a new patient record."
      >
        <form
          className="grid gap-4 md:grid-cols-2"
          onSubmit={handleSubmit(submitCreate)}
        >
          <div className="space-y-2">
            <Label htmlFor="create-name">Name</Label>
            <Input id="create-name" {...register("name")} />
            {errors.name ? (
              <p className="text-xs text-rose-600">{errors.name.message}</p>
            ) : null}
          </div>

          <div className="space-y-2">
            <Label htmlFor="create-phone">Phone</Label>
            <Input id="create-phone" {...register("phone")} />
            {errors.phone ? (
              <p className="text-xs text-rose-600">{errors.phone.message}</p>
            ) : null}
          </div>

          <div className="space-y-2">
            <Label htmlFor="create-age">Age</Label>
            <Input
              id="create-age"
              type="number"
              min={0}
              max={120}
              {...register("age")}
            />
            {errors.age ? (
              <p className="text-xs text-rose-600">{errors.age.message}</p>
            ) : null}
          </div>

          <div className="space-y-2">
            <Label htmlFor="create-gender">Gender</Label>
            <Controller
              name="gender"
              control={control}
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger id="create-gender">
                    <SelectValue placeholder="Select gender" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="MALE">Male</SelectItem>
                    <SelectItem value="FEMALE">Female</SelectItem>
                  </SelectContent>
                </Select>
              )}
            />
          </div>

          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="create-notes">Notes</Label>
            <Textarea id="create-notes" rows={3} {...register("notes")} />
          </div>

          <div className="md:col-span-2 flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setCreateOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={createPatientMutation.isPending}>
              {createPatientMutation.isPending ? "Saving..." : "Create Patient"}
            </Button>
          </div>
        </form>
      </Modal>

      <Modal
        open={Boolean(editingPatient)}
        onClose={() => setEditingPatient(null)}
        title="Edit Patient"
        description="Update patient details."
      >
        <form
          className="grid gap-4 md:grid-cols-2"
          onSubmit={handleSubmit(submitUpdate)}
        >
          <div className="space-y-2">
            <Label htmlFor="edit-name">Name</Label>
            <Input id="edit-name" {...register("name")} />
            {errors.name ? (
              <p className="text-xs text-rose-600">{errors.name.message}</p>
            ) : null}
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-phone">Phone</Label>
            <Input id="edit-phone" {...register("phone")} />
            {errors.phone ? (
              <p className="text-xs text-rose-600">{errors.phone.message}</p>
            ) : null}
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-age">Age</Label>
            <Input
              id="edit-age"
              type="number"
              min={0}
              max={120}
              {...register("age")}
            />
            {errors.age ? (
              <p className="text-xs text-rose-600">{errors.age.message}</p>
            ) : null}
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-gender">Gender</Label>
            <Controller
              name="gender"
              control={control}
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger id="edit-gender">
                    <SelectValue placeholder="Select gender" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="MALE">Male</SelectItem>
                    <SelectItem value="FEMALE">Female</SelectItem>
                  </SelectContent>
                </Select>
              )}
            />
          </div>

          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="edit-notes">Notes</Label>
            <Textarea id="edit-notes" rows={3} {...register("notes")} />
          </div>

          <div className="md:col-span-2 flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setEditingPatient(null)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={updatePatientMutation.isPending}>
              {updatePatientMutation.isPending ? "Saving..." : "Update Patient"}
            </Button>
          </div>
        </form>
      </Modal>

      <Modal
        open={Boolean(confirmPatient)}
        onClose={() => setConfirmPatient(null)}
        title="Deactivate Patient"
        description={
          confirmPatient
            ? `Are you sure you want to deactivate ${confirmPatient.name}? They will no longer be available for new appointments.`
            : undefined
        }
        maxWidthClassName="max-w-lg"
      >
        <div className="flex justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => setConfirmPatient(null)}
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={confirmStatusChange}
            disabled={statusMutation.isPending}
          >
            {statusMutation.isPending ? "Deactivating..." : "Yes, Deactivate"}
          </Button>
        </div>
      </Modal>
    </div>
  );
}
