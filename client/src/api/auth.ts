import { apiRequest } from "./client";
import type { User } from "../types/auth";

export function signup(email: string, password: string) {
    return apiRequest<{ user: User }>("/api/auth/signup", {
        method: "POST",
        body: { email, password },
    });
}

export function login(email: string, password: string) {
    return apiRequest<{ user: User }>("api/auth/login", {
        method: "POST",
        body: { email, password },
    });
}

export function logout() {
    return apiRequest<{ message: string }>("/api/auth/logout", {
        method: "POST",
    });
}

export function getMe() {
    return apiRequest<{ user: User }>("api/auth/me");
}