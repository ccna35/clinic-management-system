import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import dayGridPlugin from "@fullcalendar/daygrid";
import interactionPlugin from "@fullcalendar/interaction";
import FullCalendar from "@fullcalendar/react";
import timeGridPlugin from "@fullcalendar/timegrid";
import type {
  DatesSetArg,
  DateSelectArg,
  EventContentArg,
  EventDropArg,
  EventInput,
} from "@fullcalendar/core";
import {
  CheckCircle2,
  AlertTriangle,
  Loader2,
  Play,
  RefreshCcw,
  UserRoundCheck,
  XCircle,
} from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { api, getErrorMessage } from "../api/client";
import type { ApiListResponse, ApiResponse } from "../api/client";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardHeader } from "../components/ui/card";
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

type AppointmentStatus =
  | "SCHEDULED"
  | "WAITING"
  | "IN_PROGRESS"
  | "COMPLETED"
  | "CANCELLED"
  | "NO_SHOW";

interface CalendarAppointment {
  id: string;
  date: string;
  status: AppointmentStatus;
  reason: string | null;
  patient: { id: string; name: string };
  doctor: { id: string; name: string; specialty: string };
}

interface DoctorOption {
  id: string;
  name: string;
  specialty: string;
  isActive: boolean;
}

interface PatientOption {
  id: string;
  name: string;
  status: "ACTIVE" | "INACTIVE";
}

type StatusFilter = "all" | AppointmentStatus;

type VisibleRange = {
  from: string;
  to: string;
};

const doctorPalette = [
  "#2563eb",
  "#9333ea",
  "#0891b2",
  "#d97706",
  "#059669",
  "#dc2626",
  "#4f46e5",
  "#0f766e",
] as const;

const statusFilters: Array<{ value: StatusFilter; label: string }> = [
  { value: "all", label: "All statuses" },
  { value: "SCHEDULED", label: "Scheduled" },
  { value: "WAITING", label: "Waiting" },
  { value: "IN_PROGRESS", label: "In Progress" },
  { value: "COMPLETED", label: "Completed" },
  { value: "CANCELLED", label: "Cancelled" },
  { value: "NO_SHOW", label: "No show" },
];

