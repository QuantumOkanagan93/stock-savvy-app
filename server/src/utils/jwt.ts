import jwt, { type Jwt } from "jsonwebtoken";
import { env } from "../config/env";

export interface JwtPayload {
    userId: string;
    email: string;
}

const TOKEN_EXPIRY = "7d";

export function signToken(payload: JwtPayload): string {
    return jwt.sign(payload, env.JWT_SECRET, { expiresIn: TOKEN_EXPIRY});
}


/**
 * Returns the decoded payload, or null if token is missing, expired, or tampered with
 * callers should treat null as "not authenticated"
 */
export function verifyToken(token: string): JwtPayload | null {
    try {
        return jwt.verify(token, env.JWT_SECRET) as JwtPayload;
    } catch {
        return null;
    }
}