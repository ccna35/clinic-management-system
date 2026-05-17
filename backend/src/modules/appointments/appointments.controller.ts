import { Request, Response } from "express";
import { asyncHandler } from "../../utils/asyncHandler";
import { ListAppointmentsQuery } from "./appointments.schemas";
import {
    createAppointment,
    deleteAppointment,
    getAppointmentById,
    listAppointments,
    updateAppointment,
    updateAppointmentStatus
} from "./appointments.service";

export const getAppointments = asyncHandler(async (req: Request, res: Response) => {
    const query = req.query as unknown as ListAppointmentsQuery;
    const result = await listAppointments(query);

    res.status(200).json({
        success: true,
        data: result.data,
        meta: result.meta
    });
});

export const getAppointment = asyncHandler(async (req: Request, res: Response) => {
    const result = await getAppointmentById(req.params.id);

    res.status(200).json({
        success: true,
        data: result
    });
});

export const createAppointmentHandler = asyncHandler(async (req: Request, res: Response) => {
    const result = await createAppointment(req.body);

    res.status(201).json({
        success: true,
        data: result
    });
});

export const updateAppointmentHandler = asyncHandler(async (req: Request, res: Response) => {
    const result = await updateAppointment(req.params.id, req.body);

    res.status(200).json({
        success: true,
        data: result
    });
});

export const updateAppointmentStatusHandler = asyncHandler(async (req: Request, res: Response) => {
    const result = await updateAppointmentStatus(req.params.id, req.body);

    res.status(200).json({
        success: true,
        data: result
    });
});

export const deleteAppointmentHandler = asyncHandler(async (req: Request, res: Response) => {
    await deleteAppointment(req.params.id);

    res.status(200).json({
        success: true,
        data: null
    });
});
