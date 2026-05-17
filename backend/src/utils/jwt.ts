import jwt, { Secret, SignOptions } from "jsonwebtoken";
import { env } from "../config/env";

export interface JwtPayload {
    userId: string;
    role: string;
}

export function signAccessToken(payload: JwtPayload): string {
    return jwt.sign(payload, env.JWT_SECRET as Secret, {
        expiresIn: env.JWT_EXPIRES_IN
    } as SignOptions);
}

export function verifyAccessToken(token: string): JwtPayload {
    return jwt.verify(token, env.JWT_SECRET as Secret) as JwtPayload;
}
