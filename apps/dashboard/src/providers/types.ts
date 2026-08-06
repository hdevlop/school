// -----------------------------
// Types & Interfaces
// -----------------------------
export interface User {
    id: string;
    name: string;
    email: string;
    role: string;
    image: string;
    status: string
}

export type Status = "default" | "error" | "success";

export type Tokens = {
    accessToken: string;
    accessTokenExpiresAt: string;
    refreshTokenExpiresAt: string;
}

export interface AuthContextProps {
    user: User | null;
    status: Status | null;
    message: string;
    accessToken: string | null;
    accessTokenExpiresAt: number | null;
    refreshTokenExpiresAt: number | null;
    isAuthenticated: boolean;
    isLoading: boolean;

    setUser: (user: User | null) => void;
    setStatus: (status: Status) => void;
    setMessage: (message: string) => void;
    setAccessToken: (token: string) => void;
    setAccessTokenExpiresAt: (time: string) => void;
    setRefreshTokenExpiresAt: (time: string) => void;
    setIsAuthenticated: (state: boolean) => void;
    setIsLoading: (loading: boolean) => void;

    setTokens: (tokens: Tokens) => void;
    resetAuth: () => void;
    updateAuth: (authState) => void;
    getAccessToken: () => void;
    isRefreshTokenValid: () => boolean;
    // Loader state
    // queryLoading: boolean;
}

