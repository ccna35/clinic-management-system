import { Request, Response } from "express";
import { asyncHandler } from "../../utils/asyncHandler";
import { getDashboardSummary, getTodaySchedule } from "./dashboard.service";

export const summary = asyncHandler(async (_req: Request, res: Response) => {
    const data = await getDashboardSummary();

    res.status(200).json({
        success: true,
        data
    });
});

export const todaySchedule = asyncHandler(async (_req: Request, res: Response) => {
    const data = await getTodaySchedule();

    res.status(200).json({
        success: true,
        data
    });
});
