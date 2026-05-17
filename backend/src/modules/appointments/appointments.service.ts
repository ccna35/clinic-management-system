import { AppointmentStatus, Prisma } from "@prisma/client";
import { prisma } from "../../db/prisma";
import { ApiError } from "../../utils/ApiError";
import {
    CreateAppointmentInput,
    ListAppointmentsQuery,
    UpdateAppointmentInput,
    UpdateAppointmentStatusInput
} from "./appointments.schemas";

const appointmentSelect = {
    id: true,
    date: true,
    reason: true,
    status: true,
    createdAt: true,
    updatedAt: true,
    patient: {
        select: {
            id: true,
            name: true,
            phone: true,
            status: true
        }
    },
    doctor: {
        select: {
            id: true,
            name: true,
            specialty: true,
            isActive: true
        }
    },
    statusEvents: {
        select: {
            fromStatus: true,
            toStatus: true,
            changedAt: true
        },
        orderBy: {
            changedAt: "asc"
        }
    }
} satisfies Prisma.AppointmentSelect;

type AppointmentRecord = Prisma.AppointmentGetPayload<{ select: typeof appointmentSelect }>;
type AppointmentResponse = Omit<AppointmentRecord, "statusEvents"> & {
    statusTimeline: Array<{
        fromStatus: AppointmentStatus | null;
        toStatus: AppointmentStatus;
        changedAt: Date;
    }>;
    checkedInAt: Date | null;
    inProgressAt: Date | null;
    completedAt: Date | null;
    actualWaitMinutes: number | null;
    liveWaitMinutes: number | null;
};

const allowedStatusTransitions: Record<AppointmentStatus, AppointmentStatus[]> = {
    [AppointmentStatus.SCHEDULED]: [AppointmentStatus.WAITING, AppointmentStatus.CANCELLED, AppointmentStatus.NO_SHOW],
    [AppointmentStatus.WAITING]: [AppointmentStatus.IN_PROGRESS, AppointmentStatus.CANCELLED, AppointmentStatus.NO_SHOW],
    [AppointmentStatus.IN_PROGRESS]: [AppointmentStatus.COMPLETED],
    [AppointmentStatus.COMPLETED]: [],
    [AppointmentStatus.CANCELLED]: [],
    [AppointmentStatus.NO_SHOW]: []
};

function assertValidStatusTransition(fromStatus: AppointmentStatus, toStatus: AppointmentStatus): void {
    if (fromStatus === toStatus) {
        return;
    }

    const allowedNextStatuses = allowedStatusTransitions[fromStatus];

    if (!allowedNextStatuses.includes(toStatus)) {
        throw new ApiError(400, `Invalid status transition from ${fromStatus} to ${toStatus}`);
    }
}

function deriveWaitMetrics(
    status: AppointmentStatus,
    statusEvents: Array<{ toStatus: AppointmentStatus; changedAt: Date }>
): {
    checkedInAt: Date | null;
    inProgressAt: Date | null;
    completedAt: Date | null;
    actualWaitMinutes: number | null;
    liveWaitMinutes: number | null;
} {
    const checkedInAt = statusEvents.find((event) => event.toStatus === AppointmentStatus.WAITING)?.changedAt ?? null;
    const inProgressAt = statusEvents.find((event) => event.toStatus === AppointmentStatus.IN_PROGRESS)?.changedAt ?? null;
    const completedAt = statusEvents.find((event) => event.toStatus === AppointmentStatus.COMPLETED)?.changedAt ?? null;

    const actualWaitMinutes =
        checkedInAt && inProgressAt
            ? Math.max(0, Math.floor((inProgressAt.getTime() - checkedInAt.getTime()) / 60_000))
            : null;

    const liveWaitMinutes =
        status === AppointmentStatus.WAITING && checkedInAt
            ? Math.max(0, Math.floor((Date.now() - checkedInAt.getTime()) / 60_000))
            : null;

    return {
        checkedInAt,
        inProgressAt,
        completedAt,
        actualWaitMinutes,
        liveWaitMinutes
    };
}

function mapAppointmentWithWaitMetrics(appointment: AppointmentRecord): AppointmentResponse {
    const { statusEvents, ...baseAppointment } = appointment;
    const waitMetrics = deriveWaitMetrics(appointment.status, statusEvents);

    return {
        ...baseAppointment,
        statusTimeline: statusEvents.map((event) => ({
            fromStatus: event.fromStatus,
            toStatus: event.toStatus,
            changedAt: event.changedAt
        })),
        ...waitMetrics
    };
}

function buildAppointmentWhere(query: ListAppointmentsQuery): Prisma.AppointmentWhereInput {
    const where: Prisma.AppointmentWhereInput = {};

    if (query.status) {
        where.status = query.status;
    }

    if (query.doctorId) {
        where.doctorId = query.doctorId;
    }

    if (query.patientId) {
        where.patientId = query.patientId;
    }

    if (query.date) {
        const dayStart = new Date(query.date);
        const dayEnd = new Date(query.date);
        dayEnd.setHours(23, 59, 59, 999);

        where.date = {
            gte: dayStart,
            lte: dayEnd
        };
    }

    return where;
}

async function ensurePatientExists(patientId: string): Promise<void> {
    const patient = await prisma.patient.findUnique({
        where: { id: patientId },
        select: { id: true, status: true }
    });

    if (!patient) {
        throw new ApiError(404, "Patient not found");
    }

    if (patient.status !== "ACTIVE") {
        throw new ApiError(400, "Cannot use inactive patient for appointment");
    }
}

