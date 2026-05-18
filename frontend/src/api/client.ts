import axios from "axios";

const API_BASE_URL = import.meta.env.VITE_API_URL ?? "http://localhost:5000";

export const TOKEN_STORAGE_KEY = "clinic_token";

export function getToken(): string | null {
    return localStorage.getItem(TOKEN_STORAGE_KEY);
}

export function setToken(token: string): void {
    localStorage.setItem(TOKEN_STORAGE_KEY, token);
}

export function clearToken(): void {
    localStorage.removeItem(TOKEN_STORAGE_KEY);
}

export const api = axios.create({
    baseURL: API_BASE_URL,
    headers: {
        "Content-Type": "application/json"
    }
});

api.interceptors.request.use((config) => {
    const token = getToken();

    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
});

export interface ApiResponse<T> {
    success: boolean;
    data: T;
    message?: string;
}

export interface ApiListResponse<T> {
    success: boolean;
    data: T[];
    meta: {
        total: number;
        page: number;
        limit: number;
    };
}

export function getErrorMessage(error: unknown, fallback: string): string {
    if (
        error != null &&
        typeof error === "object" &&
        "response" in error &&
        error.response != null &&
        typeof error.response === "object" &&
        "data" in error.response &&
        error.response.data != null &&
        typeof error.response.data === "object" &&
        "message" in error.response.data &&
        typeof (error.response.data as { message?: unknown }).message === "string"
    ) {
        return (error.response.data as { message: string }).message;
    }
    return fallback;
}
