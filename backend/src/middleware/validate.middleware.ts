import { NextFunction, Request, RequestHandler, Response } from "express";
import { ZodError, ZodTypeAny } from "zod";

interface ValidationSchemas {
    body?: ZodTypeAny;
    params?: ZodTypeAny;
    query?: ZodTypeAny;
}

export function validate(schemas: ValidationSchemas): RequestHandler {
    return (req: Request, _res: Response, next: NextFunction) => {
        try {
            if (schemas.body) {
                req.body = schemas.body.parse(req.body);
            }

            if (schemas.params) {
                req.params = schemas.params.parse(req.params);
            }

            if (schemas.query) {
                req.query = schemas.query.parse(req.query);
            }

            next();
        } catch (error) {
            next(error as ZodError);
        }
    };
}
