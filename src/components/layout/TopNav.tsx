// src/components/layout/TopNav.tsx — Vanessa API Platform
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '@/features/auth/hooks/useAuth';

export const TopNav = () => {
    const { isAuthenticated, profile, logout } = useAuth();
    const location = useLocation();

    const linkClass = (path: string) =>
        `text-sm font-medium transition-colors ${
            location.pathname.startsWith(path) ? 'text-brand' : 'text-gray-500 hover:text-gray-800'
        }`;

    return (
        <nav className="bg-white border-b border-gray-100 sticky top-0 z-20">
            <div className="max-w-6xl mx-auto px-4 py-3 flex items-center gap-6">
                <Link to="/" className="flex items-center gap-2 shrink-0">
                    <span className="text-lg font-bold text-brand">🔮 Vanessa API</span>
                </Link>

                <div className="flex items-center gap-5 flex-1">
                    <Link to="/documentation" className={linkClass('/documentation')}>Documentation</Link>
                    <Link to="/tarifs" className={linkClass('/tarifs')}>Tarifs</Link>
                    {isAuthenticated && <Link to="/console" className={linkClass('/console')}>Console</Link>}
                    {isAuthenticated && profile?.isModerator && (
                        <Link to="/admin" className={linkClass('/admin')}>Administration</Link>
                    )}
                </div>

                {isAuthenticated ? (
                    <div className="flex items-center gap-3 shrink-0">
                        <span className="text-sm text-gray-500 hidden sm:inline">{profile?.name}</span>
                        <button onClick={logout} className="text-sm text-gray-400 hover:text-gray-700">
                            Déconnexion
                        </button>
                    </div>
                ) : (
                    <div className="flex items-center gap-3 shrink-0">
                        <Link to="/connexion" className="text-sm font-medium text-gray-600 hover:text-gray-800">Connexion</Link>
                        <Link to="/inscription" className="bg-brand text-white text-sm font-semibold px-4 py-2 rounded-xl hover:bg-brand-dark transition-colors">
                            Obtenir une clé
                        </Link>
                    </div>
                )}
            </div>
        </nav>
    );
};
