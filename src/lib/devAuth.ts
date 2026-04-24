const DEV_AUTH_STORAGE_KEY = "dev-auth-user";

export type AppUser = {
    id: string;
    email?: string;
    user_metadata: {
        full_name?: string;
        avatar_url?: string;
    };
};

const isLocalhost = () => {
    if (typeof window === "undefined") {
        return false;
    }

    return window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1";
};

export const isDevAuthBypassEnabled = () => {
    return process.env.NODE_ENV !== "production" && isLocalhost();
};

export const getDevAuthUser = (): AppUser | null => {
    if (!isDevAuthBypassEnabled()) {
        return null;
    }

    const rawUser = window.localStorage.getItem(DEV_AUTH_STORAGE_KEY);
    if (!rawUser) {
        return null;
    }

    try {
        return JSON.parse(rawUser) as AppUser;
    } catch {
        window.localStorage.removeItem(DEV_AUTH_STORAGE_KEY);
        return null;
    }
};

export const setDevAuthUser = (overrides?: Partial<AppUser>) => {
    if (!isDevAuthBypassEnabled()) {
        return null;
    }

    const user: AppUser = {
        id: overrides?.id ?? "00000000-0000-0000-0000-000000000001",
        email: overrides?.email ?? "cskevint@gmail.com",
        user_metadata: {
            full_name: overrides?.user_metadata?.full_name ?? "Local Dev User",
            avatar_url: overrides?.user_metadata?.avatar_url,
        },
    };

    window.localStorage.setItem(DEV_AUTH_STORAGE_KEY, JSON.stringify(user));
    return user;
};

export const clearDevAuthUser = () => {
    if (typeof window === "undefined") {
        return;
    }

    window.localStorage.removeItem(DEV_AUTH_STORAGE_KEY);
};