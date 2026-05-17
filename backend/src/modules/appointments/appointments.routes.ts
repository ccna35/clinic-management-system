import { Router } from "express";
import { requireAuth } from "../../middleware/auth.middleware";
import { validate } from "../../middleware/validate.middleware";
import {
    createAppointmentHandler,
    deleteAppointmentHandler,
    getAppointment,
    getAppointments,
    updateAppointmentHandler,
    updateAppointmentStatusHandler
} from "./appointments.controller";
import {
    appointmentParamsSchema,
    createAppointmentBodySchema,
    listAppointmentsQuerySchema,
    updateAppointmentBodySchema,
    updateAppointmentStatusBodySchema
} from "./appointments.schemas";

const appointmentsRouter = Router();

appointmentsRouter.use(requireAuth);

appointmentsRouter.get("/", validate({ query: listAppointmentsQuerySchema }), getAppointments);
appointmentsRouter.get("/:id", validate({ params: appointmentParamsSchema }), getAppointment);
appointmentsRouter.post("/", validate({ body: createAppointmentBodySchema }), createAppointmentHandler);
appointmentsRouter.patch(
    "/:id",
    validate({ params: appointmentParamsSchema, body: updateAppointmentBodySchema }),
    updateAppointmentHandler
);
appointmentsRouter.patch(
    "/:id/status",
    validate({ params: appointmentParamsSchema, body: updateAppointmentStatusBodySchema }),
    updateAppointmentStatusHandler
);
appointmentsRouter.delete("/:id", validate({ params: appointmentParamsSchema }), deleteAppointmentHandler);

export { appointmentsRouter };
