import bcrypt from "bcryptjs";

const SALT_ROUNDS = 12;

export async function hassPassword(plainPassword: string): Promise<string> {
    return bcrypt.hash(plainPassword, SALT_ROUNDS);
}

export async function verifyPassword(
    plainPassword: string,
    hash: string
): Promise<boolean> {
    return bcrypt.compare(plainPassword, hash);
}