// src/features/auth/components/RegisterForm.tsx — Vanessa API Platform
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { authService } from '../services/authService';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

export const RegisterForm = () => {
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [done, setDone] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (password.length < 8) {
            setError('Le mot de passe doit contenir au moins 8 caractères.');
            return;
        }
        setLoading(true);
        setError(null);
        try {
            await authService.register(name, email, password);
            setDone(true);
        } catch (err: any) {
            setError(err.message || "Inscription impossible.");
        } finally {
            setLoading(false);
        }
    };

    if (done) {
        return (
            <div className="text-center space-y-4">
                <div className="text-4xl">📧</div>
                <p className="text-sm text-gray-600">
                    Compte créé ! Vérifie ta boîte mail pour confirmer ton adresse avant de te connecter.
                </p>
                <Link to="/connexion" className="text-brand font-semibold hover:underline text-sm">
                    Aller à la connexion
                </Link>
            </div>
        );
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-5">
            <Input label="Nom" value={name} onChange={(e) => setName(e.target.value)} required placeholder="Ton nom" />
            <Input label="Adresse email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="ton@email.com" />
            <Input label="Mot de passe" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={8} placeholder="Minimum 8 caractères" />

            {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-2xl text-sm">
                    ❌ {error}
                </div>
            )}

            <Button type="submit" size="lg" className="w-full" isLoading={loading}>
                Créer mon compte
            </Button>

            <p className="text-center text-sm text-gray-500">
                Déjà un compte (même celui de Ça Parle) ?{' '}
                <Link to="/connexion" className="text-brand font-semibold hover:underline">Connecte-toi</Link>
            </p>
        </form>
    );
};
