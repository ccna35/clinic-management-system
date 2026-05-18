import {
  AlertTriangle,
  CalendarCheck2,
  CalendarClock,
  Clock4,
  RefreshCw,
  Stethoscope,
  UserPlus,
  Users,
  UserRoundCheck,
  Workflow,
} from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { api, getErrorMessage } from "../api/client";
import type { ApiListResponse, ApiResponse } from "../api/client";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
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
import { toast } from "sonner";

interface DashboardSummary {
  todayAppointments: number;
  waitingPatients: number;
  completedVisits: number;
  cancelledOrNoShows: number;
  averageActualWaitMinutes: number | null;
  avgWaitSampleSize: number;
}

interface ScheduleItem {
  id: string;
  date: string;
  reason: string | null;
  status: string;
  patient: { id: string; name: string; phone: string };
  doctor: { id: string; name: string; specialty: string };
}

interface AppointmentFeedItem {
  id: string;
  date: string;
  status: string;
  reason: string | null;
  checkedInAt: string | null;
  inProgressAt: string | null;
  completedAt: string | null;
  actualWaitMinutes: number | null;
  liveWaitMinutes: number | null;
  patient: { id: string; name: string };
  doctor: { id: string; name: string; specialty: string };
}

interface AlertItem {
  level: "high" | "medium";
  message: string;
}

interface PatientOption {
  id: string;
  name: string;
}

interface DoctorOption {
  id: string;
  name: string;
  specialty: string;
  isActive: boolean;
}

