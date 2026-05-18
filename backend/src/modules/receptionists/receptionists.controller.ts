import { Request, Response } from "express";
import { asyncHandler } from "../../utils/asyncHandler";
import { ListReceptionistsQuery } from "./receptionists.schemas";
import {
    createReceptionist,
    deleteReceptionist,
    getReceptionistById,
    listReceptionists,
    updateReceptionist
} from "./receptionists.service";

export const getReceptionists = asyncHandler(async (req: Request, res: Response) => {
    const query = req.query as unknown as ListReceptionistsQuery;
    const result = await listReceptionists(query);

    res.status(200).json({
        success: true,
        data: result.data,
        meta: result.meta
    });
});

export const getReceptionist = asyncHandler(async (req: Request, res: Response) => {
    const result = await getReceptionistById(req.params.id);

    res.status(200).json({
        success: true,
        data: result
    });
});

export const createReceptionistHandler = asyncHandler(async (req: Request, res: Response) => {
    const result = await createReceptionist(req.body);

    res.status(201).json({
        success: true,
        data: result
    });
});

export const updateReceptionistHandler = asyncHandler(async (req: Request, res: Response) => {
    const result = await updateReceptionist(req.params.id, req.body);

    res.status(200).json({
        success: true,
        data: result
    });
});

export const deleteReceptionistHandler = asyncHandler(async (req: Request, res: Response) => {
    await deleteReceptionist(req.params.id);

    res.status(200).json({
        success: true,
        data: null
    });
});
