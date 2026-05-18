import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  CalendarRange,
  CheckCircle2,
  Clock,
  Loader2,
  Pencil,
  Plus,
  RefreshCcw,
  Trash2,
} from "lucide-react";
import { useEffect, useState } from "react";
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

interface Appointment {
  id: string;
  date: string;
  status:
    | "SCHEDULED"
    | "WAITING"
    | "IN_PROGRESS"
    | "COMPLETED"
    | "CANCELLED"
    | "NO_SHOW";
  reason: string | null;
  statusTimeline: Array<{
    fromStatus: Appointment["status"] | null;
    toStatus: Appointment["status"];
    changedAt: string;
  }>;
  checkedInAt: string | null;
  inProgressAt: string | null;
  completedAt: string | null;
  actualWaitMinutes: number | null;
  liveWaitMinutes: number | null;
  patient: { id: string; name: string };
  doctor: { id: string; name: string; specialty: string };
}

interface PatientOption {
  id: string;
  name: string;
  status: "ACTIVE" | "INACTIVE";
}

interface DoctorOption {
  id: string;
  name: string;
  specialty: string;
  isActive: boolean;
}

const statusValues = [
  "SCHEDULED",
  "WAITING",
  "IN_PROGRESS",
  "COMPLETED",
  "CANCELLED",
  "NO_SHOW",
] as const;

const appointmentFormSchema = z.object({
  patientId: z.string().uuid("Patient is required"),
  doctorId: z.string().uuid("Doctor is required"),
  date: z.string().min(1, "Date/time is required"),
  reason: z.string().optional(),
  status: z.enum(statusValues),
});

const statusFormSchema = z.object({
  status: z.enum(statusValues),
});

type AppointmentFormValues = z.infer<typeof appointmentFormSchema>;
type StatusFormValues = z.infer<typeof statusFormSchema>;

const defaultAppointmentValues: AppointmentFormValues = {
  patientId: "",
  doctorId: "",
  date: "",
  reason: "",
  status: "SCHEDULED",
};

function statusVariant(
  status: string,
):
  | "scheduled"
  | "waiting"
  | "inprogress"
  | "completed"
  | "cancelled"
  | "noshow" {
  if (status === "WAITING") return "waiting";
  if (status === "IN_PROGRESS") return "inprogress";
  if (status === "COMPLETED") return "completed";
  if (status === "CANCELLED") return "cancelled";
  if (status === "NO_SHOW") return "noshow";
  return "scheduled";
}

function toDateTimeLocal(value: string): string {
  const date = new Date(value);
  const offset = date.getTimezoneOffset();
  const localDate = new Date(date.getTime() - offset * 60_000);
  return localDate.toISOString().slice(0, 16);
}

function toIsoDate(value: string): string {
  return new Date(value).toISOString();
}

function renderWaitValue(appointment: Appointment): string {
  if (appointment.actualWaitMinutes !== null) {
    return `${appointment.actualWaitMinutes} min`;
  }

  if (
    appointment.status === "WAITING" &&
    appointment.liveWaitMinutes !== null
  ) {
    return `${appointment.liveWaitMinutes} min (live)`;
  }

  return "N/A";
}

function formatStatusLabel(status: Appointment["status"]): string {
  return status.replaceAll("_", " ");
}

