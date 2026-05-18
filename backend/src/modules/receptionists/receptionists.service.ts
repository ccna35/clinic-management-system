import { Prisma } from "@prisma/client";
import { prisma } from "../../db/prisma";
import { ApiError } from "../../utils/ApiError";
import { hashPassword } from "../../utils/password";
import {
    CreateReceptionistInput,
    ListReceptionistsQuery,
    UpdateReceptionistInput
} from "./receptionists.schemas";

const receptionistSelect = {
    id: true,
    name: true,
    email: true,
    role: true,
    createdAt: true,
    updatedAt: true
} satisfies Prisma.UserSelect;

export async function listReceptionists(query: ListReceptionistsQuery): Promise<{
    data: Prisma.UserGetPayload<{ select: typeof receptionistSelect }>[];
    meta: { total: number; page: number; limit: number };
}> {
    const where: Prisma.UserWhereInput = { role: "RECEPTIONIST" };

    if (query.search) {
        where.AND = [
            { role: "RECEPTIONIST" },
            {
                OR: [
                    { name: { contains: query.search, mode: "insensitive" } },
                    { email: { contains: query.search, mode: "insensitive" } }
                ]
            }
        ];
        delete where.role;
    }

    const skip = (query.page - 1) * query.limit;

    const [total, receptionists] = await Promise.all([
        prisma.user.count({ where }),
        prisma.user.findMany({
            where,
            skip,
            take: query.limit,
            orderBy: { createdAt: "desc" },
            select: receptionistSelect
        })
    ]);

    return {
        data: receptionists,
        meta: { total, page: query.page, limit: query.limit }
    };
}

export async function getReceptionistById(
    id: string
): Promise<Prisma.UserGetPayload<{ select: typeof receptionistSelect }>> {
    const user = await prisma.user.findFirst({
        where: { id, role: "RECEPTIONIST" },
        select: receptionistSelect
    });

    if (!user) {
        throw new ApiError(404, "Receptionist not found");
    }

    return user;
}

export async function createReceptionist(
    payload: CreateReceptionistInput
): Promise<Prisma.UserGetPayload<{ select: typeof receptionistSelect }>> {
    const existing = await prisma.user.findUnique({ where: { email: payload.email } });

    if (existing) {
        throw new ApiError(409, "Email is already in use");
    }

    const hashedPassword = await hashPassword(payload.password);

    return prisma.user.create({
        data: {
            name: payload.name,
            email: payload.email,
            password: hashedPassword,
            role: "RECEPTIONIST"
        },
        select: receptionistSelect
    });
}

export async function updateReceptionist(
    id: string,
    payload: UpdateReceptionistInput
): Promise<Prisma.UserGetPayload<{ select: typeof receptionistSelect }>> {
    await getReceptionistById(id);

    if (payload.email) {
        const conflict = await prisma.user.findFirst({
            where: { email: payload.email, id: { not: id } }
        });

        if (conflict) {
            throw new ApiError(409, "Email is already in use");
        }
    }

    return prisma.user.update({
        where: { id },
        data: payload,
        select: receptionistSelect
    });
}

export async function deleteReceptionist(id: string): Promise<void> {
    await getReceptionistById(id);
    await prisma.user.delete({ where: { id } });
}
