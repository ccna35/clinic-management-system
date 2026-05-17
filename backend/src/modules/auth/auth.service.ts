import { prisma } from "../../db/prisma";
import { ApiError } from "../../utils/ApiError";
import { comparePassword } from "../../utils/password";
import { signAccessToken } from "../../utils/jwt";

export async function loginUser(email: string, password: string): Promise<{ token: string }> {
    const user = await prisma.user.findUnique({ where: { email } });

    if (!user) {
        throw new ApiError(401, "Invalid email or password");
    }

    const isPasswordValid = await comparePassword(password, user.password);

    if (!isPasswordValid) {
        throw new ApiError(401, "Invalid email or password");
    }

    const token = signAccessToken({
        userId: user.id,
        role: user.role
    });

    return { token };
}

export async function getCurrentUser(userId: string): Promise<{ id: string; name: string; email: string; role: string }> {
    const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
            id: true,
            name: true,
            email: true,
            role: true
        }
    });

    if (!user) {
        throw new ApiError(404, "User not found");
    }

    return {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role
    };
}
