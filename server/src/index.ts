import { env } from "./config/env";
import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import { prisma } from "./lib/prisma";
import authRoutes from "./routes/authRoutes";
import stockRoutes from "./routes/StockRoutes";

const app = express();

/**
 * Credentials: true is required for the httpOnly auth cookie
 * to be sent/received cross-origin (client: 5173, API: 4000)
 */

app.use(
    cors({
        origin: env.CLIENT_URL,
        credentials: true,
    })
);

app.use(express.json());
app.use(cookieParser());

//const PORT = process.env.PORT || 4000;

app.get("/health", async (_req, res) => {
    const userCount = await prisma.user.count();
    res.json({ status: "ok", });
});

app.use("/api/auth", authRoutes);
app.use("/api/stocks", stockRoutes);

app.listen(env.PORT, () => {
    console.log(`Server is running on http://localhost:${env.PORT}`);
});