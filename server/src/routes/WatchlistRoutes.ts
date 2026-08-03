import { Router } from "express";
import { requireAuth } from "../middleware/authMiddleware";
import { getWatchlist, addToWatchlist, removeFromWatchlist } from "../controllers/WatchlistController";

const router = Router();

router.use(requireAuth);

router.get("/", getWatchlist);
router.post("/", addToWatchlist);
router.delete("/:itemId", removeFromWatchlist);

export default router;