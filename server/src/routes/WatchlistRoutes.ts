import { Router } from "express";
import { requireAuth } from "../middleware/authMiddleware";
import { getWatchlist, getWatchlistWithData, addToWatchlist, removeFromWatchlist } from "../controllers/WatchlistController";

const router = Router();

router.use(requireAuth);

router.get("/", getWatchlist);
router.get("/with-data", getWatchlistWithData);
router.post("/", addToWatchlist);
router.delete("/:itemId", removeFromWatchlist);

export default router;