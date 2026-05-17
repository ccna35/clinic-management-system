import bcrypt from "bcrypt";

export async function hashPassword(plainText: string): Promise<string> {
    return bcrypt.hash(plainText, 10);
}

export async function comparePassword(plainText: string, hash: string): Promise<boolean> {
    return bcrypt.compare(plainText, hash);
}
