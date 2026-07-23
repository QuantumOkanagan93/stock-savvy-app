import express from "express";

const app = express();

const PORT = process.env.PORT || 4000;

app.get("/health", (_req, res) => {
    res.json({ status: "ok"});
});

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});