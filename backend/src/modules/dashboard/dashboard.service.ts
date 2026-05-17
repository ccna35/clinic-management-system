import { AppointmentStatus, Prisma } from "@prisma/client";
import { prisma } from "../../db/prisma";

function getTodayRange(): { start: Date; end: Date } {
    const start = new Date();
    start.setHours(0, 0, 0, 0);

    const end = new Date(start);
    end.setHours(23, 59, 59, 999);

    return { start, end };
}

export async function getDashboardSummary(): Promise<{
    todayAppointments: number;
    waitingPatients: number;
    completedVisits: number;
    cancelledOrNoShows: number;
    averageActualWaitMinutes: number | null;
    avgWaitSampleSize: number;
}> {
    const { start, end } = getTodayRange();

    const [todayAppointments, waitingPatients, completedVisits, cancelledOrNoShows, appointmentsForWaitMetrics] =
        await Promise.all([
            prisma.appointment.count({
                where: {
                    date: {
                        gte: start,
                        lte: end
                    }
                }
            }),
            prisma.appointment.count({
                where: {
                    date: {
                        gte: start,
                        lte: end
                    },
                    status: AppointmentStatus.WAITING
                }
            }),
            prisma.appointment.count({
                where: {
                    date: {
                        gte: start,
                        lte: end
                    },
                    status: AppointmentStatus.COMPLETED
                }
            }),
            prisma.appointment.count({
                where: {
                    date: {
                        gte: start,
                        lte: end
                    },
                    status: {
                        in: [AppointmentStatus.CANCELLED, AppointmentStatus.NO_SHOW]
                    }
                }
            }),
            prisma.appointment.findMany({
                where: {
                    date: {
                        gte: start,
                        lte: end
                    }
                },
                select: {
                    statusEvents: {
                        where: {
                            toStatus: {
                                in: [AppointmentStatus.WAITING, AppointmentStatus.IN_PROGRESS]
                            }
                        },
                        orderBy: {
                            changedAt: "asc"
                        },
                        select: {
                            toStatus: true,
                            changedAt: true
                        }
                    }
                }
            })
        ]);

    const waitDurations = appointmentsForWaitMetrics
        .map((appointment) => {
            const checkedInAt = appointment.statusEvents.find((event) => event.toStatus === AppointmentStatus.WAITING)?.changedAt;
            const inProgressAt = appointment.statusEvents.find((event) => event.toStatus === AppointmentStatus.IN_PROGRESS)?.changedAt;

            if (!checkedInAt || !inProgressAt) {
                return null;
            }

            return Math.max(0, Math.floor((inProgressAt.getTime() - checkedInAt.getTime()) / 60_000));
        })
        .filter((duration): duration is number => duration !== null);

    const avgWaitSampleSize = waitDurations.length;
    const averageActualWaitMinutes =
        avgWaitSampleSize > 0
            ? Math.round(waitDurations.reduce((sum, duration) => sum + duration, 0) / avgWaitSampleSize)
            : null;

    return {
        todayAppointments,
        waitingPatients,
        completedVisits,
        cancelledOrNoShows,
        averageActualWaitMinutes,
        avgWaitSampleSize
    };
}

const todayScheduleSelect = {
    id: true,
    date: true,
    reason: true,
    status: true,
    patient: {
        select: {
            id: true,
            name: true,
            phone: true
        }
    },
    doctor: {
        select: {
            id: true,
            name: true,
            specialty: true
        }
    }
} satisfies Prisma.AppointmentSelect;

export async function getTodaySchedule(): Promise<
    Prisma.AppointmentGetPayload<{ select: typeof todayScheduleSelect }>[]
> {
    const { start, end } = getTodayRange();

    return prisma.appointment.findMany({
        where: {
            date: {
                gte: start,
                lte: end
            }
        },
        orderBy: {
            date: "asc"
        },
        select: todayScheduleSelect
    });
}
