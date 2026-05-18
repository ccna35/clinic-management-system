import { Router } from "express";
import { requireAuth, requireRole } from "../../middleware/auth.middleware";
import { validate } from "../../middleware/validate.middleware";
import {
    createReceptionistHandler,
    deleteReceptionistHandler,
    getReceptionist,
    getReceptionists,
    updateReceptionistHandler
} from "./receptionists.controller";
import {
    createReceptionistBodySchema,
    listReceptionistsQuerySchema,
    receptionistParamsSchema,
    updateReceptionistBodySchema
} from "./receptionists.schemas";

const receptionistsRouter = Router();

receptionistsRouter.use(requireAuth);
receptionistsRouter.use(requireRole(["ADMIN"]));

receptionistsRouter.get("/", validate({ query: listReceptionistsQuerySchema }), getReceptionists);
receptionistsRouter.get("/:id", validate({ params: receptionistParamsSchema }), getReceptionist);
receptionistsRouter.post("/", validate({ body: createReceptionistBodySchema }), createReceptionistHandler);
receptionistsRouter.patch(
    "/:id",
    validate({ params: receptionistParamsSchema, body: updateReceptionistBodySchema }),
    updateReceptionistHandler
);
receptionistsRouter.delete("/:id", validate({ params: receptionistParamsSchema }), deleteReceptionistHandler);

export { receptionistsRouter };
