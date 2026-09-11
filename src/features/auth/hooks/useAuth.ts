// src/features/auth/hooks/useAuth.ts — Vanessa API Platform
import { useEffect } from 'react';
import { useAuthStore } from '@/store/authStore';
import { authService } from '../services/authService';

let checked = false;

export const useAuth = () => {
    const { user, profile, isAuthenticated, loading, setUser, setProfile, setLoading, logout: clearStore } = useAuthStore();

    useEffect(() => {
        if (checked) return;
        checked = true;
        (async () => {
            try {
                const current = await authService.getCurrentUser();
                setUser(current);
                try {
                    const p = await authService.getCurrentUserProfile(current.$id);
                    setProfile(p);
                } catch { /* profil pas encore créé */ }
            } catch {
                setUser(null);
            } finally {
                setLoading(false);
            }
        })();
    }, [setUser, setProfile, setLoading]);

    const logout = async () => {
        await authService.logout();
        clearStore();
    };

    return { user, profile, isAuthenticated, loading, logout };
};
