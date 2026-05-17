import { Prisma } from "@prisma/client";
import { prisma } from "../../db/prisma";
import { ApiError } from "../../utils/ApiError";
import { CreateDoctorInput, ListDoctorsQuery, UpdateDoctorInput } from "./doctors.schemas";

const doctorSelect = {
    id: true,
    name: true,
    specialty: true,
    phone: true,
    email: true,
    avatarUrl: true,
    isActive: true,
    createdAt: true,
    updatedAt: true
} satisfies Prisma.DoctorSelect;

function buildDoctorWhere(query: ListDoctorsQuery): Prisma.DoctorWhereInput {
    const where: Prisma.DoctorWhereInput = {};

    if (typeof query.isActive === "boolean") {
        where.isActive = query.isActive;
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
                specialty: {
                    contains: query.search,
                    mode: "insensitive"
                }
            },
            {
                email: {
                    contains: query.search,
                    mode: "insensitive"
                }
            }
        ];
    }

    return where;
}

export async function listDoctors(query: ListDoctorsQuery): Promise<{
    data: Prisma.DoctorGetPayload<{ select: typeof doctorSelect }>[],
    meta: { total: number; page: number; limit: number }
}> {
    const where = buildDoctorWhere(query);
    const skip = (query.page - 1) * query.limit;

    const [total, doctors] = await Promise.all([
        prisma.doctor.count({ where }),
        prisma.doctor.findMany({
            where,
            skip,
            take: query.limit,
            orderBy: { createdAt: "desc" },
            select: doctorSelect
        })
    ]);

    return {
        data: doctors,
        meta: {
            total,
            page: query.page,
            limit: query.limit
        }
    };
}

export async function getDoctorById(id: string): Promise<Prisma.DoctorGetPayload<{ select: typeof doctorSelect }>> {
    const doctor = await prisma.doctor.findUnique({
        where: { id },
        select: doctorSelect
    });

    if (!doctor) {
        throw new ApiError(404, "Doctor not found");
    }

    return doctor;
}

export async function createDoctor(payload: CreateDoctorInput): Promise<Prisma.DoctorGetPayload<{ select: typeof doctorSelect }>> {
    return prisma.doctor.create({
        data: payload,
        select: doctorSelect
    });
}

export async function updateDoctor(id: string, payload: UpdateDoctorInput): Promise<Prisma.DoctorGetPayload<{ select: typeof doctorSelect }>> {
    await getDoctorById(id);

    return prisma.doctor.update({
        where: { id },
        data: payload,
        select: doctorSelect
    });
}

export async function softDeleteDoctor(id: string): Promise<void> {
    await getDoctorById(id);

    await prisma.doctor.update({
        where: { id },
        data: {
            isActive: false
        }
    });
}
