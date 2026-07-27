import "dotenv/config";
import { z } from "zod";

const envSchema = z.object({
    DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
    FINNHUB_API_KEY: z.string().min(1, "FINNHUB_API_KEY is required"),
    JWT_SECRET: z
    .string()
    .min(32, "JWT_SECRET must be at least 32 characters long"),
    CLIENT_URL: z.string().default("http://localhost:5173"),
    PORT: z.string().default("4000"),
    NODE_ENV: z
    .enum(["development", "production", "test"])
    .default("development"),
});

const parsed = envSchema.safeParse(process.env);

if(!parsed.success) {
    console.error("Invalid environment variables");
    console.error(parsed.error.flatten().fieldErrors);
    throw new Error("Invalid environment variables -- check server/.env");
}

export const env = parsed.data;