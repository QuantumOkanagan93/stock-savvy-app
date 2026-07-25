import express from "express";
import { prisma } from "./lib/prisma";

const app = express();

const PORT = process.env.PORT || 4000;

app.get("/health", async (_req, res) => {
    const userCount = await prisma.user.count();
    res.json({ status: "ok"});
});

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});