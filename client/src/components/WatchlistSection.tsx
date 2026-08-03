import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getWatchlist, removeFromWatchlist } from "../api/watchlist";
import type { WatchlistItemEntry } from "../types/stock";