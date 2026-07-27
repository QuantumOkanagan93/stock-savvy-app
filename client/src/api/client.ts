const API_BASE_URL = import.meta.env.VITE_API_URL || "https://localhost:4000";

export class ApiError extends Error {
    constructor(
        message: string,
        status: number,
        fieldErrors?: Record<string, string[]>
    ) {
        super(message);
        this.name = "ApiError";
        this.status = status;
        this.fieldErrors = fieldErrors;
    }
}

interface RequestOptions {
    method?: "GET" | "POST" | "PATCH" | "DELETE";
    body?: unknown;
}