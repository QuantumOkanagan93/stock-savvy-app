const API_BASE_URL = import.meta.env.VITE_API_URL || "https://localhost:4000";

export class ApiError extends Error {
    readonly status: number;
    readonly fieldErrors?: Record<string, string[]>;

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


/*export class ApiError extends Error {
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

*/

interface RequestOptions {
    method?: "GET" | "POST" | "PATCH" | "DELETE";
    body?: unknown;
}

/**
 * Shared fetch wrapping: `credentials: "include"` is the critical piece
 * without it, the browser won't send the httpOnly auth cookie cross-origin
 * and every protected route will error (401) even when logged in
 */

export async function apiRequest<T>(
    path: string,
    options: RequestOptions = {}
): Promise<T> {
    const res = await fetch(`${API_BASE_URL}${path}`, {
        method: options.method || "GET",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: options.body ? JSON.stringify(options.body) : undefined,
    });

    let data: any = null;
    try {
        data = await res.json();
    } catch {
        //No JSON body, handled below
    }

    if (!res.ok) {
        //Our controllers return either {error: message } or
        //error: { field: [messages]}} from zod validation feature
        const isFieldErrors = data?.error && typeof data.error === "object";
        throw new ApiError(
            isFieldErrors ? "Please check the highlighted fields" : data?.error || "Something went wrong",
            res.status,
            isFieldErrors ? data.error : undefined
        );
    }

    return data as T;
}