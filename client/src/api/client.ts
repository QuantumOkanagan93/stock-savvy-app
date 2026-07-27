const API_BASE_URL = import.meta.env.VITE_API_URL || "https://localhost:4000";

export class ApiError extends Error {
    constructor(
        message: string,
        public readonly status: number,
        public readonly fieldErrors?: Record<string, string[]>
    ) {
        super(message);
        this.name = "ApiError";
    }
}