async function ensureDoctorExists(doctorId: string): Promise<void> {
    const doctor = await prisma.doctor.findUnique({
        where: { id: doctorId },
        select: { id: true, isActive: true }
    });

    if (!doctor) {
        throw new ApiError(404, "Doctor not found");
    }

    if (!doctor.isActive) {
        throw new ApiError(400, "Cannot use inactive doctor for appointment");
    }
}

async function ensureNoDoctorTimeConflict(
    doctorId: string,
    date: Date,
    currentAppointmentId?: string
): Promise<void> {
    const conflict = await prisma.appointment.findFirst({
        where: {
            doctorId,
            date,
            ...(currentAppointmentId
                ? {
                    id: {
                        not: currentAppointmentId
                    }
                }
                : {}),
            status: {
                in: [AppointmentStatus.SCHEDULED, AppointmentStatus.WAITING]
            }
        },
        select: { id: true }
    });

    if (conflict) {
        throw new ApiError(409, "Doctor already has an appointment at this time");
    }
}

export async function listAppointments(query: ListAppointmentsQuery): Promise<{
    data: AppointmentResponse[],
    meta: { total: number; page: number; limit: number }
}> {
    const where = buildAppointmentWhere(query);
    const skip = (query.page - 1) * query.limit;

    const [total, appointments] = await Promise.all([
        prisma.appointment.count({ where }),
        prisma.appointment.findMany({
            where,
            skip,
            take: query.limit,
            orderBy: { date: "asc" },
            select: appointmentSelect
        })
    ]);

    return {
        data: appointments.map(mapAppointmentWithWaitMetrics),
        meta: {
            total,
            page: query.page,
            limit: query.limit
        }
    };
}

export async function getAppointmentById(
    id: string
): Promise<AppointmentResponse> {
    const appointment = await prisma.appointment.findUnique({
        where: { id },
        select: appointmentSelect
    });

    if (!appointment) {
        throw new ApiError(404, "Appointment not found");
    }

    return mapAppointmentWithWaitMetrics(appointment);
}

export async function createAppointment(
    payload: CreateAppointmentInput
): Promise<AppointmentResponse> {
    await Promise.all([ensurePatientExists(payload.patientId), ensureDoctorExists(payload.doctorId)]);
    await ensureNoDoctorTimeConflict(payload.doctorId, payload.date);

    const appointment = await prisma.$transaction(async (tx) => {
        const created = await tx.appointment.create({
            data: payload,
            select: appointmentSelect
        });

        await tx.appointmentStatusEvent.create({
            data: {
                appointmentId: created.id,
                fromStatus: null,
                toStatus: created.status
            }
        });

        return tx.appointment.findUniqueOrThrow({
            where: { id: created.id },
            select: appointmentSelect
        });
    });

    return mapAppointmentWithWaitMetrics(appointment);
}

export async function updateAppointment(
    id: string,
    payload: UpdateAppointmentInput
): Promise<AppointmentResponse> {
    const existing = await prisma.appointment.findUnique({
        where: { id },
        select: {
            id: true,
            patientId: true,
            doctorId: true,
            date: true,
            status: true
        }
    });

    if (!existing) {
        throw new ApiError(404, "Appointment not found");
    }

    const nextPatientId = payload.patientId ?? existing.patientId;
    const nextDoctorId = payload.doctorId ?? existing.doctorId;
    const nextDate = payload.date ?? existing.date;

    await Promise.all([ensurePatientExists(nextPatientId), ensureDoctorExists(nextDoctorId)]);
    await ensureNoDoctorTimeConflict(nextDoctorId, nextDate, existing.id);

    if (payload.status) {
        assertValidStatusTransition(existing.status, payload.status);
    }

    const appointment = await prisma.$transaction(async (tx) => {
        const updated = await tx.appointment.update({
            where: { id },
            data: payload,
            select: appointmentSelect
        });

        if (payload.status && payload.status !== existing.status) {
            await tx.appointmentStatusEvent.create({
                data: {
                    appointmentId: id,
                    fromStatus: existing.status,
                    toStatus: payload.status
                }
            });

            return tx.appointment.findUniqueOrThrow({
                where: { id },
                select: appointmentSelect
            });
        }

        return updated;
    });

    return mapAppointmentWithWaitMetrics(appointment);
}

export async function updateAppointmentStatus(
    id: string,
    payload: UpdateAppointmentStatusInput
): Promise<AppointmentResponse> {
    const existing = await prisma.appointment.findUnique({
        where: { id },
        select: {
            id: true,
            status: true
        }
    });

    if (!existing) {
        throw new ApiError(404, "Appointment not found");
    }

    if (existing.status === payload.status) {
        return getAppointmentById(id);
    }

    assertValidStatusTransition(existing.status, payload.status);

    const appointment = await prisma.$transaction(async (tx) => {
        await tx.appointment.update({
            where: { id },
            data: { status: payload.status }
        });

        await tx.appointmentStatusEvent.create({
            data: {
                appointmentId: id,
                fromStatus: existing.status,
                toStatus: payload.status
            }
        });

        return tx.appointment.findUniqueOrThrow({
            where: { id },
            select: appointmentSelect
        });
    });

    return mapAppointmentWithWaitMetrics(appointment);
}

export async function deleteAppointment(id: string): Promise<void> {
    await getAppointmentById(id);

    await prisma.appointment.delete({
        where: { id }
    });
}
