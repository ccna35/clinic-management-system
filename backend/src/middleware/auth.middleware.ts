import { NextFunction, Request, Response } from "express";
import { ApiError } from "../utils/ApiError";
import { verifyAccessToken } from "../utils/jwt";

export interface AuthenticatedRequest extends Request {
    user?: {
        userId: string;
        role: string;
    };
}

export function requireAuth(req: AuthenticatedRequest, _res: Response, next: NextFunction): void {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
        next(new ApiError(401, "Unauthorized"));
        return;
    }

    const token = authHeader.split(" ")[1];

    try {
        const payload = verifyAccessToken(token);
        req.user = {
            userId: payload.userId,
            role: payload.role
        };
        next();
    } catch (_error) {
        next(new ApiError(401, "Invalid or expired token"));
    }
}
