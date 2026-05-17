import { Request, Response } from "express";
import { asyncHandler } from "../../utils/asyncHandler";
import { ListPatientsQuery } from "./patients.schemas";
import {
    createPatient,
    getPatientById,
    listPatients,
    softDeletePatient,
    updatePatient
} from "./patients.service";

export const getPatients = asyncHandler(async (req: Request, res: Response) => {
    const query = req.query as unknown as ListPatientsQuery;
    const result = await listPatients(query);

    res.status(200).json({
        success: true,
        data: result.data,
        meta: result.meta
    });
});

export const getPatient = asyncHandler(async (req: Request, res: Response) => {
    const result = await getPatientById(req.params.id);

    res.status(200).json({
        success: true,
        data: result
    });
});

export const createPatientHandler = asyncHandler(async (req: Request, res: Response) => {
    const result = await createPatient(req.body);

    res.status(201).json({
        success: true,
        data: result
    });
});

export const updatePatientHandler = asyncHandler(async (req: Request, res: Response) => {
    const result = await updatePatient(req.params.id, req.body);

    res.status(200).json({
        success: true,
        data: result
    });
});

export const deletePatientHandler = asyncHandler(async (req: Request, res: Response) => {
    await softDeletePatient(req.params.id);

    res.status(200).json({
        success: true,
        data: null
    });
});
