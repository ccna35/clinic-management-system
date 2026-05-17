import { Router } from "express";
import { requireAuth } from "../../middleware/auth.middleware";
import { summary, todaySchedule } from "./dashboard.controller";

const dashboardRouter = Router();

dashboardRouter.use(requireAuth);

dashboardRouter.get("/summary", summary);
dashboardRouter.get("/today-schedule", todaySchedule);

export { dashboardRouter };
