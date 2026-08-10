import { env } from "./config/env";
import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import { prisma } from "./lib/prisma";
import authRoutes from "./routes/authRoutes";
import stockRoutes from "./routes/StockRoutes";
import watchlistRoutes from "./routes/WatchlistRoutes";

const app = express();

const allowedOrigins = [
    'https://localhost:5173',  //Local Dev Environment
    'https://localhost:3000',  //Local Fallback
    'https://your-netlify-app.netlify.app',   //replace with live Netlify URL
];

/**
 * Credentials: true is required for the httpOnly auth cookie
 * to be sent/received cross-origin (client: 5173, API: 4000)
 */


/*
app.use(
    cors({
        origin: env.CLIENT_URL,
        credentials: true,
    })
);
*/
app.use(cors({
    origin: function (origin, callback) {
        if (!origin) return callback(null, true);
        if (allowedOrigins.indexOf(origin) !== -1) {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true,   //CRITICAL FLAG
    optionsSuccessStatus: 200
}));

app.use(express.json());
app.use(cookieParser());

//const PORT = process.env.PORT || 4000;

app.get("/health", async (_req, res) => {
    const userCount = await prisma.user.count();
    res.json({ status: "ok", });
});

app.use("/api/auth", authRoutes);
app.use("/api/stocks", stockRoutes);
app.use("/api/watchlist", watchlistRoutes);

app.listen(env.PORT, () => {
    console.log(`Server is running on http://localhost:${env.PORT}`);
});