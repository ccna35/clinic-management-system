import dotenv from "dotenv";
import { z } from "zod";

dotenv.config();

const envSchema = z.object({
    NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
    PORT: z.coerce.number().default(5000),
    DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
    JWT_SECRET: z.string().min(10, "JWT_SECRET must be at least 10 characters"),
    JWT_EXPIRES_IN: z.string().default("1d")
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
    const formatted = parsed.error.issues
        .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
        .join("; ");

    throw new Error(`Invalid environment variables: ${formatted}`);
}

export const env = parsed.data;
