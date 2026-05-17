import { NextFunction, Request, Response } from "express";
import { ZodError } from "zod";
import { ApiError } from "../utils/ApiError";

export function notFoundMiddleware(_req: Request, res: Response): void {
    res.status(404).json({
        success: false,
        message: "Route not found"
    });
}

export function errorMiddleware(
    err: unknown,
    _req: Request,
    res: Response,
    _next: NextFunction
): void {
    if (err instanceof ZodError) {
        res.status(400).json({
            success: false,
            message: "Validation failed",
            errors: err.issues.map((issue) => ({
                path: issue.path.join("."),
                message: issue.message
            }))
        });
        return;
    }

    if (err instanceof ApiError) {
        res.status(err.statusCode).json({
            success: false,
            message: err.message
        });
        return;
    }

    const message = err instanceof Error ? err.message : "Internal server error";

    res.status(500).json({
        success: false,
        message
    });
}
