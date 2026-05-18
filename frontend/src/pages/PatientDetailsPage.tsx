import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { api } from "../api/client";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../components/ui/table";
import { Skeleton } from "../components/ui/skeleton";
import { ArrowLeft } from "lucide-react";

interface Patient {
  id: string;
  name: string;
  phone: string;
  age: number | null;
  gender: "MALE" | "FEMALE" | null;
  notes: string | null;
  status: "ACTIVE" | "INACTIVE";
  createdAt: string;
}

interface Appointment {
  id: string;
  date: string;
  reason: string | null;
  status: string;
  doctor: { id: string; name: string; specialty: string };
}

export default function PatientDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [dateFilter, setDateFilter] = useState("");

  const {
    data: patient,
    isLoading: patientLoading,
    isError: patientError,
  } = useQuery<Patient>({
    queryKey: ["patient", id],
    queryFn: () => api.get(`/api/patients/${id}`).then((res) => res.data.data),
    enabled: !!id,
  });

  const { data: appointments, isLoading: apptLoading } = useQuery<
    Appointment[]
  >({
    queryKey: ["patient-appointments", id, dateFilter],
    queryFn: () =>
      api
        .get(`/api/appointments`, {
          params: {
            patientId: id,
            limit: 100,
            page: 1,
            ...(dateFilter ? { date: dateFilter } : {}),
          },
        })
        .then((res) => res.data.data),
    enabled: !!id,
  });

  const filteredAppointments = (appointments ?? []).filter((a) => {
    if (!search) return true;
    return (
      a.doctor.name.toLowerCase().includes(search.toLowerCase()) ||
      (a.reason ?? "").toLowerCase().includes(search.toLowerCase())
    );
  });

  if (patientError) {
    return (
      <div className="p-8 text-center text-red-500 font-medium">
        Patient not found or an error occurred.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Back button */}
      <Button
        variant="outline"
        size="sm"
        onClick={() => navigate("/patients")}
        className="gap-2"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Patients
      </Button>

      {/* Patient info card */}
      <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        {patientLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-7 w-48" />
            <Skeleton className="h-4 w-72" />
            <Skeleton className="h-4 w-60" />
          </div>
        ) : patient ? (
          <>
            <div className="flex items-start justify-between">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  {patient.name}
                </h1>
                <p className="text-sm text-gray-500 mt-1">
                  Registered {new Date(patient.createdAt).toLocaleDateString()}
                </p>
              </div>
              <Badge
                variant={patient.status === "ACTIVE" ? "completed" : "default"}
              >
                {patient.status}
              </Badge>
            </div>

            <div className="mt-6 grid grid-cols-2 gap-x-10 gap-y-4 text-sm sm:grid-cols-4">
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-gray-400">
                  Phone
                </p>
                <p className="mt-1 font-medium text-gray-800">
                  {patient.phone}
                </p>
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-gray-400">
                  Age
                </p>
                <p className="mt-1 font-medium text-gray-800">
                  {patient.age ?? "—"}
                </p>
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-gray-400">
                  Gender
                </p>
                <p className="mt-1 font-medium text-gray-800">
                  {patient.gender ?? "—"}
                </p>
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-gray-400">
                  Notes
                </p>
                <p className="mt-1 font-medium text-gray-800">
                  {patient.notes || "—"}
                </p>
              </div>
            </div>
          </>
        ) : null}
      </div>

      {/* Appointments section */}
      <div className="rounded-lg border border-gray-200 bg-white shadow-sm">
        <div className="flex flex-col gap-3 border-b border-gray-100 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-base font-semibold text-gray-900">
            Past Appointments
          </h2>
          <div className="flex gap-2">
            <Input
              placeholder="Search by doctor or reason..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-56 text-sm"
            />
            <Input
              type="date"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="w-40 text-sm"
            />
            {dateFilter && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setDateFilter("")}
              >
                Clear
              </Button>
            )}
          </div>
        </div>

        {apptLoading ? (
          <div className="space-y-2 p-6">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        ) : filteredAppointments.length === 0 ? (
          <p className="px-6 py-10 text-center text-sm text-gray-400">
            No appointments found.
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Doctor</TableHead>
                <TableHead>Specialty</TableHead>
                <TableHead>Reason</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredAppointments.map((appt) => (
                <TableRow key={appt.id}>
                  <TableCell>
                    {new Date(appt.date).toLocaleDateString()}
                  </TableCell>
                  <TableCell className="font-medium">
                    {appt.doctor.name}
                  </TableCell>
                  <TableCell className="text-gray-500">
                    {appt.doctor.specialty}
                  </TableCell>
                  <TableCell className="text-gray-500">
                    {appt.reason || "—"}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        appt.status === "COMPLETED"
                          ? "completed"
                          : appt.status === "CANCELLED"
                            ? "cancelled"
                            : appt.status === "SCHEDULED"
                              ? "scheduled"
                              : appt.status === "WAITING"
                                ? "waiting"
                                : appt.status === "IN_PROGRESS"
                                  ? "inprogress"
                                  : "default"
                      }
                    >
                      {appt.status}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  );
}
