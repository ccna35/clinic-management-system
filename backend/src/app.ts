import cors from "cors";
import express from "express";
import helmet from "helmet";
import morgan from "morgan";
import { errorMiddleware, notFoundMiddleware } from "./middleware/error.middleware";
import { appointmentsRouter } from "./modules/appointments/appointments.routes";
import { authRouter } from "./modules/auth/auth.routes";
import { dashboardRouter } from "./modules/dashboard/dashboard.routes";
import { doctorsRouter } from "./modules/doctors/doctors.routes";
import { patientsRouter } from "./modules/patients/patients.routes";
import { receptionistsRouter } from "./modules/receptionists/receptionists.routes";

export const app = express();

app.use(helmet());
app.use(cors());
app.use(morgan("dev"));
app.use(express.json());

app.get("/api/health", (_req, res) => {
    res.json({
        success: true,
        data: {
            status: "ok"
        }
    });
});

app.get("/api", (_req, res) => {
    res.json({
        success: true,
        data: {
            service: "clinic-management-backend"
        }
    });
});

app.use("/api/auth", authRouter);
app.use("/api/dashboard", dashboardRouter);
app.use("/api/patients", patientsRouter);
app.use("/api/doctors", doctorsRouter);
app.use("/api/appointments", appointmentsRouter);
app.use("/api/receptionists", receptionistsRouter);

app.use(notFoundMiddleware);
app.use(errorMiddleware);
