import type { Request, Response, NextFunction } from "express";
import { verifyToken } from "../utils/jwt";

const COOKIE_NAME = "token";

/**
 * Protects a route: requires a valid JWT in the httpOnly cookie
 * On success: attaches `{ userId, email} to `req.user`
 * On failure: responds 401
 * must be redirected/blocked from protected pages
 */

export function requireAuth(req: Request, res: Response, next: NextFunction) {
    const token = req.cookies?.[COOKIE_NAME];

    if(!token) {
        return res.status(401).json({ error: "Not authenticated"});
    }

    const payload = verifyToken(token);

    if(!payload) {
        return res.status(401).json({ error: "Session expired or invalid"});
    }

    req.user = payload;
    next();
}

export { COOKIE_NAME };