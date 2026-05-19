import { AppointmentStatus } from "@prisma/client";
import { z } from "zod";

const idSchema = z.object({
    id: z.string().uuid("Invalid appointment id")
});

export const createAppointmentBodySchema = z.object({
    patientId: z.string().uuid("Invalid patient id"),
    doctorId: z.string().uuid("Invalid doctor id"),
    date: z.coerce.date(),
    reason: z.string().max(500).optional(),
    status: z.nativeEnum(AppointmentStatus).optional()
});

export const updateAppointmentBodySchema = z
    .object({
        patientId: z.string().uuid("Invalid patient id").optional(),
        doctorId: z.string().uuid("Invalid doctor id").optional(),
        date: z.coerce.date().optional(),
        reason: z.string().max(500).optional(),
        status: z.nativeEnum(AppointmentStatus).optional()
    })
    .refine((payload) => Object.keys(payload).length > 0, {
        message: "At least one field is required"
    });

export const updateAppointmentStatusBodySchema = z.object({
    status: z.nativeEnum(AppointmentStatus)
});

export const appointmentParamsSchema = idSchema;

export const listAppointmentsQuerySchema = z
    .object({
        page: z.coerce.number().int().min(1).default(1),
        limit: z.coerce.number().int().min(1).max(100).default(10),
        date: z.string().date().optional(),
        dateFrom: z.string().date().optional(),
        dateTo: z.string().date().optional(),
        status: z.nativeEnum(AppointmentStatus).optional(),
        doctorId: z.string().uuid().optional(),
        patientId: z.string().uuid().optional()
    })
    .refine(
        (query) => {
            if (!query.dateFrom || !query.dateTo) {
                return true;
            }

            return query.dateFrom <= query.dateTo;
        },
        {
            message: "dateFrom must be less than or equal to dateTo"
        }
    );

export type CreateAppointmentInput = z.infer<typeof createAppointmentBodySchema>;
export type UpdateAppointmentInput = z.infer<typeof updateAppointmentBodySchema>;
export type UpdateAppointmentStatusInput = z.infer<typeof updateAppointmentStatusBodySchema>;
export type ListAppointmentsQuery = z.infer<typeof listAppointmentsQuerySchema>;
