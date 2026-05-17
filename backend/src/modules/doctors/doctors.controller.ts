import { Request, Response } from "express";
import { asyncHandler } from "../../utils/asyncHandler";
import { ListDoctorsQuery } from "./doctors.schemas";
import {
    createDoctor,
    getDoctorById,
    listDoctors,
    softDeleteDoctor,
    updateDoctor
} from "./doctors.service";

export const getDoctors = asyncHandler(async (req: Request, res: Response) => {
    const query = req.query as unknown as ListDoctorsQuery;
    const result = await listDoctors(query);

    res.status(200).json({
        success: true,
        data: result.data,
        meta: result.meta
    });
});

export const getDoctor = asyncHandler(async (req: Request, res: Response) => {
    const result = await getDoctorById(req.params.id);

    res.status(200).json({
        success: true,
        data: result
    });
});

export const createDoctorHandler = asyncHandler(async (req: Request, res: Response) => {
    const result = await createDoctor(req.body);

    res.status(201).json({
        success: true,
        data: result
    });
});

export const updateDoctorHandler = asyncHandler(async (req: Request, res: Response) => {
    const result = await updateDoctor(req.params.id, req.body);

    res.status(200).json({
        success: true,
        data: result
    });
});

export const deleteDoctorHandler = asyncHandler(async (req: Request, res: Response) => {
    await softDeleteDoctor(req.params.id);

    res.status(200).json({
        success: true,
        data: null
    });
});
