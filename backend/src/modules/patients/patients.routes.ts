import { Router } from "express";
import { requireAuth } from "../../middleware/auth.middleware";
import { validate } from "../../middleware/validate.middleware";
import {
    createPatientHandler,
    deletePatientHandler,
    getPatient,
    getPatients,
    updatePatientHandler
} from "./patients.controller";
import {
    createPatientBodySchema,
    listPatientsQuerySchema,
    patientParamsSchema,
    updatePatientBodySchema
} from "./patients.schemas";

const patientsRouter = Router();

patientsRouter.use(requireAuth);

patientsRouter.get("/", validate({ query: listPatientsQuerySchema }), getPatients);
patientsRouter.get("/:id", validate({ params: patientParamsSchema }), getPatient);
patientsRouter.post("/", validate({ body: createPatientBodySchema }), createPatientHandler);
patientsRouter.patch(
    "/:id",
    validate({ params: patientParamsSchema, body: updatePatientBodySchema }),
    updatePatientHandler
);
patientsRouter.delete("/:id", validate({ params: patientParamsSchema }), deletePatientHandler);

export { patientsRouter };