function timelineStatusMeta(status: Appointment["status"]): {
  title: string;
  description: string;
  dotClassName: string;
  cardClassName: string;
  titleClassName: string;
} {
  if (status === "WAITING") {
    return {
      title: "Checked In",
      description: "Patient arrived and is waiting for consultation.",
      dotClassName: "border-amber-500 bg-amber-100",
      cardClassName: "border-amber-200 bg-amber-50",
      titleClassName: "text-amber-800",
    };
  }

  if (status === "IN_PROGRESS") {
    return {
      title: "Consultation Started",
      description: "Patient entered the doctor room.",
      dotClassName: "border-indigo-500 bg-indigo-100",
      cardClassName: "border-indigo-200 bg-indigo-50",
      titleClassName: "text-indigo-800",
    };
  }

  if (status === "COMPLETED") {
    return {
      title: "Visit Completed",
      description: "Consultation and check-out completed.",
      dotClassName: "border-emerald-500 bg-emerald-100",
      cardClassName: "border-emerald-200 bg-emerald-50",
      titleClassName: "text-emerald-800",
    };
  }

  if (status === "CANCELLED") {
    return {
      title: "Cancelled",
      description: "Appointment was cancelled before completion.",
      dotClassName: "border-rose-500 bg-rose-100",
      cardClassName: "border-rose-200 bg-rose-50",
      titleClassName: "text-rose-800",
    };
  }

  if (status === "NO_SHOW") {
    return {
      title: "No Show",
      description: "Patient did not arrive for the appointment.",
      dotClassName: "border-slate-500 bg-slate-200",
      cardClassName: "border-slate-300 bg-slate-100",
      titleClassName: "text-slate-700",
    };
  }

  return {
    title: "Scheduled",
    description: "Appointment was booked and confirmed.",
    dotClassName: "border-blue-500 bg-blue-100",
    cardClassName: "border-blue-200 bg-blue-50",
    titleClassName: "text-blue-800",
  };
}

