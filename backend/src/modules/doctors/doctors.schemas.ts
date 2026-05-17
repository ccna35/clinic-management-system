import { z } from "zod";

const idSchema = z.object({
    id: z.string().uuid("Invalid doctor id")
});

const phoneSchema = z
    .string()
    .min(7, "Phone is required")
    .max(20, "Phone is too long")
    .regex(/^[0-9+\-\s()]+$/, "Invalid phone format");

export const createDoctorBodySchema = z.object({
    name: z.string().min(2, "Name is required").max(100),
    specialty: z.string().min(2, "Specialty is required").max(100),
    phone: phoneSchema.optional(),
    email: z.string().email().optional(),
    avatarUrl: z.string().url().optional(),
    isActive: z.boolean().optional()
});

export const updateDoctorBodySchema = createDoctorBodySchema
    .partial()
    .refine((payload) => Object.keys(payload).length > 0, {
        message: "At least one field is required"
    });

export const doctorParamsSchema = idSchema;

export const listDoctorsQuerySchema = z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(10),
    search: z.string().trim().optional(),
    isActive: z.coerce.boolean().optional()
});

export type CreateDoctorInput = z.infer<typeof createDoctorBodySchema>;
export type UpdateDoctorInput = z.infer<typeof updateDoctorBodySchema>;
export type ListDoctorsQuery = z.infer<typeof listDoctorsQuerySchema>;
