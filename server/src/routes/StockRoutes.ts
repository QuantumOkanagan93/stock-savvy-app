import { Router } from "express";
import { requireAuth } from "../middleware/authMiddleware";
import {
    searchStocks,
    selectStock,
    getSearchHistory
} from "../controllers/StockController";

const router = Router();

router.use(requireAuth);  //every route listed below requires a logged-in user

router.get("/search", searchStocks);
router.post("/select", selectStock);
router.get("/history", getSearchHistory);

export default router;