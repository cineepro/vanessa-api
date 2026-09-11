// src/router/ModeratorRoute.tsx — Vanessa API Platform
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { AppLayout } from '@/components/layout/AppLayout';

export const ModeratorRoute = ({ children }: { children: React.ReactNode }) => {
    const { isAuthenticated, profile, loading } = useAuth();

    if (loading) return null;
    if (!isAuthenticated) return <Navigate to="/connexion" replace />;
    if (!profile?.isModerator) return <Navigate to="/console" replace />;

    return <AppLayout>{children}</AppLayout>;
};