type PatientFormState = {
  name: string;
  phone: string;
  age: string;
  gender: "MALE" | "FEMALE";
  notes: string;
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

export function DashboardPage() {
  const queryClient = useQueryClient();
  const [selectedDate, setSelectedDate] = useState(() =>
    new Date().toISOString().slice(0, 10),
  );
  const [refreshing, setRefreshing] = useState(false);

  const [checkInOpen, setCheckInOpen] = useState(false);
  const [checkInSearch, setCheckInSearch] = useState("");
  const [addPatientOpen, setAddPatientOpen] = useState(false);
  const [bookAppointmentOpen, setBookAppointmentOpen] = useState(false);
  const [noShowOpen, setNoShowOpen] = useState(false);
  const [viewDoctorsOpen, setViewDoctorsOpen] = useState(false);
  const [noShowSearch, setNoShowSearch] = useState("");
  const [doctorSearch, setDoctorSearch] = useState("");

  const [patientForm, setPatientForm] = useState<PatientFormState>({
    name: "",
    phone: "",
    age: "",
    gender: "MALE",
    notes: "",
  });

  const [appointmentForm, setAppointmentForm] = useState({
    patientId: "",
    doctorId: "",
    date: "",
    reason: "",
  });

  const summaryQuery = useQuery({
    queryKey: ["dashboard-summary"],
    queryFn: async () => {
      const response = await api.get<ApiResponse<DashboardSummary>>(
        "/api/dashboard/summary",
      );
      return response.data.data;
    },
  });

  const scheduleQuery = useQuery({
    queryKey: ["dashboard-schedule"],
    queryFn: async () => {
      const response = await api.get<ApiResponse<ScheduleItem[]>>(
        "/api/dashboard/today-schedule",
      );
      return response.data.data;
    },
  });

  const appointmentsFeedQuery = useQuery({
    queryKey: ["dashboard-appointments-feed"],
    queryFn: async () => {
      const response = await api.get<ApiListResponse<AppointmentFeedItem>>(
        "/api/appointments?limit=100&page=1",
      );
      return response.data.data;
    },
  });

  const patientsOptionsQuery = useQuery({
    queryKey: ["dashboard-patients-options"],
    queryFn: async () => {
      const response = await api.get<ApiListResponse<PatientOption>>(
        "/api/patients?limit=100&page=1&status=ACTIVE",
      );
      return response.data.data;
    },
  });

  const doctorsOptionsQuery = useQuery({
    queryKey: ["dashboard-doctors-options"],
    queryFn: async () => {
      const response = await api.get<ApiListResponse<DoctorOption>>(
        "/api/doctors?limit=100&page=1&isActive=true",
      );
      return response.data.data;
    },
  });

  const doctorsDirectoryQuery = useQuery({
    queryKey: ["dashboard-doctors-directory"],
    queryFn: async () => {
      const response = await api.get<ApiListResponse<DoctorOption>>(
        "/api/doctors?limit=100&page=1",
      );
      return response.data.data;
    },
  });

  const selectedDateAppointments = useMemo(() => {
    if (!appointmentsFeedQuery.data) {
      return [];
    }

    return appointmentsFeedQuery.data
      .filter((item) => item.date.slice(0, 10) === selectedDate)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [appointmentsFeedQuery.data, selectedDate]);

  const waitingQueue = useMemo(() => {
    return selectedDateAppointments
      .filter((item) => item.status === "WAITING")
      .map((item) => {
        const waitMinutes = item.liveWaitMinutes;
        return { ...item, waitMinutes };
      })
      .sort((a, b) => (b.waitMinutes ?? -1) - (a.waitMinutes ?? -1));
  }, [selectedDateAppointments]);

  const summaryCards = useMemo(
    () => [
      {
        label: "Today Appointments",
        icon: CalendarCheck2,
        value: summaryQuery.data
          ? String(summaryQuery.data.todayAppointments)
          : "-",
      },
      {
        label: "Waiting Patients",
        icon: Clock4,
        value: summaryQuery.data
          ? String(summaryQuery.data.waitingPatients)
          : "-",
      },
      {
        label: "Completed Visits",
        icon: Users,
        value: summaryQuery.data
          ? String(summaryQuery.data.completedVisits)
          : "-",
      },
      {
        label: "Cancelled / No Show",
        icon: Stethoscope,
        value: summaryQuery.data
          ? String(summaryQuery.data.cancelledOrNoShows)
          : "-",
      },
      {
        label: "Avg Wait Before Doctor",
        icon: CalendarClock,
        value:
          summaryQuery.data?.averageActualWaitMinutes !== null &&
          summaryQuery.data?.averageActualWaitMinutes !== undefined
            ? `${summaryQuery.data.averageActualWaitMinutes} min`
            : "N/A",
        note:
          summaryQuery.data?.avgWaitSampleSize &&
          summaryQuery.data.avgWaitSampleSize > 0
            ? `From ${summaryQuery.data.avgWaitSampleSize} visit${summaryQuery.data.avgWaitSampleSize > 1 ? "s" : ""}`
            : "No completed wait records yet",
      },
    ],
    [summaryQuery.data],
  );

  const nextHourTimeline = useMemo(() => {
    const now = Date.now();
    const oneHourFromNow = now + 60 * 60 * 1000;

    return selectedDateAppointments.filter((item) => {
      const appointmentTime = new Date(item.date).getTime();
      return appointmentTime >= now && appointmentTime <= oneHourFromNow;
    });
  }, [selectedDateAppointments]);

  const alertItems = useMemo<AlertItem[]>(() => {
    const alerts: AlertItem[] = [];
    const noShowCount = selectedDateAppointments.filter(
      (item) => item.status === "NO_SHOW",
    ).length;
    const cancelledCount = selectedDateAppointments.filter(
      (item) => item.status === "CANCELLED",
    ).length;
    const longWaitCount = waitingQueue.filter(
      (item) => item.waitMinutes !== null && item.waitMinutes >= 20,
    ).length;

    if (longWaitCount > 0) {
      alerts.push({
        level: "high",
        message: `${longWaitCount} waiting patient${longWaitCount > 1 ? "s are" : " is"} over 20 minutes.`,
      });
    }

    if (noShowCount >= 2) {
      alerts.push({
        level: "medium",
        message: `${noShowCount} no-shows detected for selected date.`,
      });
    }

    if (cancelledCount >= 3) {
      alerts.push({
        level: "medium",
        message: `${cancelledCount} cancellations may impact doctor utilization.`,
      });
    }

    return alerts;
  }, [selectedDateAppointments, waitingQueue]);

  const selectedDateLabel = useMemo(() => {
    return new Date(`${selectedDate}T00:00:00`).toLocaleDateString([], {
      weekday: "short",
      month: "short",
      day: "numeric",
    });
  }, [selectedDate]);

  const checkInCandidates = useMemo(() => {
    const term = checkInSearch.trim().toLowerCase();

    return selectedDateAppointments
      .filter((item) => item.status === "SCHEDULED")
      .filter((item) => {
        if (!term) {
          return true;
        }

        return (
          item.patient.name.toLowerCase().includes(term) ||
          item.doctor.name.toLowerCase().includes(term) ||
          item.doctor.specialty.toLowerCase().includes(term)
        );
      });
  }, [selectedDateAppointments, checkInSearch]);

  const noShowCandidates = useMemo(() => {
    const term = noShowSearch.trim().toLowerCase();

    return selectedDateAppointments
      .filter(
        (item) => item.status === "SCHEDULED" || item.status === "WAITING",
      )
      .filter((item) => {
        if (!term) {
          return true;
        }

        return (
          item.patient.name.toLowerCase().includes(term) ||
          item.doctor.name.toLowerCase().includes(term) ||
          item.doctor.specialty.toLowerCase().includes(term)
        );
      });
  }, [selectedDateAppointments, noShowSearch]);

  const filteredDoctorsDirectory = useMemo(() => {
    const term = doctorSearch.trim().toLowerCase();
    const doctors = doctorsDirectoryQuery.data ?? [];

    return doctors.filter((doctor) => {
      if (!term) {
        return true;
      }

      return (
        doctor.name.toLowerCase().includes(term) ||
        doctor.specialty.toLowerCase().includes(term)
      );
    });
  }, [doctorSearch, doctorsDirectoryQuery.data]);

  const checkInMutation = useMutation({
    mutationFn: async (appointmentId: string) => {
      return api.patch<ApiResponse<AppointmentFeedItem>>(
        `/api/appointments/${appointmentId}/status`,
        {
          status: "WAITING",
        },
      );
    },
    onSuccess: async () => {
      toast.success("Patient checked in", {
        description: "Appointment moved to waiting queue.",
      });
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["dashboard-summary"] }),
        queryClient.invalidateQueries({ queryKey: ["dashboard-schedule"] }),
        queryClient.invalidateQueries({
          queryKey: ["dashboard-appointments-feed"],
        }),
        queryClient.invalidateQueries({ queryKey: ["appointments"] }),
      ]);
    },
    onError: (error) => {
      toast.error(getErrorMessage(error, "Check-in failed"), {
        description: "Please try again.",
      });
    },
  });

  const addPatientMutation = useMutation({
    mutationFn: async () => {
      return api.post("/api/patients", {
        name: patientForm.name.trim(),
        phone: patientForm.phone.trim(),
        age: patientForm.age ? Number(patientForm.age) : undefined,
        gender: patientForm.gender,
        notes: patientForm.notes.trim() || undefined,
      });
    },
    onSuccess: async () => {
      toast.success("Patient added");
      setAddPatientOpen(false);
      setPatientForm({
        name: "",
        phone: "",
        age: "",
        gender: "MALE",
        notes: "",
      });
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: ["dashboard-patients-options"],
        }),
        queryClient.invalidateQueries({ queryKey: ["patients"] }),
      ]);
    },
    onError: (error) => {
      toast.error(getErrorMessage(error, "Could not add patient"));
    },
  });

  const bookAppointmentMutation = useMutation({
    mutationFn: async () => {
      return api.post("/api/appointments", {
        patientId: appointmentForm.patientId,
        doctorId: appointmentForm.doctorId,
        date: new Date(appointmentForm.date).toISOString(),
        reason: appointmentForm.reason.trim() || undefined,
        status: "SCHEDULED",
      });
    },
    onSuccess: async () => {
      toast.success("Appointment booked");
      setBookAppointmentOpen(false);
      setAppointmentForm({ patientId: "", doctorId: "", date: "", reason: "" });
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["dashboard-summary"] }),
        queryClient.invalidateQueries({ queryKey: ["dashboard-schedule"] }),
        queryClient.invalidateQueries({
          queryKey: ["dashboard-appointments-feed"],
        }),
        queryClient.invalidateQueries({ queryKey: ["appointments"] }),
      ]);
    },
    onError: (error) => {
      toast.error(getErrorMessage(error, "Could not book appointment"));
    },
  });

  const noShowMutation = useMutation({
    mutationFn: async (appointmentId: string) => {
      return api.patch<ApiResponse<AppointmentFeedItem>>(
        `/api/appointments/${appointmentId}/status`,
        {
          status: "NO_SHOW",
        },
      );
    },
    onSuccess: async () => {
      toast.success("Marked as no-show");
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["dashboard-summary"] }),
        queryClient.invalidateQueries({ queryKey: ["dashboard-schedule"] }),
        queryClient.invalidateQueries({
          queryKey: ["dashboard-appointments-feed"],
        }),
        queryClient.invalidateQueries({ queryKey: ["appointments"] }),
      ]);
    },
    onError: (error) => {
      toast.error(getErrorMessage(error, "No-show update failed"));
    },
  });

  async function refreshDashboard(): Promise<void> {
    setRefreshing(true);
    await Promise.all([
      summaryQuery.refetch(),
      scheduleQuery.refetch(),
      appointmentsFeedQuery.refetch(),
    ]);
    setRefreshing(false);
  }

  function setRelativeDate(daysFromToday: number): void {
    const date = new Date();
    date.setDate(date.getDate() + daysFromToday);
    setSelectedDate(date.toISOString().slice(0, 10));
  }

  function submitAddPatient(): void {
    if (!patientForm.name.trim() || !patientForm.phone.trim()) {
      toast.error("Name and phone are required");
      return;
    }

    addPatientMutation.mutate();
  }

  function submitBookAppointment(): void {
    if (
      !appointmentForm.patientId ||
      !appointmentForm.doctorId ||
      !appointmentForm.date
    ) {
      toast.error("Patient, doctor, and date/time are required");
      return;
    }

    bookAppointmentMutation.mutate();
  }

  const isBusy = scheduleQuery.isLoading || appointmentsFeedQuery.isLoading;

  return (
    <div className="animate-soft-in space-y-6">
      <div className="animate-fade-up rounded-md border border-slate-200 bg-white p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-700">
              Operations overview
            </p>
            <h2 className="mt-2 text-3xl font-semibold text-slate-900">
              Dashboard
            </h2>
            <p className="mt-1 text-sm text-slate-600">
              Live clinic metrics for the reception desk.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setRelativeDate(0)}
            >
              Today
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setRelativeDate(1)}
            >
              Tomorrow
            </Button>
            <Input
              type="date"
              className="h-9 w-[170px]"
              value={selectedDate}
              onChange={(event) => setSelectedDate(event.target.value)}
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={refreshDashboard}
              disabled={refreshing}
            >
              <RefreshCw
                className={`mr-2 h-4 w-4 ${refreshing ? "animate-spin" : ""}`}
              />
              Refresh
            </Button>
          </div>
        </div>
      </div>

      <Card className="animate-fade-up rounded-md stagger-1">
        <CardHeader>
          <h3 className="text-base font-semibold text-slate-900">
            Quick Actions
          </h3>
          <CardDescription>
            Run front-desk workflows directly from this dashboard.
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-5">
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
            <Button type="button" onClick={() => setAddPatientOpen(true)}>
              <UserPlus className="mr-2 h-4 w-4" />
              Add Patient
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => setBookAppointmentOpen(true)}
            >
              <CalendarClock className="mr-2 h-4 w-4" />
              Book Appointment
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => setCheckInOpen(true)}
            >
              <UserRoundCheck className="mr-2 h-4 w-4" />
              Check-in Patient
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => setNoShowOpen(true)}
            >
              <Workflow className="mr-2 h-4 w-4" />
              Mark No-show
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => setViewDoctorsOpen(true)}
            >
              <Stethoscope className="mr-2 h-4 w-4" />
              View Doctors
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        {summaryCards.map((item, index) => (
          <Card
            key={item.label}
            className={`animate-fade-up stagger-${index + 1} flex items-center gap-4 p-5`}
          >
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-50">
              <item.icon className="h-5 w-5 text-blue-600" />
            </div>
            <div className="min-w-0">
              <p className="truncate text-xs font-medium uppercase tracking-wide text-slate-500">
                {item.label}
              </p>
              {summaryQuery.isLoading ? (
                <Skeleton className="mt-1 h-7 w-16" />
              ) : (
                <>
                  <p className="text-2xl font-bold text-slate-900">
                    {item.value}
                  </p>
                  {item.note ? (
                    <p className="mt-0.5 truncate text-xs text-slate-400">
                      {item.note}
                    </p>
                  ) : null}
                </>
              )}
            </div>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <Card className="animate-fade-up stagger-2 xl:col-span-1">
          <CardHeader>
            <h3 className="text-base font-semibold text-slate-900">
              Live Waiting Queue
            </h3>
            <CardDescription>{selectedDateLabel}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 pt-5">
            {isBusy ? (
              <div className="space-y-2">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
              </div>
            ) : null}

            {!isBusy && !waitingQueue.length ? (
              <p className="rounded-md border border-dashed border-slate-300 bg-slate-50 px-4 py-6 text-center text-sm text-slate-500">
                No patients currently waiting.
              </p>
            ) : null}

            {!isBusy && waitingQueue.length
              ? waitingQueue.slice(0, 5).map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between rounded-md border border-slate-200 bg-slate-50 px-3 py-2"
                  >
                    <div>
                      <p className="text-sm font-semibold text-slate-900">
                        {item.patient.name}
                      </p>
                      <p className="text-xs text-slate-500">
                        {item.doctor.name}
                      </p>
                    </div>
                    {item.waitMinutes === null ? (
                      <Badge variant="default">N/A</Badge>
                    ) : (
                      <Badge
                        variant={
                          item.waitMinutes >= 20 ? "cancelled" : "waiting"
                        }
                      >
                        {item.waitMinutes} min
                      </Badge>
                    )}
                  </div>
                ))
              : null}
          </CardContent>
        </Card>

        <Card className="animate-fade-up stagger-3 xl:col-span-2">
          <CardHeader>
            <h3 className="text-base font-semibold text-slate-900">
              Next 60 Minutes
            </h3>
            <CardDescription>
              Upcoming activity for selected date.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 pt-5">
            {isBusy ? (
              <div className="space-y-2">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
              </div>
            ) : null}

            {!isBusy && !nextHourTimeline.length ? (
              <p className="rounded-md border border-dashed border-slate-300 bg-slate-50 px-4 py-6 text-center text-sm text-slate-500">
                No appointments in the next 60 minutes.
              </p>
            ) : null}

            {!isBusy && nextHourTimeline.length
              ? nextHourTimeline.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between rounded-md border border-slate-200 bg-slate-50 px-3 py-2"
                  >
                    <div>
                      <p className="text-sm font-semibold text-slate-900">
                        {item.patient.name}
                      </p>
                      <p className="text-xs text-slate-500">
                        {new Date(item.date).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}{" "}
                        with {item.doctor.name}
                      </p>
                    </div>
                    <Badge variant={statusVariant(item.status)}>
                      {item.status}
                    </Badge>
                  </div>
                ))
              : null}
          </CardContent>
        </Card>
      </div>

      <Card className="animate-fade-up stagger-4">
        <CardHeader>
          <h3 className="text-base font-semibold text-slate-900">
            Alert Center
          </h3>
          <CardDescription>
            Operational exceptions that need attention.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 pt-5">
          {isBusy ? (
            <div className="space-y-2">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : null}

          {!isBusy && !alertItems.length ? (
            <p className="rounded-xl border border-dashed border-emerald-200 bg-emerald-50/50 px-4 py-6 text-sm text-emerald-700">
              No critical alerts detected for selected date.
            </p>
          ) : null}

          {!isBusy && alertItems.length
            ? alertItems.map((item, index) => (
                <div
                  key={`${item.level}-${index}`}
                  className="flex items-start gap-3 rounded-xl border border-app-outline-variant/40 bg-app-surface-low px-3 py-3"
                >
                  <AlertTriangle
                    className={`mt-0.5 h-4 w-4 ${item.level === "high" ? "text-rose-600" : "text-amber-600"}`}
                  />
                  <p className="text-[13px] text-app-text">{item.message}</p>
                </div>
              ))
            : null}
        </CardContent>
      </Card>

      <Card className="animate-fade-up stagger-4">
        <CardHeader>
          <h3 className="text-base font-semibold text-app-text">
            Today Schedule
          </h3>
          <CardDescription>
            Full table sourced from today schedule endpoint.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 pt-5">
          {scheduleQuery.isLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : null}
          {!scheduleQuery.isLoading && !scheduleQuery.data?.length ? (
            <p className="rounded-md border border-dashed border-slate-300 bg-slate-50 px-4 py-6 text-center text-[13px] text-app-text-muted">
              No appointments scheduled today.
            </p>
          ) : null}

          {scheduleQuery.data?.length ? (
            <div className="overflow-x-auto">
              <Table density="compact">
                <TableHeader>
                  <TableRow>
                    <TableHead>Time</TableHead>
                    <TableHead>Patient</TableHead>
                    <TableHead>Doctor</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {scheduleQuery.data.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>
                        {new Date(item.date).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </TableCell>
                      <TableCell>{item.patient.name}</TableCell>
                      <TableCell>
                        {item.doctor.name}{" "}
                        <span className="text-[11px] text-app-text-muted">
                          ({item.doctor.specialty})
                        </span>
                      </TableCell>
                      <TableCell>
                        <Badge variant={statusVariant(item.status)}>
                          {item.status}
                        </Badge>
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
        open={checkInOpen}
        onClose={() => {
          setCheckInOpen(false);
          setCheckInSearch("");
        }}
        title="Check-in Patient"
        description={`Select a scheduled appointment on ${selectedDateLabel} to move it to WAITING.`}
        maxWidthClassName="max-w-3xl"
      >
        <div className="space-y-4">
          <div className="space-y-2">
            <label
              className="text-[13px] font-semibold text-app-text-muted"
              htmlFor="check-in-search"
            >
              Search patient or doctor
            </label>
            <Input
              id="check-in-search"
              value={checkInSearch}
              onChange={(event) => setCheckInSearch(event.target.value)}
              placeholder="Type patient name, doctor name, or specialty"
            />
          </div>

          {isBusy ? (
            <div className="space-y-2">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : null}

          {!isBusy && !checkInCandidates.length ? (
            <p className="rounded-md border border-dashed border-slate-300 bg-slate-50 px-4 py-6 text-center text-[13px] text-app-text-muted">
              No scheduled appointments available for check-in on selected date.
            </p>
          ) : null}

          {!isBusy && checkInCandidates.length ? (
            <div className="overflow-x-auto rounded-2xl border border-app-outline-variant/40">
              <Table density="compact">
                <TableHeader>
                  <TableRow>
                    <TableHead>Time</TableHead>
                    <TableHead>Patient</TableHead>
                    <TableHead>Doctor</TableHead>
                    <TableHead>Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {checkInCandidates.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>
                        {new Date(item.date).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </TableCell>
                      <TableCell className="font-medium">
                        {item.patient.name}
                      </TableCell>
                      <TableCell>
                        {item.doctor.name}{" "}
                        <span className="text-[11px] text-app-text-muted">
                          ({item.doctor.specialty})
                        </span>
                      </TableCell>
                      <TableCell>
                        <Button
                          type="button"
                          size="sm"
                          onClick={() => checkInMutation.mutate(item.id)}
                          disabled={checkInMutation.isPending}
                        >
                          <UserRoundCheck className="mr-2 h-4 w-4" />
                          {checkInMutation.isPending
                            ? "Checking in..."
                            : "Check in"}
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : null}

          <div className="flex justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setCheckInOpen(false);
                setCheckInSearch("");
              }}
            >
              Close
            </Button>
          </div>
        </div>
      </Modal>

      <Modal
        open={addPatientOpen}
        onClose={() => setAddPatientOpen(false)}
        title="Add Patient"
        description="Create a new patient profile from dashboard quick actions."
      >
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="quick-patient-name">Name</Label>
            <Input
              id="quick-patient-name"
              value={patientForm.name}
              onChange={(event) =>
                setPatientForm((prev) => ({
                  ...prev,
                  name: event.target.value,
                }))
              }
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="quick-patient-phone">Phone</Label>
            <Input
              id="quick-patient-phone"
              value={patientForm.phone}
              onChange={(event) =>
                setPatientForm((prev) => ({
                  ...prev,
                  phone: event.target.value,
                }))
              }
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="quick-patient-age">Age</Label>
            <Input
              id="quick-patient-age"
              type="number"
              min={0}
              max={120}
              value={patientForm.age}
              onChange={(event) =>
                setPatientForm((prev) => ({ ...prev, age: event.target.value }))
              }
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="quick-patient-gender">Gender</Label>
            <Select
              value={patientForm.gender}
              onValueChange={(value) =>
                setPatientForm((prev) => ({
                  ...prev,
                  gender: value as "MALE" | "FEMALE",
                }))
              }
            >
              <SelectTrigger id="quick-patient-gender">
                <SelectValue placeholder="Select gender" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="MALE">Male</SelectItem>
                <SelectItem value="FEMALE">Female</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="quick-patient-notes">Notes</Label>
            <Textarea
              id="quick-patient-notes"
              rows={3}
              value={patientForm.notes}
              onChange={(event) =>
                setPatientForm((prev) => ({
                  ...prev,
                  notes: event.target.value,
                }))
              }
            />
          </div>

          <div className="md:col-span-2 flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setAddPatientOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={submitAddPatient}
              disabled={addPatientMutation.isPending}
            >
              {addPatientMutation.isPending ? "Saving..." : "Create Patient"}
            </Button>
          </div>
        </div>
      </Modal>

      <Modal
        open={bookAppointmentOpen}
        onClose={() => setBookAppointmentOpen(false)}
        title="Book Appointment"
        description="Create a scheduled appointment from dashboard quick actions."
      >
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="quick-appointment-patient">Patient</Label>
            <Select
              value={appointmentForm.patientId}
              onValueChange={(value) =>
                setAppointmentForm((prev) => ({ ...prev, patientId: value }))
              }
            >
              <SelectTrigger id="quick-appointment-patient">
                <SelectValue placeholder="Select patient" />
              </SelectTrigger>
              <SelectContent>
                {(patientsOptionsQuery.data ?? []).map((patient) => (
                  <SelectItem key={patient.id} value={patient.id}>
                    {patient.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="quick-appointment-doctor">Doctor</Label>
            <Select
              value={appointmentForm.doctorId}
              onValueChange={(value) =>
                setAppointmentForm((prev) => ({ ...prev, doctorId: value }))
              }
            >
              <SelectTrigger id="quick-appointment-doctor">
                <SelectValue placeholder="Select doctor" />
              </SelectTrigger>
              <SelectContent>
                {(doctorsOptionsQuery.data ?? []).map((doctor) => (
                  <SelectItem key={doctor.id} value={doctor.id}>
                    {doctor.name} ({doctor.specialty})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="quick-appointment-date">Date & Time</Label>
            <Input
              id="quick-appointment-date"
              type="datetime-local"
              value={appointmentForm.date}
              onChange={(event) =>
                setAppointmentForm((prev) => ({
                  ...prev,
                  date: event.target.value,
                }))
              }
            />
          </div>

          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="quick-appointment-reason">Reason</Label>
            <Textarea
              id="quick-appointment-reason"
              rows={3}
              value={appointmentForm.reason}
              onChange={(event) =>
                setAppointmentForm((prev) => ({
                  ...prev,
                  reason: event.target.value,
                }))
              }
            />
          </div>

          <div className="md:col-span-2 flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setBookAppointmentOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={submitBookAppointment}
              disabled={
                bookAppointmentMutation.isPending ||
                patientsOptionsQuery.isLoading ||
                doctorsOptionsQuery.isLoading
              }
            >
              {bookAppointmentMutation.isPending
                ? "Saving..."
                : "Book Appointment"}
            </Button>
          </div>
        </div>
      </Modal>

      <Modal
        open={noShowOpen}
        onClose={() => {
          setNoShowOpen(false);
          setNoShowSearch("");
        }}
        title="Mark No-show"
        description={`Select an appointment on ${selectedDateLabel} to mark as NO_SHOW.`}
        maxWidthClassName="max-w-3xl"
      >
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="no-show-search">Search patient or doctor</Label>
            <Input
              id="no-show-search"
              value={noShowSearch}
              onChange={(event) => setNoShowSearch(event.target.value)}
              placeholder="Type patient name, doctor name, or specialty"
            />
          </div>

          {isBusy ? (
            <div className="space-y-2">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : null}

          {!isBusy && !noShowCandidates.length ? (
            <p className="rounded-md border border-dashed border-slate-300 bg-slate-50 px-4 py-6 text-center text-[13px] text-app-text-muted">
              No appointments available for no-show action on selected date.
            </p>
          ) : null}

          {!isBusy && noShowCandidates.length ? (
            <div className="overflow-x-auto rounded-2xl border border-app-outline-variant/40">
              <Table density="compact">
                <TableHeader>
                  <TableRow>
                    <TableHead>Time</TableHead>
                    <TableHead>Patient</TableHead>
                    <TableHead>Doctor</TableHead>
                    <TableHead>Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {noShowCandidates.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>
                        {new Date(item.date).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </TableCell>
                      <TableCell className="font-medium">
                        {item.patient.name}
                      </TableCell>
                      <TableCell>
                        {item.doctor.name}{" "}
                        <span className="text-[11px] text-app-text-muted">
                          ({item.doctor.specialty})
                        </span>
                      </TableCell>
                      <TableCell>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => noShowMutation.mutate(item.id)}
                          disabled={noShowMutation.isPending}
                        >
                          <Workflow className="mr-2 h-4 w-4" />
                          {noShowMutation.isPending
                            ? "Updating..."
                            : "Mark No-show"}
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : null}

          <div className="flex justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setNoShowOpen(false);
                setNoShowSearch("");
              }}
            >
              Close
            </Button>
          </div>
        </div>
      </Modal>

      <Modal
        open={viewDoctorsOpen}
        onClose={() => {
          setViewDoctorsOpen(false);
          setDoctorSearch("");
        }}
        title="Doctors Directory"
        description="Browse active and inactive doctors from dashboard quick actions."
        maxWidthClassName="max-w-3xl"
      >
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="doctor-search">Search doctor or specialty</Label>
            <Input
              id="doctor-search"
              value={doctorSearch}
              onChange={(event) => setDoctorSearch(event.target.value)}
              placeholder="Type doctor name or specialty"
            />
          </div>

          {doctorsDirectoryQuery.isLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : null}

          {!doctorsDirectoryQuery.isLoading &&
          !filteredDoctorsDirectory.length ? (
            <p className="rounded-md border border-dashed border-slate-300 bg-slate-50 px-4 py-6 text-center text-[13px] text-app-text-muted">
              No doctors found.
            </p>
          ) : null}

          {!doctorsDirectoryQuery.isLoading &&
          filteredDoctorsDirectory.length ? (
            <div className="overflow-x-auto rounded-2xl border border-app-outline-variant/40">
              <Table density="compact">
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Specialty</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredDoctorsDirectory.map((doctor) => (
                    <TableRow key={doctor.id}>
                      <TableCell className="font-medium">
                        {doctor.name}
                      </TableCell>
                      <TableCell>{doctor.specialty}</TableCell>
                      <TableCell>
                        <Badge
                          variant={doctor.isActive ? "completed" : "default"}
                        >
                          {doctor.isActive ? "ACTIVE" : "INACTIVE"}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : null}

          <div className="flex justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setViewDoctorsOpen(false);
                setDoctorSearch("");
              }}
            >
              Close
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
