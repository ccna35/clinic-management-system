import { PatientStatus, Prisma } from "@prisma/client";
import { prisma } from "../../db/prisma";
import { ApiError } from "../../utils/ApiError";
import { CreatePatientInput, ListPatientsQuery, UpdatePatientInput } from "./patients.schemas";

const patientSelect = {
    id: true,
    name: true,
    phone: true,
    age: true,
    gender: true,
    notes: true,
    status: true,
    createdAt: true,
    updatedAt: true
} satisfies Prisma.PatientSelect;

function buildPatientWhere(query: ListPatientsQuery): Prisma.PatientWhereInput {
    const where: Prisma.PatientWhereInput = {};

    if (query.status) {
        where.status = query.status;
    }

    if (query.search) {
        where.OR = [
            {
                name: {
                    contains: query.search,
                    mode: "insensitive"
                }
            },
            {
                phone: {
                    contains: query.search,
                    mode: "insensitive"
                }
            }
        ];
    }

    return where;
}

export async function listPatients(query: ListPatientsQuery): Promise<{
    data: Prisma.PatientGetPayload<{ select: typeof patientSelect }>[],
    meta: { total: number; page: number; limit: number }
}> {
    const where = buildPatientWhere(query);
    const skip = (query.page - 1) * query.limit;

    const [total, patients] = await Promise.all([
        prisma.patient.count({ where }),
        prisma.patient.findMany({
            where,
            skip,
            take: query.limit,
            orderBy: { createdAt: "desc" },
            select: patientSelect
        })
    ]);

    return {
        data: patients,
        meta: {
            total,
            page: query.page,
            limit: query.limit
        }
    };
}

export async function getPatientById(id: string): Promise<Prisma.PatientGetPayload<{ select: typeof patientSelect }>> {
    const patient = await prisma.patient.findUnique({
        where: { id },
        select: patientSelect
    });

    if (!patient) {
        throw new ApiError(404, "Patient not found");
    }

    return patient;
}

export async function createPatient(payload: CreatePatientInput): Promise<Prisma.PatientGetPayload<{ select: typeof patientSelect }>> {
    return prisma.patient.create({
        data: payload,
        select: patientSelect
    });
}

export async function updatePatient(id: string, payload: UpdatePatientInput): Promise<Prisma.PatientGetPayload<{ select: typeof patientSelect }>> {
    await getPatientById(id);

    return prisma.patient.update({
        where: { id },
        data: payload,
        select: patientSelect
    });
}

export async function softDeletePatient(id: string): Promise<void> {
    await getPatientById(id);

    await prisma.patient.update({
        where: { id },
        data: {
            status: PatientStatus.INACTIVE
        }
    });
}
