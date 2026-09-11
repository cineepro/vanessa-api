// src/components/layout/AppLayout.tsx — Vanessa API Platform
import { TopNav } from './TopNav';

export const AppLayout = ({ children }: { children: React.ReactNode }) => {
    return (
        <div className="min-h-screen bg-gray-50">
            <TopNav />
            <main>{children}</main>
        </div>
    );
};
