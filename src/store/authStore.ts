// src/store/authStore.ts — Vanessa API Platform
import { create } from 'zustand';
import type { Models } from 'appwrite';

interface AuthState {
    user: Models.User<Models.Preferences> | null;
    profile: any | null;
    isAuthenticated: boolean;
    loading: boolean;
    setUser: (user: Models.User<Models.Preferences> | null) => void;
    setProfile: (profile: any | null) => void;
    setLoading: (loading: boolean) => void;
    logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
    user: null,
    profile: null,
    isAuthenticated: false,
    loading: true,
    setUser: (user) => set({ user, isAuthenticated: !!user && !!user.emailVerification }),
    setProfile: (profile) => set({ profile }),
    setLoading: (loading) => set({ loading }),
    logout: () => set({ user: null, profile: null, isAuthenticated: false }),
}));
