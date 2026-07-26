import type { Request, Response } from "express";
import { prisma } from "../lib/prisma";
import { hashPassword, verifyPassword } from "../utils/password";
import { signToken } from "../utils/jwt";
import { signupSchema, loginSchema } from "../validation/authSchema";
import { authCookieOptions } from "../utils/cookieOptions";
import { COOKIE_NAME } from "../middleware/authMiddleware";