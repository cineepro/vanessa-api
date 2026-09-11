// src/features/auth/components/LoginForm.tsx — Vanessa API Platform
import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { authService } from '../services/authService';
import { useAuthStore } from '@/store/authStore';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

export const LoginForm = () => {
    const navigate = useNavigate();
    const { setUser, setProfile } = useAuthStore();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        try {
            const user = await authService.login(email, password);
            setUser(user);
            try {
                const profile = await authService.getCurrentUserProfile(user.$id);
                setProfile(profile);
            } catch { /* profil pas encore créé */ }
            navigate('/console');
        } catch (err: any) {
            setError(err.message || 'Connexion impossible.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-5">
            <Input label="Adresse email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="ton@email.com" />
            <Input label="Mot de passe" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required placeholder="••••••••" />

            {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-2xl text-sm">
                    ❌ {error}
                </div>
            )}

            <Button type="submit" size="lg" className="w-full" isLoading={loading}>
                Se connecter
            </Button>

            <p className="text-center text-sm text-gray-500">
                Pas encore de compte ?{' '}
                <Link to="/inscription" className="text-brand font-semibold hover:underline">Crée-en un</Link>
            </p>
            <p className="text-center text-xs text-gray-400">
                Le même compte fonctionne aussi sur Ça Parle (kinemaplus.com).
            </p>
        </form>
    );
};
