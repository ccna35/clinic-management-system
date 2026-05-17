import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Pencil, Plus, Power, Stethoscope } from "lucide-react";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { api } from "../api/client";
import type { ApiListResponse, ApiResponse } from "../api/client";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import {
  Card,
  CardContent,
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

interface Doctor {
  id: string;
  name: string;
  specialty: string;
  phone: string | null;
  email: string | null;
  isActive: boolean;
}

const doctorFormSchema = z.object({
  name: z.string().min(2, "Name is required"),
  specialty: z.string().min(2, "Specialty is required"),
  phone: z.string(),
  email: z.union([z.literal(""), z.string().email("Invalid email")]),
  isActive: z.enum(["true", "false"]),
});

type DoctorFormValues = z.infer<typeof doctorFormSchema>;

const defaultDoctorValues: DoctorFormValues = {
  name: "",
  specialty: "",
  phone: "",
  email: "",
  isActive: "true",
};

export function DoctorsPage() {
  const queryClient = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);
  const [editingDoctor, setEditingDoctor] = useState<Doctor | null>(null);
  const [confirmDoctor, setConfirmDoctor] = useState<Doctor | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { errors },
  } = useForm<DoctorFormValues>({
    resolver: zodResolver(doctorFormSchema),
    defaultValues: defaultDoctorValues,
  });

  const doctorsQuery = useQuery({
    queryKey: ["doctors"],
    queryFn: async () => {
      const response = await api.get<ApiListResponse<Doctor>>(
        "/api/doctors?limit=50&page=1",
      );
      return response.data.data;
    },
  });

  const createDoctorMutation = useMutation({
    mutationFn: async (values: DoctorFormValues) => {
      return api.post<ApiResponse<Doctor>>("/api/doctors", {
        name: values.name,
        specialty: values.specialty,
        phone: values.phone || undefined,
        email: values.email || undefined,
        isActive: values.isActive === "true",
      });
    },
    onSuccess: async () => {
      toast.success("Doctor created");
      setCreateOpen(false);
      reset(defaultDoctorValues);
      await queryClient.invalidateQueries({ queryKey: ["doctors"] });
    },
    onError: () => toast.error("Could not create doctor"),
  });

  const updateDoctorMutation = useMutation({
    mutationFn: async ({
      id,
      values,
    }: {
      id: string;
      values: DoctorFormValues;
    }) => {
      return api.patch<ApiResponse<Doctor>>(`/api/doctors/${id}`, {
        name: values.name,
        specialty: values.specialty,
        phone: values.phone || null,
        email: values.email || null,
        isActive: values.isActive === "true",
      });
    },
    onSuccess: async () => {
      toast.success("Doctor updated");
      setEditingDoctor(null);
      reset(defaultDoctorValues);
      await queryClient.invalidateQueries({ queryKey: ["doctors"] });
    },
    onError: () => toast.error("Could not update doctor"),
  });

  const statusMutation = useMutation({
    mutationFn: async (doctor: Doctor) => {
      return api.patch(`/api/doctors/${doctor.id}`, {
        isActive: !doctor.isActive,
      });
    },
    onSuccess: async (_, doctor) => {
      toast.success(
        doctor.isActive ? "Doctor deactivated" : "Doctor activated",
      );
      await queryClient.invalidateQueries({ queryKey: ["doctors"] });
    },
    onError: () => toast.error("Status change failed"),
  });

  function openCreateModal(): void {
    reset(defaultDoctorValues);
    setEditingDoctor(null);
    setCreateOpen(true);
  }

  function openEditModal(doctor: Doctor): void {
    setCreateOpen(false);
    setEditingDoctor(doctor);
    reset({
      name: doctor.name,
      specialty: doctor.specialty,
      phone: doctor.phone ?? "",
      email: doctor.email ?? "",
      isActive: doctor.isActive ? "true" : "false",
    });
  }

  async function submitCreate(values: DoctorFormValues): Promise<void> {
    await createDoctorMutation.mutateAsync(values);
  }

  async function submitUpdate(values: DoctorFormValues): Promise<void> {
    if (!editingDoctor) {
      return;
    }

    await updateDoctorMutation.mutateAsync({ id: editingDoctor.id, values });
  }

  async function confirmStatusChange(): Promise<void> {
    if (!confirmDoctor) {
      return;
    }

    await statusMutation.mutateAsync(confirmDoctor);
    setConfirmDoctor(null);
  }

  // Card metrics
  const total = doctorsQuery.data?.length ?? 0;
  const active = doctorsQuery.data?.filter((d) => d.isActive).length ?? 0;
  const inactive = total - active;

  return (
    <div className="animate-soft-in space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
        <Card className="flex flex-col items-center justify-center gap-2 py-6 border-blue-100 bg-blue-50">
          <Stethoscope className="h-8 w-8 text-blue-700 mb-1" />
          <div className="text-xs font-semibold uppercase text-blue-700">
            Total Doctors
          </div>
          <div className="text-2xl font-bold text-blue-900">{total}</div>
        </Card>
        <Card className="flex flex-col items-center justify-center gap-2 py-6 border-emerald-100 bg-emerald-50">
          <Power className="h-8 w-8 text-emerald-600 mb-1" />
          <div className="text-xs font-semibold uppercase text-emerald-700">
            Active
          </div>
          <div className="text-2xl font-bold text-emerald-900">{active}</div>
        </Card>
        <Card className="flex flex-col items-center justify-center gap-2 py-6 border-slate-200 bg-slate-50">
          <Power className="h-8 w-8 text-slate-500 mb-1" />
          <div className="text-xs font-semibold uppercase text-slate-700">
            Inactive
          </div>
          <div className="text-2xl font-bold text-slate-900">{inactive}</div>
        </Card>
      </div>

      {/* Add Doctor Button aligned right above table */}
      <div className="flex justify-end mt-2">
        <Button type="button" onClick={openCreateModal}>
          <Plus className="mr-2 h-4 w-4" />
          Add Doctor
        </Button>
      </div>

      <Card className="animate-fade-up rounded-md stagger-1">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Stethoscope className="h-5 w-5 text-blue-700" />
            Doctor List
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {doctorsQuery.isLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : null}

          {!doctorsQuery.isLoading && !doctorsQuery.data?.length ? (
            <p className="rounded-md border border-dashed border-slate-300 bg-slate-50 px-4 py-6 text-center text-sm text-slate-500">
              No doctors available.
            </p>
          ) : null}

          {doctorsQuery.data?.length ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Specialty</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {doctorsQuery.data.map((doctor) => (
                    <TableRow key={doctor.id}>
                      <TableCell className="font-medium">
                        {doctor.name}
                      </TableCell>
                      <TableCell>
                        <Badge variant="scheduled">{doctor.specialty}</Badge>
                      </TableCell>
                      <TableCell>{doctor.phone ?? "-"}</TableCell>
                      <TableCell>{doctor.email ?? "-"}</TableCell>
                      <TableCell>
                        <Badge
                          variant={doctor.isActive ? "completed" : "default"}
                        >
                          {doctor.isActive ? "ACTIVE" : "INACTIVE"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => openEditModal(doctor)}
                          >
                            <Pencil className="mr-1 h-3.5 w-3.5" />
                            Edit
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              if (doctor.isActive) {
                                setConfirmDoctor(doctor);
                                return;
                              }

                              statusMutation.mutate(doctor);
                            }}
                            disabled={statusMutation.isPending}
                          >
                            <Power className="mr-1 h-3.5 w-3.5" />
                            {doctor.isActive ? "Deactivate" : "Activate"}
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
        title="Add Doctor"
        description="Create a provider profile."
      >
        <form
          className="grid gap-4 md:grid-cols-2"
          onSubmit={handleSubmit(submitCreate)}
        >
          <div className="space-y-2">
            <Label htmlFor="doctor-create-name">Name</Label>
            <Input id="doctor-create-name" {...register("name")} />
            {errors.name ? (
              <p className="text-xs text-rose-600">{errors.name.message}</p>
            ) : null}
          </div>

          <div className="space-y-2">
            <Label htmlFor="doctor-create-specialty">Specialty</Label>
            <Input id="doctor-create-specialty" {...register("specialty")} />
            {errors.specialty ? (
              <p className="text-xs text-rose-600">
                {errors.specialty.message}
              </p>
            ) : null}
          </div>

          <div className="space-y-2">
            <Label htmlFor="doctor-create-phone">Phone</Label>
            <Input id="doctor-create-phone" {...register("phone")} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="doctor-create-email">Email</Label>
            <Input
              id="doctor-create-email"
              type="email"
              {...register("email")}
            />
            {errors.email ? (
              <p className="text-xs text-rose-600">{errors.email.message}</p>
            ) : null}
          </div>

          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="doctor-create-active">Status</Label>
            <Controller
              name="isActive"
              control={control}
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger id="doctor-create-active">
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="true">ACTIVE</SelectItem>
                    <SelectItem value="false">INACTIVE</SelectItem>
                  </SelectContent>
                </Select>
              )}
            />
          </div>

          <div className="md:col-span-2 flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setCreateOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={createDoctorMutation.isPending}>
              {createDoctorMutation.isPending ? "Saving..." : "Create Doctor"}
            </Button>
          </div>
        </form>
      </Modal>

      <Modal
        open={Boolean(editingDoctor)}
        onClose={() => setEditingDoctor(null)}
        title="Edit Doctor"
        description="Update provider details and status."
      >
        <form
          className="grid gap-4 md:grid-cols-2"
          onSubmit={handleSubmit(submitUpdate)}
        >
          <div className="space-y-2">
            <Label htmlFor="doctor-edit-name">Name</Label>
            <Input id="doctor-edit-name" {...register("name")} />
            {errors.name ? (
              <p className="text-xs text-rose-600">{errors.name.message}</p>
            ) : null}
          </div>

          <div className="space-y-2">
            <Label htmlFor="doctor-edit-specialty">Specialty</Label>
            <Input id="doctor-edit-specialty" {...register("specialty")} />
            {errors.specialty ? (
              <p className="text-xs text-rose-600">
                {errors.specialty.message}
              </p>
            ) : null}
          </div>

          <div className="space-y-2">
            <Label htmlFor="doctor-edit-phone">Phone</Label>
            <Input id="doctor-edit-phone" {...register("phone")} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="doctor-edit-email">Email</Label>
            <Input id="doctor-edit-email" type="email" {...register("email")} />
            {errors.email ? (
              <p className="text-xs text-rose-600">{errors.email.message}</p>
            ) : null}
          </div>

          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="doctor-edit-active">Status</Label>
            <Controller
              name="isActive"
              control={control}
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger id="doctor-edit-active">
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="true">ACTIVE</SelectItem>
                    <SelectItem value="false">INACTIVE</SelectItem>
                  </SelectContent>
                </Select>
              )}
            />
          </div>

          <div className="md:col-span-2 flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setEditingDoctor(null)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={updateDoctorMutation.isPending}>
              {updateDoctorMutation.isPending ? "Saving..." : "Update Doctor"}
            </Button>
          </div>
        </form>
      </Modal>

      <Modal
        open={Boolean(confirmDoctor)}
        onClose={() => setConfirmDoctor(null)}
        title="Deactivate Doctor"
        description={
          confirmDoctor
            ? `Are you sure you want to deactivate ${confirmDoctor.name}? They will not be available for new bookings.`
            : undefined
        }
        maxWidthClassName="max-w-lg"
      >
        <div className="flex justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => setConfirmDoctor(null)}
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