function statusVariant(
  status: AppointmentStatus,
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

function formatStatus(status: AppointmentStatus): string {
  return status.replaceAll("_", " ");
}

function eventClassForStatus(status: AppointmentStatus): string {
  if (status === "WAITING") return "calendar-event-waiting";
  if (status === "IN_PROGRESS") return "calendar-event-inprogress";
  if (status === "COMPLETED") return "calendar-event-completed";
  if (status === "CANCELLED") return "calendar-event-cancelled";
  if (status === "NO_SHOW") return "calendar-event-noshow";
  return "calendar-event-scheduled";
}

function toEndTime(startIso: string): string {
  const start = new Date(startIso);
  const end = new Date(start);
  end.setMinutes(end.getMinutes() + 30);
  return end.toISOString();
}

function isConflictEligible(status: AppointmentStatus): boolean {
  return status === "SCHEDULED" || status === "WAITING";
}

function isTerminalStatus(status: AppointmentStatus): boolean {
  return (
    status === "COMPLETED" || status === "CANCELLED" || status === "NO_SHOW"
  );
}

function toDateOnly(value: Date): string {
  return value.toISOString().slice(0, 10);
}

function toInclusiveDate(endExclusive: Date): string {
  const inclusive = new Date(endExclusive);
  inclusive.setDate(inclusive.getDate() - 1);
  return toDateOnly(inclusive);
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

function inDateRange(appointmentDate: string, from: string, to: string): boolean {
  const day = appointmentDate.slice(0, 10);

  if (from && day < from) {
    return false;
  }

  if (to && day > to) {
    return false;
  }

  return true;
}

export function CalendarPage() {
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [doctorFilter, setDoctorFilter] = useState<string>("all");
  const [mutedDoctorIds, setMutedDoctorIds] = useState<string[]>([]);
  const [visibleRange, setVisibleRange] = useState<VisibleRange | null>(null);
  const [dateFrom, setDateFrom] = useState<string>("");
  const [dateTo, setDateTo] = useState<string>("");
  const [createOpen, setCreateOpen] = useState(false);
  const [editingAppointmentId, setEditingAppointmentId] = useState<string | null>(
    null,
  );
  const [laneDate, setLaneDate] = useState<string>(
    new Date().toISOString().slice(0, 10),
  );
  const [createForm, setCreateForm] = useState({
    patientId: "",
    doctorId: "",
    date: "",
    reason: "",
  });
  const [reschedulingId, setReschedulingId] = useState<string | null>(null);
  const [selectedEvent, setSelectedEvent] =
    useState<CalendarAppointment | null>(null);

  const effectiveDateFrom = dateFrom || visibleRange?.from || "";
  const effectiveDateTo = dateTo || visibleRange?.to || "";

  const appointmentsQuery = useQuery({
    queryKey: [
      "calendar-appointments",
      visibleRange?.from ?? "",
      visibleRange?.to ?? "",
    ],
    enabled: visibleRange !== null,
    queryFn: async () => {
      if (!visibleRange) {
        return [];
      }

      const limit = 100;
      let page = 1;
      let hasMore = true;
      const items: CalendarAppointment[] = [];

      while (hasMore) {
        const search = new URLSearchParams({
          limit: String(limit),
          page: String(page),
          dateFrom: visibleRange.from,
          dateTo: visibleRange.to,
        });

        const response = await api.get<ApiListResponse<CalendarAppointment>>(
          `/api/appointments?${search.toString()}`,
        );

        items.push(...response.data.data);
        hasMore = items.length < response.data.meta.total;
        page += 1;
      }

      return items;
    },
  });

  const doctorsQuery = useQuery({
    queryKey: ["calendar-doctors-options"],
    queryFn: async () => {
      const response = await api.get<ApiListResponse<DoctorOption>>(
        "/api/doctors?limit=100&page=1&isActive=true",
      );
      return response.data.data;
    },
  });

  const patientsQuery = useQuery({
    queryKey: ["calendar-patients-options"],
    queryFn: async () => {
      const response = await api.get<ApiListResponse<PatientOption>>(
        "/api/patients?limit=100&page=1&status=ACTIVE",
      );
      return response.data.data;
    },
  });

  const doctorColorMap = useMemo(() => {
    const map = new Map<string, string>();
    const doctors = [...(doctorsQuery.data ?? [])].sort((a, b) =>
      a.name.localeCompare(b.name),
    );

    doctors.forEach((doctor, index) => {
      map.set(doctor.id, doctorPalette[index % doctorPalette.length]);
    });

    return map;
  }, [doctorsQuery.data]);

  const updateStatusMutation = useMutation({
    mutationFn: async ({
      id,
      status,
    }: {
      id: string;
      status: AppointmentStatus;
    }) => {
      return api.patch<ApiResponse<CalendarAppointment>>(
        `/api/appointments/${id}/status`,
        { status },
      );
    },
    onSuccess: async (_, variables) => {
      toast.success(`Status set to ${formatStatus(variables.status)}`);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["calendar-appointments"] }),
        queryClient.invalidateQueries({ queryKey: ["appointments"] }),
        queryClient.invalidateQueries({ queryKey: ["dashboard-summary"] }),
        queryClient.invalidateQueries({ queryKey: ["dashboard-schedule"] }),
        queryClient.invalidateQueries({
          queryKey: ["dashboard-appointments-feed"],
        }),
      ]);
    },
    onError: (error) => {
      toast.error(getErrorMessage(error, "Could not update status"));
    },
  });

  const rescheduleMutation = useMutation({
    mutationFn: async ({ id, date }: { id: string; date: string }) => {
      return api.patch<ApiResponse<CalendarAppointment>>(`/api/appointments/${id}`, {
        date,
      });
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["calendar-appointments"] }),
        queryClient.invalidateQueries({ queryKey: ["appointments"] }),
        queryClient.invalidateQueries({ queryKey: ["dashboard-summary"] }),
        queryClient.invalidateQueries({ queryKey: ["dashboard-schedule"] }),
        queryClient.invalidateQueries({ queryKey: ["dashboard-appointments-feed"] }),
      ]);
    },
  });

  const createMutation = useMutation({
    mutationFn: async (payload: {
      patientId: string;
      doctorId: string;
      date: string;
      reason?: string;
    }) => {
      return api.post<ApiResponse<CalendarAppointment>>("/api/appointments", {
        ...payload,
        status: "SCHEDULED",
      });
    },
    onSuccess: async () => {
      toast.success("Appointment booked");
      setCreateOpen(false);
      setCreateForm({ patientId: "", doctorId: "", date: "", reason: "" });
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["calendar-appointments"] }),
        queryClient.invalidateQueries({ queryKey: ["appointments"] }),
        queryClient.invalidateQueries({ queryKey: ["dashboard-summary"] }),
        queryClient.invalidateQueries({ queryKey: ["dashboard-schedule"] }),
        queryClient.invalidateQueries({ queryKey: ["dashboard-appointments-feed"] }),
      ]);
    },
    onError: (error) => {
      toast.error(getErrorMessage(error, "Could not book appointment"));
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (payload: {
      id: string;
      patientId: string;
      doctorId: string;
      date: string;
      reason?: string;
    }) => {
      return api.patch<ApiResponse<CalendarAppointment>>(
        `/api/appointments/${payload.id}`,
        {
          patientId: payload.patientId,
          doctorId: payload.doctorId,
          date: payload.date,
          reason: payload.reason ?? null,
        },
      );
    },
    onSuccess: async () => {
      toast.success("Appointment updated");
      setCreateOpen(false);
      setEditingAppointmentId(null);
      setCreateForm({ patientId: "", doctorId: "", date: "", reason: "" });
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["calendar-appointments"] }),
        queryClient.invalidateQueries({ queryKey: ["appointments"] }),
        queryClient.invalidateQueries({ queryKey: ["dashboard-summary"] }),
        queryClient.invalidateQueries({ queryKey: ["dashboard-schedule"] }),
        queryClient.invalidateQueries({ queryKey: ["dashboard-appointments-feed"] }),
      ]);
    },
    onError: (error) => {
      toast.error(getErrorMessage(error, "Could not update appointment"));
    },
  });

  const filteredAppointments = useMemo(() => {
    const items = appointmentsQuery.data ?? [];

    return items.filter((appointment) => {
      if (statusFilter !== "all" && appointment.status !== statusFilter) {
        return false;
      }

      if (doctorFilter !== "all" && appointment.doctor.id !== doctorFilter) {
        return false;
      }

      if (mutedDoctorIds.includes(appointment.doctor.id)) {
        return false;
      }

      return inDateRange(appointment.date, effectiveDateFrom, effectiveDateTo);
    });
  }, [
    appointmentsQuery.data,
    statusFilter,
    doctorFilter,
    effectiveDateFrom,
    effectiveDateTo,
    mutedDoctorIds,
  ]);

  const conflictIds = useMemo(() => {
    const grouped = new Map<string, string[]>();

    for (const appointment of filteredAppointments) {
      if (!isConflictEligible(appointment.status)) {
        continue;
      }

      const key = `${appointment.doctor.id}:${appointment.date}`;
      const ids = grouped.get(key) ?? [];
      ids.push(appointment.id);
      grouped.set(key, ids);
    }

    const ids = new Set<string>();

    for (const values of grouped.values()) {
      if (values.length > 1) {
        for (const id of values) {
          ids.add(id);
        }
      }
    }

    return ids;
  }, [filteredAppointments]);

  const calendarEvents = useMemo<EventInput[]>(() => {
    return filteredAppointments.map((appointment) => ({
      id: appointment.id,
      title: `${appointment.patient.name} - ${appointment.doctor.name}`,
      start: appointment.date,
      end: toEndTime(appointment.date),
      classNames: [
        eventClassForStatus(appointment.status),
        conflictIds.has(appointment.id) ? "calendar-event-conflict" : "",
        reschedulingId === appointment.id ? "calendar-event-rescheduling" : "",
        isTerminalStatus(appointment.status) ? "calendar-event-locked" : "",
      ],
      borderColor: doctorColorMap.get(appointment.doctor.id) ?? "#64748b",
      extendedProps: {
        appointment,
        hasConflict: conflictIds.has(appointment.id),
        doctorColor: doctorColorMap.get(appointment.doctor.id) ?? "#64748b",
      },
    }));
  }, [filteredAppointments, conflictIds, reschedulingId, doctorColorMap]);

  const doctorLanes = useMemo(() => {
    const dayAppointments = filteredAppointments
      .filter((item) => item.date.slice(0, 10) === laneDate)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    const laneMap = new Map<
      string,
      { id: string; name: string; specialty: string; appointments: CalendarAppointment[] }
    >();

    for (const doctor of doctorsQuery.data ?? []) {
      if (doctorFilter !== "all" && doctor.id !== doctorFilter) {
        continue;
      }

      laneMap.set(doctor.id, {
        id: doctor.id,
        name: doctor.name,
        specialty: doctor.specialty,
        appointments: [],
      });
    }

    for (const appointment of dayAppointments) {
      const existing = laneMap.get(appointment.doctor.id);

      if (existing) {
        existing.appointments.push(appointment);
      } else {
        laneMap.set(appointment.doctor.id, {
          id: appointment.doctor.id,
          name: appointment.doctor.name,
          specialty: appointment.doctor.specialty,
          appointments: [appointment],
        });
      }
    }

    return Array.from(laneMap.values()).sort((a, b) =>
      a.name.localeCompare(b.name),
    );
  }, [filteredAppointments, laneDate, doctorFilter, doctorsQuery.data]);

  function handleEventContent(arg: EventContentArg) {
    const appointment = arg.event.extendedProps
      .appointment as CalendarAppointment;
    const hasConflict = Boolean(arg.event.extendedProps.hasConflict);
    const doctorColor =
      (arg.event.extendedProps.doctorColor as string | undefined) ?? "#64748b";

    return (
      <div className="calendar-event-content">
        <div className="calendar-event-head">
          <p className="calendar-event-time">{arg.timeText}</p>
          <Badge variant={statusVariant(appointment.status)}>
            {formatStatus(appointment.status)}
          </Badge>
        </div>
        <p className="calendar-event-title">{appointment.patient.name}</p>
        <p className="calendar-event-subtitle" style={{ color: doctorColor }}>
          {appointment.doctor.name}
        </p>
        {hasConflict ? <p className="calendar-event-warning">Conflict</p> : null}
      </div>
    );
  }

  function handleDatesSet(arg: DatesSetArg): void {
    const nextRange = {
      from: toDateOnly(arg.start),
      to: toInclusiveDate(arg.end),
    };

    setVisibleRange((current) => {
      if (
        current &&
        current.from === nextRange.from &&
        current.to === nextRange.to
      ) {
        return current;
      }

      return nextRange;
    });
  }

  function toggleDoctorMute(doctorId: string): void {
    setMutedDoctorIds((current) =>
      current.includes(doctorId)
        ? current.filter((id) => id !== doctorId)
        : [...current, doctorId],
    );
  }

  function openCreateModalWithDate(date?: Date): void {
    const nextDate = date ? toDateTimeLocal(date.toISOString()) : "";
    setEditingAppointmentId(null);
    setCreateForm({
      patientId: "",
      doctorId: doctorFilter === "all" ? "" : doctorFilter,
      date: nextDate,
      reason: "",
    });
    setCreateOpen(true);
  }

  function openEditModal(appointment: CalendarAppointment): void {
    setEditingAppointmentId(appointment.id);
    setCreateForm({
      patientId: appointment.patient.id,
      doctorId: appointment.doctor.id,
      date: toDateTimeLocal(appointment.date),
      reason: appointment.reason ?? "",
    });
    setCreateOpen(true);
  }

  function handleDateSelect(selectInfo: DateSelectArg): void {
    openCreateModalWithDate(selectInfo.start);
  }

  async function submitCreate(): Promise<void> {
    if (!createForm.patientId || !createForm.doctorId || !createForm.date) {
      toast.error("Patient, doctor, and date/time are required");
      return;
    }

    if (editingAppointmentId) {
      await updateMutation.mutateAsync({
        id: editingAppointmentId,
        patientId: createForm.patientId,
        doctorId: createForm.doctorId,
        date: toIsoDate(createForm.date),
        reason: createForm.reason.trim() || undefined,
      });
      return;
    }

    await createMutation.mutateAsync({
      patientId: createForm.patientId,
      doctorId: createForm.doctorId,
      date: toIsoDate(createForm.date),
      reason: createForm.reason.trim() || undefined,
    });
  }

  async function handleEventDrop(dropInfo: EventDropArg): Promise<void> {
    const appointment = dropInfo.event.extendedProps
      .appointment as CalendarAppointment;

    if (isTerminalStatus(appointment.status)) {
      dropInfo.revert();
      toast.error("Completed, cancelled, and no-show appointments are locked");
      return;
    }

    if (!dropInfo.event.start) {
      dropInfo.revert();
      return;
    }

    setReschedulingId(appointment.id);

    try {
      const nextDateIso = dropInfo.event.start.toISOString();

      await rescheduleMutation.mutateAsync({
        id: appointment.id,
        date: nextDateIso,
      });

      if (selectedEvent?.id === appointment.id) {
        setSelectedEvent({ ...selectedEvent, date: nextDateIso });
      }

      toast.success("Appointment time updated");
    } catch (error) {
      dropInfo.revert();
      toast.error(
        getErrorMessage(
          error,
          "Could not reschedule. Time may conflict with doctor or patient.",
        ),
      );
    } finally {
      setReschedulingId(null);
    }
  }

  function handleStatusAction(status: AppointmentStatus): void {
    if (!selectedEvent) {
      return;
    }

    updateStatusMutation.mutate({ id: selectedEvent.id, status });
  }

  function renderStatusActions(event: CalendarAppointment) {
    if (event.status === "SCHEDULED") {
      return (
        <div className="flex flex-wrap gap-2">
          <Button
            size="sm"
            type="button"
            onClick={() => handleStatusAction("WAITING")}
            disabled={updateStatusMutation.isPending}
          >
            <UserRoundCheck className="mr-1 h-3.5 w-3.5" />
            Check-in
          </Button>
          <Button
            size="sm"
            type="button"
            variant="outline"
            onClick={() => handleStatusAction("NO_SHOW")}
            disabled={updateStatusMutation.isPending}
          >
            <XCircle className="mr-1 h-3.5 w-3.5" />
            No-show
          </Button>
        </div>
      );
    }

    if (event.status === "WAITING") {
      return (
        <Button
          size="sm"
          type="button"
          onClick={() => handleStatusAction("IN_PROGRESS")}
          disabled={updateStatusMutation.isPending}
        >
          <Play className="mr-1 h-3.5 w-3.5" />
          Start Consultation
        </Button>
      );
    }

    if (event.status === "IN_PROGRESS") {
      return (
        <Button
          size="sm"
          type="button"
          onClick={() => handleStatusAction("COMPLETED")}
          disabled={updateStatusMutation.isPending}
        >
          <CheckCircle2 className="mr-1 h-3.5 w-3.5" />
          Complete
        </Button>
      );
    }

    return null;
  }

  return (
    <div className="calendar-page animate-soft-in space-y-4">
      <Card className="animate-fade-up border-slate-200/80 bg-white/90">
        <CardHeader className="pb-2">
          <h2 className="text-2xl font-semibold text-slate-900">Calendar</h2>
          <p className="text-sm text-slate-500">
            Smart scheduling with drag-and-drop, conflict surfacing, and
            doctor-focused lanes.
          </p>
        </CardHeader>
        <CardContent className="pt-3">
          <div className="calendar-filters mb-4 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-5">
            <div className="space-y-1.5">
              <Label>Status</Label>
              <Select
                value={statusFilter}
                onValueChange={(value) => setStatusFilter(value as StatusFilter)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All statuses" />
                </SelectTrigger>
                <SelectContent>
                  {statusFilters.map((item) => (
                    <SelectItem key={item.value} value={item.value}>
                      {item.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>Doctor</Label>
              <Select value={doctorFilter} onValueChange={setDoctorFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All doctors" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All doctors</SelectItem>
                  {(doctorsQuery.data ?? []).map((doctor) => (
                    <SelectItem key={doctor.id} value={doctor.id}>
                      {doctor.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>From date</Label>
              <Input
                type="date"
                value={dateFrom}
                onChange={(event) => setDateFrom(event.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <Label>To date</Label>
              <Input
                type="date"
                value={dateTo}
                onChange={(event) => setDateTo(event.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <Label>&nbsp;</Label>
              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={() => {
                  setStatusFilter("all");
                  setDoctorFilter("all");
                  setMutedDoctorIds([]);
                  setDateFrom("");
                  setDateTo("");
                }}
              >
                <RefreshCcw className="mr-2 h-4 w-4" />
                Reset filters
              </Button>
            </div>
          </div>

          <div className="mb-3 space-y-2">
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                Doctor Legend
              </p>
              {mutedDoctorIds.length > 0 ? (
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() => setMutedDoctorIds([])}
                >
                  Show all doctors
                </Button>
              ) : null}
            </div>
            <div className="calendar-doctor-legend">
              {(doctorsQuery.data ?? []).map((doctor) => {
                const muted = mutedDoctorIds.includes(doctor.id);
                const color = doctorColorMap.get(doctor.id) ?? "#64748b";

                return (
                  <button
                    key={doctor.id}
                    type="button"
                    className={`calendar-doctor-chip ${muted ? "is-muted" : ""}`}
                    onClick={() => toggleDoctorMute(doctor.id)}
                  >
                    <span
                      className="calendar-doctor-dot"
                      style={{ backgroundColor: color }}
                    />
                    <span>{doctor.name}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="mb-3 flex flex-wrap items-center gap-2 text-xs text-slate-500">
            <span>{filteredAppointments.length} appointments visible</span>
            {conflictIds.size > 0 ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2 py-1 font-semibold text-rose-700">
                <AlertTriangle className="h-3.5 w-3.5" />
                {conflictIds.size} potential conflicts
              </span>
            ) : null}
            <span className="rounded-full bg-slate-100 px-2 py-1">
              Drag SCHEDULED/WAITING appointments to reschedule; terminal
              statuses are locked
            </span>
          </div>

          {appointmentsQuery.isLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-[540px] w-full" />
            </div>
          ) : (
            <div className="calendar-shell">
              <FullCalendar
                plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
                initialView="timeGridWeek"
                customButtons={{
                  bookAppointment: {
                    text: "Book",
                    click: () => openCreateModalWithDate(new Date()),
                  },
                }}
                headerToolbar={{
                  left: "prev,next today",
                  center: "title",
                  right: "bookAppointment timeGridDay,timeGridWeek,dayGridMonth",
                }}
                buttonText={{
                  today: "Today",
                  timeGridDay: "Day",
                  timeGridWeek: "Week",
                  dayGridMonth: "Month",
                }}
                events={calendarEvents}
                datesSet={handleDatesSet}
                eventContent={handleEventContent}
                selectable
                selectMirror
                selectLongPressDelay={120}
                unselectAuto
                select={handleDateSelect}
                editable
                eventDurationEditable={false}
                eventStartEditable
                eventAllow={(_dropInfo, draggedEvent) => {
                  if (!draggedEvent) {
                    return false;
                  }

                  const appointment = draggedEvent.extendedProps
                    .appointment as CalendarAppointment;

                  if (isTerminalStatus(appointment.status)) {
                    return false;
                  }

                  return (
                    appointment.status === "SCHEDULED" ||
                    appointment.status === "WAITING"
                  );
                }}
                eventDrop={handleEventDrop}
                dateClick={(info) => {
                  openCreateModalWithDate(info.date);
                }}
                slotDuration="00:15:00"
                snapDuration="00:15:00"
                eventClick={(clickInfo) => {
                  const event = clickInfo.event.extendedProps
                    .appointment as CalendarAppointment;
                  setSelectedEvent(event);
                }}
                slotMinTime="07:00:00"
                slotMaxTime="22:00:00"
                allDaySlot={false}
                nowIndicator
                dayMaxEvents={3}
                height="calc(100vh - 260px)"
              />
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="border-slate-200/80 bg-white/90">
        <CardHeader className="pb-2">
          <h3 className="text-base font-semibold text-slate-900">Doctor Lanes</h3>
          <p className="text-sm text-slate-500">
            Resource-style daily lanes by doctor for rapid operational triage.
          </p>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="max-w-xs space-y-1.5">
            <Label>Lane date</Label>
            <Input
              type="date"
              value={laneDate}
              onChange={(event) => setLaneDate(event.target.value)}
            />
          </div>

          <div className="calendar-lanes-grid">
            {doctorLanes.map((lane) => (
              <div key={lane.id} className="calendar-lane-card">
                <div className="calendar-lane-head">
                  <p className="calendar-lane-name">{lane.name}</p>
                  <p className="calendar-lane-specialty">{lane.specialty}</p>
                </div>

                <div className="calendar-lane-body">
                  {lane.appointments.length === 0 ? (
                    <p className="text-xs text-slate-500">No appointments</p>
                  ) : (
                    lane.appointments.map((appointment) => (
                      <button
                        key={appointment.id}
                        type="button"
                        className={`calendar-lane-item ${eventClassForStatus(appointment.status)} ${
                          conflictIds.has(appointment.id)
                            ? "calendar-event-conflict"
                            : ""
                        }`}
                        style={{
                          borderLeft: `4px solid ${
                            doctorColorMap.get(appointment.doctor.id) ?? "#64748b"
                          }`,
                        }}
                        onClick={() => setSelectedEvent(appointment)}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-semibold text-xs">
                            {new Date(appointment.date).toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                          <Badge variant={statusVariant(appointment.status)}>
                            {formatStatus(appointment.status)}
                          </Badge>
                        </div>
                        <p className="mt-1 text-sm font-semibold">
                          {appointment.patient.name}
                        </p>
                      </button>
                    ))
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Modal
        open={selectedEvent !== null}
        onClose={() => setSelectedEvent(null)}
        title={selectedEvent ? selectedEvent.patient.name : "Appointment"}
        description={
          selectedEvent
            ? `${new Date(selectedEvent.date).toLocaleDateString([], {
                weekday: "short",
                month: "short",
                day: "numeric",
              })} at ${new Date(selectedEvent.date).toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              })}`
            : undefined
        }
      >
        {selectedEvent ? (
          <div className="space-y-4">
            <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-3">
              <p className="text-sm font-semibold text-slate-900">
                Doctor: {selectedEvent.doctor.name}
              </p>
              <p className="text-sm text-slate-600">
                Specialty: {selectedEvent.doctor.specialty}
              </p>
              <div className="mt-2">
                <Badge variant={statusVariant(selectedEvent.status)}>
                  {formatStatus(selectedEvent.status)}
                </Badge>
              </div>
              {selectedEvent.reason ? (
                <p className="mt-2 text-sm text-slate-600">
                  {selectedEvent.reason}
                </p>
              ) : null}

              {conflictIds.has(selectedEvent.id) ? (
                <p className="mt-2 rounded-md border border-rose-200 bg-rose-50 px-2 py-1 text-xs font-semibold text-rose-700">
                  Potential conflict: another active appointment exists at this
                  exact doctor timeslot.
                </p>
              ) : null}

              {isTerminalStatus(selectedEvent.status) ? (
                <p className="mt-2 rounded-md border border-amber-200 bg-amber-50 px-2 py-1 text-xs font-semibold text-amber-700">
                  This appointment is locked and cannot be rescheduled.
                </p>
              ) : null}
            </div>

            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                Quick actions
              </p>
              {selectedEvent.status === "SCHEDULED" ? (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    openEditModal(selectedEvent);
                    setSelectedEvent(null);
                  }}
                >
                  Edit appointment
                </Button>
              ) : null}
              {renderStatusActions(selectedEvent) ?? (
                <p className="text-sm text-slate-500">
                  No action required for current status.
                </p>
              )}
            </div>

            {updateStatusMutation.isPending ? (
              <p className="flex items-center gap-2 text-sm text-slate-500">
                <Loader2 className="h-4 w-4 animate-spin" />
                Updating appointment status...
              </p>
            ) : null}

            <div className="flex justify-end">
              <Button
                type="button"
                variant="outline"
                onClick={() => setSelectedEvent(null)}
              >
                Close
              </Button>
            </div>
          </div>
        ) : null}
      </Modal>

      <Modal
        open={createOpen}
        onClose={() => {
          setCreateOpen(false);
          setEditingAppointmentId(null);
        }}
        title={editingAppointmentId ? "Edit Appointment" : "Book Appointment"}
        description={
          editingAppointmentId
            ? "Update a scheduled appointment from the calendar."
            : "Create a new appointment directly from the calendar."
        }
      >
        <form
          className="grid gap-4"
          onSubmit={(event) => {
            event.preventDefault();
            void submitCreate();
          }}
        >
          <div className="space-y-2">
            <Label>Patient</Label>
            <Select
              value={createForm.patientId}
              onValueChange={(value) =>
                setCreateForm((current) => ({ ...current, patientId: value }))
              }
            >
              <SelectTrigger>
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
          </div>

          <div className="space-y-2">
            <Label>Doctor</Label>
            <Select
              value={createForm.doctorId}
              onValueChange={(value) =>
                setCreateForm((current) => ({ ...current, doctorId: value }))
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Select doctor" />
              </SelectTrigger>
              <SelectContent>
                {(doctorsQuery.data ?? []).map((doctor) => (
                  <SelectItem key={doctor.id} value={doctor.id}>
                    {doctor.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Date & Time</Label>
            <Input
              type="datetime-local"
              value={createForm.date}
              onChange={(event) =>
                setCreateForm((current) => ({
                  ...current,
                  date: event.target.value,
                }))
              }
            />
          </div>

          <div className="space-y-2">
            <Label>Reason (optional)</Label>
            <Input
              value={createForm.reason}
              placeholder="Routine consultation"
              onChange={(event) =>
                setCreateForm((current) => ({
                  ...current,
                  reason: event.target.value,
                }))
              }
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setCreateOpen(false);
                setEditingAppointmentId(null);
              }}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={createMutation.isPending || updateMutation.isPending}
            >
              {editingAppointmentId
                ? updateMutation.isPending
                  ? "Saving..."
                  : "Save changes"
                : createMutation.isPending
                  ? "Booking..."
                  : "Book"}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
