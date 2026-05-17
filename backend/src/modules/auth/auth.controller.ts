import { Request, Response } from "express";
import { AuthenticatedRequest } from "../../middleware/auth.middleware";
import { ApiError } from "../../utils/ApiError";
import { asyncHandler } from "../../utils/asyncHandler";
import { getCurrentUser, loginUser } from "./auth.service";

export const login = asyncHandler(async (req: Request, res: Response) => {
    const { email, password } = req.body as { email: string; password: string };
    const result = await loginUser(email, password);

    res.status(200).json({
        success: true,
        data: result
    });
});

export const me = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    if (!req.user) {
        throw new ApiError(401, "Unauthorized");
    }

    const user = await getCurrentUser(req.user.userId);

    res.status(200).json({
        success: true,
        data: user
    });
});
