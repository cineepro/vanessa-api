// src/router/AppRouter.tsx — Vanessa API Platform
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { ProtectedRoute } from './ProtectedRoute';
import { ModeratorRoute } from './ModeratorRoute';

import LandingPage from '@/pages/LandingPage';
import PricingPage from '@/pages/PricingPage';
import DocumentationPage from '@/pages/DocumentationPage';
import StatusPage from '@/pages/StatusPage';
import LoginPage from '@/pages/LoginPage';
import RegisterPage from '@/pages/RegisterPage';
import EmailConfirmedPage from '@/pages/EmailConfirmedPage';
import ConsolePage from '@/pages/ConsolePage';
import AdminPage from '@/pages/AdminPage';
import NotFoundPage from '@/pages/NotFoundPage';

export const AppRouter = () => {
    return (
        <BrowserRouter>
            <Routes>
                <Route path="/" element={<LandingPage />} />
                <Route path="/tarifs" element={<PricingPage />} />
                <Route path="/documentation" element={<DocumentationPage />} />
                <Route path="/statut" element={<StatusPage />} />
                <Route path="/connexion" element={<LoginPage />} />
                <Route path="/inscription" element={<RegisterPage />} />
                <Route path="/email-confirmed" element={<EmailConfirmedPage />} />

                <Route
                    path="/console"
                    element={
                        <ProtectedRoute>
                            <ConsolePage />
                        </ProtectedRoute>
                    }
                />
                <Route
                    path="/admin"
                    element={
                        <ModeratorRoute>
                            <AdminPage />
                        </ModeratorRoute>
                    }
                />

                <Route path="*" element={<NotFoundPage />} />
            </Routes>
        </BrowserRouter>
    );
};