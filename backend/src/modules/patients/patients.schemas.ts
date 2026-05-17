import { PatientStatus } from "@prisma/client";
import { z } from "zod";

const idSchema = z.object({
    id: z.string().uuid("Invalid patient id")
});

const phoneSchema = z
    .string()
    .min(7, "Phone is required")
    .max(20, "Phone is too long")
    .regex(/^[0-9+\-\s()]+$/, "Invalid phone format");

export const createPatientBodySchema = z.object({
    name: z.string().min(2, "Name is required").max(100),
    phone: phoneSchema,
    age: z.number().int().min(0).max(120).optional(),
    gender: z.enum(["MALE", "FEMALE"]).optional(),
    notes: z.string().max(1000).optional()
});

export const updatePatientBodySchema = createPatientBodySchema
    .partial()
    .refine((payload) => Object.keys(payload).length > 0, {
        message: "At least one field is required"
    });

export const patientParamsSchema = idSchema;

export const listPatientsQuerySchema = z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(10),
    search: z.string().trim().optional(),
    status: z.nativeEnum(PatientStatus).optional()
});

export type CreatePatientInput = z.infer<typeof createPatientBodySchema>;
export type UpdatePatientInput = z.infer<typeof updatePatientBodySchema>;
export type ListPatientsQuery = z.infer<typeof listPatientsQuerySchema>;
