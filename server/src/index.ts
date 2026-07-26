import { env } from "./config/env";
import express from "express";
import cookieParser from "cookie-parser";
import { prisma } from "./lib/prisma";
import authRoutes from "./routes/authRoutes";

const app = express();

app.use(express.json());
app.use(cookieParser());

//const PORT = process.env.PORT || 4000;

app.get("/health", async (_req, res) => {
    const userCount = await prisma.user.count();
    res.json({ status: "ok", });
});

app.use("/api/auth", authRoutes);

app.listen(env.PORT, () => {
    console.log(`Server is running on http://localhost:${env.PORT}`);
});