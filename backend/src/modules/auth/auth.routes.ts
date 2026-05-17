import { Router } from "express";
import { requireAuth } from "../../middleware/auth.middleware";
import { validate } from "../../middleware/validate.middleware";
import { login, me } from "./auth.controller";
import { loginBodySchema } from "./auth.schemas";

const authRouter = Router();

authRouter.post("/login", validate({ body: loginBodySchema }), login);
authRouter.get("/me", requireAuth, me);

export { authRouter };