export function AppointmentsPage() {
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState("all");
  const [createOpen, setCreateOpen] = useState(false);
  const [editingAppointment, setEditingAppointment] =
    useState<Appointment | null>(null);
  const [statusAppointment, setStatusAppointment] =
    useState<Appointment | null>(null);
  const [timelineAppointment, setTimelineAppointment] =
    useState<Appointment | null>(null);
  const [confirmDeleteAppointment, setConfirmDeleteAppointment] =
    useState<Appointment | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { errors },
  } = useForm<AppointmentFormValues>({
    resolver: zodResolver(appointmentFormSchema),
    defaultValues: defaultAppointmentValues,
  });

  const {
    handleSubmit: handleStatusSubmit,
    reset: resetStatus,
    control: statusControl,
    formState: { errors: statusErrors },
  } = useForm<StatusFormValues>({
    resolver: zodResolver(statusFormSchema),
    defaultValues: {
      status: "SCHEDULED",
    },
  });

  const appointmentsQuery = useQuery({
    queryKey: ["appointments", statusFilter],
    queryFn: async () => {
      const search = new URLSearchParams({ page: "1", limit: "50" });
      if (statusFilter !== "all") {
        search.set("status", statusFilter);
      }
      const response = await api.get<ApiListResponse<Appointment>>(
        `/api/appointments?${search.toString()}`,
      );
      return response.data.data;
    },
  });

  const patientsQuery = useQuery({
    queryKey: ["patients-options"],
    queryFn: async () => {
      const response = await api.get<ApiListResponse<PatientOption>>(
        "/api/patients?limit=100&page=1&status=ACTIVE",
      );
      return response.data.data;
    },
  });

  const doctorsQuery = useQuery({
    queryKey: ["doctors-options"],
    queryFn: async () => {
      const response = await api.get<ApiListResponse<DoctorOption>>(
        "/api/doctors?limit=100&page=1&isActive=true",
      );
      return response.data.data;
    },
  });

  const createMutation = useMutation({
    mutationFn: async (values: AppointmentFormValues) => {
      return api.post<ApiResponse<Appointment>>("/api/appointments", {
        patientId: values.patientId,
        doctorId: values.doctorId,
        date: toIsoDate(values.date),
        reason: values.reason || undefined,
        status: values.status,
      });
    },
    onSuccess: async () => {
      toast.success("Appointment created");
      setCreateOpen(false);
      reset(defaultAppointmentValues);
      await queryClient.invalidateQueries({ queryKey: ["appointments"] });
    },
    onError: (error) =>
      toast.error(getErrorMessage(error, "Could not create appointment")),
  });

  const updateMutation = useMutation({
    mutationFn: async ({
      id,
      values,
    }: {
      id: string;
      values: AppointmentFormValues;
    }) => {
      return api.patch<ApiResponse<Appointment>>(`/api/appointments/${id}`, {
        patientId: values.patientId,
        doctorId: values.doctorId,
        date: toIsoDate(values.date),
        reason: values.reason || null,
        status: values.status,
      });
    },
    onSuccess: async () => {
      toast.success("Appointment updated");
      setEditingAppointment(null);
      reset(defaultAppointmentValues);
      await queryClient.invalidateQueries({ queryKey: ["appointments"] });
    },
    onError: (error) =>
      toast.error(getErrorMessage(error, "Could not update appointment")),
  });

  const statusMutation = useMutation({
    mutationFn: async ({
      id,
      status,
    }: {
      id: string;
      status: Appointment["status"];
    }) => {
      return api.patch<ApiResponse<Appointment>>(
        `/api/appointments/${id}/status`,
        { status },
      );
    },
    onSuccess: async () => {
      toast.success("Appointment status updated");
      setStatusAppointment(null);
      await queryClient.invalidateQueries({ queryKey: ["appointments"] });
    },
    onError: (error) =>
      toast.error(getErrorMessage(error, "Could not update status")),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => api.delete(`/api/appointments/${id}`),
    onSuccess: async () => {
      toast.success("Appointment deleted");
      await queryClient.invalidateQueries({ queryKey: ["appointments"] });
    },
    onError: (error) =>
      toast.error(getErrorMessage(error, "Could not delete appointment")),
  });

  function openCreateModal(): void {
    setEditingAppointment(null);
    reset(defaultAppointmentValues);
    setCreateOpen(true);
  }

  function openEditModal(appointment: Appointment): void {
    setCreateOpen(false);
    setEditingAppointment(appointment);
    reset({
      patientId: appointment.patient.id,
      doctorId: appointment.doctor.id,
      date: toDateTimeLocal(appointment.date),
      reason: appointment.reason ?? "",
      status: appointment.status,
    });
  }

  function openStatusModal(appointment: Appointment): void {
    setStatusAppointment(appointment);
    resetStatus({ status: appointment.status });
  }

  function openTimelineModal(appointment: Appointment): void {
    setTimelineAppointment(appointment);
  }

  useEffect(() => {
    if (!timelineAppointment) {
      return;
    }

    function onEscape(event: KeyboardEvent): void {
      if (event.key === "Escape") {
        setTimelineAppointment(null);
      }
    }

    window.addEventListener("keydown", onEscape);
    return () => window.removeEventListener("keydown", onEscape);
  }, [timelineAppointment]);

  async function submitCreate(values: AppointmentFormValues): Promise<void> {
    await createMutation.mutateAsync(values);
  }

  async function submitUpdate(values: AppointmentFormValues): Promise<void> {
    if (!editingAppointment) {
      return;
    }

    await updateMutation.mutateAsync({ id: editingAppointment.id, values });
  }

  async function submitStatus(values: StatusFormValues): Promise<void> {
    if (!statusAppointment) {
      return;
    }

    await statusMutation.mutateAsync({
      id: statusAppointment.id,
      status: values.status,
    });
  }

  async function confirmDelete(): Promise<void> {
    if (!confirmDeleteAppointment) {
      return;
    }

    await deleteMutation.mutateAsync(confirmDeleteAppointment.id);
    setConfirmDeleteAppointment(null);
  }

  // Card metrics
  const total = appointmentsQuery.data?.length ?? 0;
  const scheduled =
    appointmentsQuery.data?.filter((a) => a.status === "SCHEDULED").length ?? 0;
  const waiting =
    appointmentsQuery.data?.filter((a) => a.status === "WAITING").length ?? 0;
  const inprogress =
    appointmentsQuery.data?.filter((a) => a.status === "IN_PROGRESS").length ??
    0;
  const completed =
    appointmentsQuery.data?.filter((a) => a.status === "COMPLETED").length ?? 0;

  return (
    <div className="animate-soft-in space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <Card className="flex items-center gap-4 p-5">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-50">
            <CalendarRange className="h-5 w-5 text-blue-600" />
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
              Total
            </p>
            <p className="text-2xl font-bold text-slate-900">{total}</p>
          </div>
        </Card>
        <Card className="flex items-center gap-4 p-5">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-50">
            <CalendarRange className="h-5 w-5 text-blue-500" />
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
              Scheduled
            </p>
            <p className="text-2xl font-bold text-slate-900">{scheduled}</p>
          </div>
        </Card>
        <Card className="flex items-center gap-4 p-5">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-amber-50">
            <Clock className="h-5 w-5 text-amber-500" />
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
              Waiting
            </p>
            <p className="text-2xl font-bold text-slate-900">{waiting}</p>
          </div>
        </Card>
        <Card className="flex items-center gap-4 p-5">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-indigo-50">
            <Loader2 className="h-5 w-5 text-indigo-500" />
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
              In Progress
            </p>
            <p className="text-2xl font-bold text-slate-900">{inprogress}</p>
          </div>
        </Card>
        <Card className="flex items-center gap-4 p-5">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-50">
            <CheckCircle2 className="h-5 w-5 text-emerald-600" />
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
              Completed
            </p>
            <p className="text-2xl font-bold text-slate-900">{completed}</p>
          </div>
        </Card>
      </div>

      {/* Add Appointment Button aligned right above table */}
      <div className="flex justify-end mt-2">
        <Button type="button" onClick={openCreateModal}>
          <Plus className="mr-2 h-4 w-4" />
          Add Appointment
        </Button>
      </div>

      <Card className="animate-fade-up stagger-1">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CalendarRange className="h-4 w-4 text-blue-600" />
            Appointment List
          </CardTitle>
          <CardDescription>
            {appointmentsQuery.data?.length ?? 0} appointments total
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 pt-5">
          <div className="max-w-xs space-y-2">
            <Label>Status Filter</Label>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue placeholder="All statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="SCHEDULED">Scheduled</SelectItem>
                <SelectItem value="WAITING">Waiting</SelectItem>
                <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
                <SelectItem value="COMPLETED">Completed</SelectItem>
                <SelectItem value="CANCELLED">Cancelled</SelectItem>
                <SelectItem value="NO_SHOW">No show</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {appointmentsQuery.isLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : null}

          {!appointmentsQuery.isLoading && !appointmentsQuery.data?.length ? (
            <p className="rounded-md border border-dashed border-slate-300 bg-slate-50 px-4 py-6 text-center text-sm text-slate-500">
              No appointments match this filter.
            </p>
          ) : null}

          {appointmentsQuery.data?.length ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Patient</TableHead>
                    <TableHead>Doctor</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actual Wait</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {appointmentsQuery.data.map((item) => (
                    <TableRow
                      key={item.id}
                      className="cursor-pointer hover:bg-slate-50/80"
                      onClick={() => openTimelineModal(item)}
                    >
                      <TableCell>
                        {new Date(item.date).toLocaleString()}
                      </TableCell>
                      <TableCell className="font-medium">
                        {item.patient.name}
                      </TableCell>
                      <TableCell>
                        {item.doctor.name}{" "}
                        <span className="text-xs text-slate-500">
                          ({item.doctor.specialty})
                        </span>
                      </TableCell>
                      <TableCell>
                        <Badge variant={statusVariant(item.status)}>
                          {item.status}
                        </Badge>
                      </TableCell>
                      <TableCell>{renderWaitValue(item)}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={(event) => {
                              event.stopPropagation();
                              openEditModal(item);
                            }}
                          >
                            <Pencil className="mr-1 h-3.5 w-3.5" />
                            Edit
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            onClick={(event) => {
                              event.stopPropagation();
                              openStatusModal(item);
                            }}
                          >
                            <RefreshCcw className="mr-1 h-3.5 w-3.5" />
                            Status
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="destructive"
                            onClick={(event) => {
                              event.stopPropagation();
                              setConfirmDeleteAppointment(item);
                            }}
                            disabled={deleteMutation.isPending}
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

      <Modal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        title="Add Appointment"
        description="Create a new appointment using popup form flow."
      >
        <form
          className="grid gap-4 md:grid-cols-2"
          onSubmit={handleSubmit(submitCreate)}
        >
          <div className="space-y-2">
            <Label htmlFor="appointment-create-patient">Patient</Label>
            <Controller
              name="patientId"
              control={control}
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger id="appointment-create-patient">
                    <SelectValue placeholder="Select patient" />
                  </SelectTrigger>
                  <SelectContent>
                    {(patientsQuery.data ?? []).map((patient) => (
                      <SelectItem key={patient.id} value={patient.id}>
                        {patient.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {errors.patientId ? (
              <p className="text-xs text-rose-600">
                {errors.patientId.message}
              </p>
            ) : null}
            {patientsQuery.isError ? (
              <p className="text-xs text-rose-600">Could not load patients.</p>
            ) : null}
            {!patientsQuery.isLoading &&
            !patientsQuery.isError &&
            !(patientsQuery.data ?? []).length ? (
              <p className="text-xs text-amber-700">
                No active patients available.
              </p>
            ) : null}
          </div>

          <div className="space-y-2">
            <Label htmlFor="appointment-create-doctor">Doctor</Label>
            <Controller
              name="doctorId"
              control={control}
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger id="appointment-create-doctor">
                    <SelectValue placeholder="Select doctor" />
                  </SelectTrigger>
                  <SelectContent>
                    {(doctorsQuery.data ?? []).map((doctor) => (
                      <SelectItem key={doctor.id} value={doctor.id}>
                        {doctor.name} ({doctor.specialty})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {errors.doctorId ? (
              <p className="text-xs text-rose-600">{errors.doctorId.message}</p>
            ) : null}
            {doctorsQuery.isError ? (
              <p className="text-xs text-rose-600">Could not load doctors.</p>
            ) : null}
            {!doctorsQuery.isLoading &&
            !doctorsQuery.isError &&
            !(doctorsQuery.data ?? []).length ? (
              <p className="text-xs text-amber-700">
                No active doctors available.
              </p>
            ) : null}
          </div>

          <div className="space-y-2">
            <Label htmlFor="appointment-create-date">Date & Time</Label>
            <Input
              id="appointment-create-date"
              type="datetime-local"
              {...register("date")}
            />
            {errors.date ? (
              <p className="text-xs text-rose-600">{errors.date.message}</p>
            ) : null}
          </div>

          <div className="space-y-2">
            <Label htmlFor="appointment-create-status">Status</Label>
            <Controller
              name="status"
              control={control}
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger id="appointment-create-status">
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    {statusValues.map((item) => (
                      <SelectItem key={item} value={item}>
                        {item}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </div>

          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="appointment-create-reason">Reason</Label>
            <Textarea
              id="appointment-create-reason"
              rows={3}
              {...register("reason")}
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
            <Button
              type="submit"
              disabled={
                createMutation.isPending ||
                patientsQuery.isLoading ||
                doctorsQuery.isLoading
              }
            >
              {createMutation.isPending ? "Saving..." : "Create Appointment"}
            </Button>
          </div>
        </form>
      </Modal>

      <Modal
        open={Boolean(editingAppointment)}
        onClose={() => setEditingAppointment(null)}
        title="Edit Appointment"
        description="Update appointment details in popup flow."
      >
        <form
          className="grid gap-4 md:grid-cols-2"
          onSubmit={handleSubmit(submitUpdate)}
        >
          <div className="space-y-2">
            <Label htmlFor="appointment-edit-patient">Patient</Label>
            <Controller
              name="patientId"
              control={control}
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger id="appointment-edit-patient">
                    <SelectValue placeholder="Select patient" />
                  </SelectTrigger>
                  <SelectContent>
                    {(patientsQuery.data ?? []).map((patient) => (
                      <SelectItem key={patient.id} value={patient.id}>
                        {patient.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {errors.patientId ? (
              <p className="text-xs text-rose-600">
                {errors.patientId.message}
              </p>
            ) : null}
            {patientsQuery.isError ? (
              <p className="text-xs text-rose-600">Could not load patients.</p>
            ) : null}
            {!patientsQuery.isLoading &&
            !patientsQuery.isError &&
            !(patientsQuery.data ?? []).length ? (
              <p className="text-xs text-amber-700">
                No active patients available.
              </p>
            ) : null}
          </div>

          <div className="space-y-2">
            <Label htmlFor="appointment-edit-doctor">Doctor</Label>
            <Controller
              name="doctorId"
              control={control}
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger id="appointment-edit-doctor">
                    <SelectValue placeholder="Select doctor" />
                  </SelectTrigger>
                  <SelectContent>
                    {(doctorsQuery.data ?? []).map((doctor) => (
                      <SelectItem key={doctor.id} value={doctor.id}>
                        {doctor.name} ({doctor.specialty})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {errors.doctorId ? (
              <p className="text-xs text-rose-600">{errors.doctorId.message}</p>
            ) : null}
            {doctorsQuery.isError ? (
              <p className="text-xs text-rose-600">Could not load doctors.</p>
            ) : null}
            {!doctorsQuery.isLoading &&
            !doctorsQuery.isError &&
            !(doctorsQuery.data ?? []).length ? (
              <p className="text-xs text-amber-700">
                No active doctors available.
              </p>
            ) : null}
          </div>

          <div className="space-y-2">
            <Label htmlFor="appointment-edit-date">Date & Time</Label>
            <Input
              id="appointment-edit-date"
              type="datetime-local"
              {...register("date")}
            />
            {errors.date ? (
              <p className="text-xs text-rose-600">{errors.date.message}</p>
            ) : null}
          </div>

          <div className="space-y-2">
            <Label htmlFor="appointment-edit-status">Status</Label>
            <Controller
              name="status"
              control={control}
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger id="appointment-edit-status">
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    {statusValues.map((item) => (
                      <SelectItem key={item} value={item}>
                        {item}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </div>

          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="appointment-edit-reason">Reason</Label>
            <Textarea
              id="appointment-edit-reason"
              rows={3}
              {...register("reason")}
            />
          </div>

          <div className="md:col-span-2 flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setEditingAppointment(null)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={
                updateMutation.isPending ||
                patientsQuery.isLoading ||
                doctorsQuery.isLoading
              }
            >
              {updateMutation.isPending ? "Saving..." : "Update Appointment"}
            </Button>
          </div>
        </form>
      </Modal>

      <Modal
        open={Boolean(statusAppointment)}
        onClose={() => setStatusAppointment(null)}
        title="Change Appointment Status"
        description="Update only the workflow status without editing other fields."
        maxWidthClassName="max-w-lg"
      >
        <form className="space-y-4" onSubmit={handleStatusSubmit(submitStatus)}>
          <div className="space-y-2">
            <Label htmlFor="appointment-status">Status</Label>
            <Controller
              name="status"
              control={statusControl}
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger id="appointment-status">
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    {statusValues.map((item) => (
                      <SelectItem key={item} value={item}>
                        {item}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {statusErrors.status ? (
              <p className="text-xs text-rose-600">
                {statusErrors.status.message}
              </p>
            ) : null}
          </div>

          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setStatusAppointment(null)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={statusMutation.isPending}>
              {statusMutation.isPending ? "Saving..." : "Update Status"}
            </Button>
          </div>
        </form>
      </Modal>

      {timelineAppointment ? (
        <div className="fixed inset-0 z-50">
          <button
            type="button"
            aria-label="Close timeline"
            className="absolute inset-0 bg-slate-950/35"
            onClick={() => setTimelineAppointment(null)}
          />

          <aside className="absolute right-0 top-0 h-full w-full max-w-2xl animate-slide-in-right border-l border-slate-200 bg-white shadow-2xl">
            <div className="flex h-full flex-col">
              <div className="border-b border-slate-200 px-5 py-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-700">
                      Appointment History
                    </p>
                    <h3 className="mt-1 text-xl font-semibold text-slate-900">
                      {timelineAppointment.patient.name}
                    </h3>
                    <p className="text-sm text-slate-600">
                      with {timelineAppointment.doctor.name} (
                      {timelineAppointment.doctor.specialty})
                    </p>
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => setTimelineAppointment(null)}
                  >
                    Close
                  </Button>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto px-5 py-5">
                {timelineAppointment.statusTimeline.length ? (
                  <div className="relative pl-8">
                    {timelineAppointment.statusTimeline.map((event, index) => {
                      const meta = timelineStatusMeta(event.toStatus);
                      const showConnector =
                        index < timelineAppointment.statusTimeline.length - 1;

                      return (
                        <div
                          key={`${event.changedAt}-${index}`}
                          className="relative pb-7 last:pb-0"
                        >
                          {showConnector ? (
                            <span
                              className="absolute left-[9px] top-5 h-full w-[2px] bg-[radial-gradient(circle,_#94a3b8_1px,_transparent_1.5px)] bg-[length:2px_8px] bg-repeat-y"
                              aria-hidden="true"
                            />
                          ) : null}

                          <span
                            className={`absolute left-0 top-1 h-5 w-5 rounded-full border-2 shadow-sm ${meta.dotClassName}`}
                          >
                            <span className="absolute inset-[4px] rounded-full bg-white/80" />
                          </span>

                          <div
                            className={`rounded-md border p-3.5 ${meta.cardClassName}`}
                          >
                            <div className="flex items-center justify-between gap-3">
                              <div className="flex items-center gap-2.5">
                                <Badge variant={statusVariant(event.toStatus)}>
                                  {formatStatusLabel(event.toStatus)}
                                </Badge>
                                <p
                                  className={`text-sm font-semibold tracking-tight ${meta.titleClassName}`}
                                >
                                  {meta.title}
                                </p>
                              </div>
                              <span className="rounded-sm bg-white/70 px-2 py-0.5 text-[11px] text-slate-600">
                                {new Date(event.changedAt).toLocaleString()}
                              </span>
                            </div>

                            <p className="mt-2 text-sm leading-5 text-slate-700">
                              {meta.description}
                            </p>
                            <p className="mt-1.5 text-xs text-slate-500">
                              {event.fromStatus
                                ? `Transitioned from ${formatStatusLabel(event.fromStatus)}`
                                : "Initial status set when appointment was created"}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="rounded-md border border-dashed border-slate-300 bg-slate-50 px-4 py-6 text-center text-sm text-slate-500">
                    No status history available for this appointment yet.
                  </p>
                )}
              </div>
            </div>
          </aside>
        </div>
      ) : null}

      <Modal
        open={Boolean(confirmDeleteAppointment)}
        onClose={() => setConfirmDeleteAppointment(null)}
        title="Delete Appointment"
        description={
          confirmDeleteAppointment
            ? `Delete appointment for ${confirmDeleteAppointment.patient.name} with ${confirmDeleteAppointment.doctor.name}? This cannot be undone.`
            : undefined
        }
        maxWidthClassName="max-w-lg"
      >
        <div className="flex justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => setConfirmDeleteAppointment(null)}
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={confirmDelete}
            disabled={deleteMutation.isPending}
          >
            {deleteMutation.isPending ? "Deleting..." : "Yes, Delete"}
          </Button>
        </div>
      </Modal>
    </div>
  );
}
