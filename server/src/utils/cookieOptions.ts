import { env } from "../config/env";

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;


/**
 * httpOnly means client-side JS can't read this cookie (protects
 * against XSS token theft). secure is enabled in prod only
 * since it required HTTPS -- localhost dev over http would break otherwise
 */

export const authCookieOptions = {
    httpOnly: true,
    secure: env.NODE_ENV === "production",
    sameSite: "lax" as const,
    maxAge: SEVEN_DAYS_MS,
};