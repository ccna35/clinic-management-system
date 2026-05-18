import { z } from "zod";

const idSchema = z.object({
    id: z.string().uuid("Invalid receptionist id")
});

export const createReceptionistBodySchema = z.object({
    name: z.string().min(2, "Name is required").max(100),
    email: z.string().email("Invalid email"),
    password: z.string().min(8, "Password must be at least 8 characters").max(100)
});

export const updateReceptionistBodySchema = z
    .object({
        name: z.string().min(2).max(100).optional(),
        email: z.string().email().optional()
    })
    .refine((payload) => Object.keys(payload).length > 0, {
        message: "At least one field is required"
    });

export const receptionistParamsSchema = idSchema;

export const listReceptionistsQuerySchema = z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(10),
    search: z.string().trim().optional()
});

export type CreateReceptionistInput = z.infer<typeof createReceptionistBodySchema>;
export type UpdateReceptionistInput = z.infer<typeof updateReceptionistBodySchema>;
export type ListReceptionistsQuery = z.infer<typeof listReceptionistsQuerySchema>;
