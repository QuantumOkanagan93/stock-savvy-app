import type { Request, Response } from "express";
import { prisma } from "../lib/prisma";
import { hashPassword, verifyPassword } from "../utils/password";
import { signToken } from "../utils/jwt";
import { signupSchema, loginSchema } from "../validation/authSchema";
import { authCookieOptions } from "../utils/cookieOptions";
import { COOKIE_NAME } from "../middleware/authMiddleware";

/** Shape returned to the client -- never includes passwordHash. */
function toPublicUser(user: { id: string; email: string; createdAt: Date }) {
  return { id: user.id, email: user.email, createdAt: user.createdAt };
}

export async function signup(req: Request, res: Response) {
  const parsed = signupSchema.safeParse(req.body);
  if (!parsed.success) {
    return res
      .status(400)
      .json({ error: parsed.error.flatten().fieldErrors });
  }

  const { email, password } = parsed.data;

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    // Deliberately vague -- don't confirm/deny which emails are
    // registered any more than necessary
    return res.status(409).json({ error: "An account with this email already exists" });
  }

  const passwordHash = await hashPassword(password);

  const user = await prisma.user.create({
    data: { email, passwordHash },
  });

  const token = signToken({ userId: user.id, email: user.email });
  res.cookie(COOKIE_NAME, token, authCookieOptions);

  return res.status(201).json({ user: toPublicUser(user) });
}

export async function login(req: Request, res: Response) {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    return res
      .status(400)
      .json({ error: parsed.error.flatten().fieldErrors });
  }

  const { email, password } = parsed.data;

  const user = await prisma.user.findUnique({ where: { email } });

  // Same generic message whether the email doesn't exist or the
  // password is wrong -- avoids leaking which emails are registered.
  const invalidCredentialsResponse = () =>
    res.status(401).json({ error: "Invalid email or password" });

  if (!user) return invalidCredentialsResponse();

  const passwordValid = await verifyPassword(password, user.passwordHash);
  if (!passwordValid) return invalidCredentialsResponse();

  const token = signToken({ userId: user.id, email: user.email });
  res.cookie(COOKIE_NAME, token, authCookieOptions);

  return res.status(200).json({ user: toPublicUser(user) });
}

export async function logout(_req: Request, res: Response) {
  res.clearCookie(COOKIE_NAME, {
    httpOnly: authCookieOptions.httpOnly,
    secure: authCookieOptions.secure,
    sameSite: authCookieOptions.sameSite,
  });
  return res.status(200).json({ message: "Logged out" });
}

/** Returns the currently authenticated user. Requires requireAuth
 *  middleware to have run first (req.user populated). */
export async function me(req: Request, res: Response) {
  const user = await prisma.user.findUnique({
    where: { id: req.user!.userId },
  });

  if (!user) {
    return res.status(401).json({ error: "Not authenticated" });
  }

  return res.status(200).json({ user: toPublicUser(user) });
}