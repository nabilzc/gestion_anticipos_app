"use server";

import { createClient } from "@supabase/supabase-js";

const LOCAL_DEV_EMAIL = "cskevint@gmail.com";
const LOCAL_DEV_PASSWORD = "LocalDev123!";

type EnsureLocalDevUserResult = {
    success: true;
    user: {
        id: string;
        email?: string;
        user_metadata: {
            full_name?: string;
            avatar_url?: string;
        };
    };
} | {
    success: false;
    error: string;
};

export async function ensureLocalDevUser(): Promise<EnsureLocalDevUserResult> {
    if (process.env.NODE_ENV === "production") {
        return { success: false, error: "Local dev bypass is disabled in production." };
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceRoleKey) {
        return {
            success: false,
            error: "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in the local environment.",
        };
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
        auth: {
            autoRefreshToken: false,
            persistSession: false,
        },
    });

    const { data: usersData, error: listError } = await adminClient.auth.admin.listUsers();
    if (listError) {
        return { success: false, error: listError.message };
    }

    let authUser = usersData.users.find((candidate) => candidate.email === LOCAL_DEV_EMAIL) ?? null;

    if (!authUser) {
        const { data: createdUser, error: createError } = await adminClient.auth.admin.createUser({
            email: LOCAL_DEV_EMAIL,
            password: LOCAL_DEV_PASSWORD,
            email_confirm: true,
            user_metadata: {
                full_name: "Local Dev User",
            },
        });

        if (createError || !createdUser.user) {
            return { success: false, error: createError?.message ?? "Could not create the local dev user." };
        }

        authUser = createdUser.user;
    }

    const { error: profileError } = await adminClient
        .from("profiles")
        .upsert({
            id: authUser.id,
            email: authUser.email ?? LOCAL_DEV_EMAIL,
            full_name: authUser.user_metadata.full_name ?? "Local Dev User",
            rol: "usuario",
            role: "Solicitante",
        });

    if (profileError) {
        return { success: false, error: profileError.message };
    }

    return {
        success: true,
        user: {
            id: authUser.id,
            email: authUser.email,
            user_metadata: {
                full_name: authUser.user_metadata.full_name,
                avatar_url: authUser.user_metadata.avatar_url,
            },
        },
    };
}