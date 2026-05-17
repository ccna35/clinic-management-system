import { Router } from "express";
import { requireAuth } from "../../middleware/auth.middleware";
import { validate } from "../../middleware/validate.middleware";
import {
    createDoctorHandler,
    deleteDoctorHandler,
    getDoctor,
    getDoctors,
    updateDoctorHandler
} from "./doctors.controller";
import {
    createDoctorBodySchema,
    doctorParamsSchema,
    listDoctorsQuerySchema,
    updateDoctorBodySchema
} from "./doctors.schemas";

const doctorsRouter = Router();

doctorsRouter.use(requireAuth);

doctorsRouter.get("/", validate({ query: listDoctorsQuerySchema }), getDoctors);
doctorsRouter.get("/:id", validate({ params: doctorParamsSchema }), getDoctor);
doctorsRouter.post("/", validate({ body: createDoctorBodySchema }), createDoctorHandler);
doctorsRouter.patch(
    "/:id",
    validate({ params: doctorParamsSchema, body: updateDoctorBodySchema }),
    updateDoctorHandler
);
doctorsRouter.delete("/:id", validate({ params: doctorParamsSchema }), deleteDoctorHandler);

export { doctorsRouter };
