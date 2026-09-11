// src/pages/EmailConfirmedPage.tsx — Vanessa API Platform
import { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { account } from '@/api/appwrite';

export default function EmailConfirmedPage() {
    const [searchParams] = useSearchParams();
    const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');

    useEffect(() => {
        const userId = searchParams.get('userId');
        const secret = searchParams.get('secret');
        if (!userId || !secret) {
            setStatus('error');
            return;
        }
        account.updateVerification(userId, secret)
            .then(() => setStatus('success'))
            .catch(() => setStatus('error'));
    }, [searchParams]);

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
            <div className="w-full max-w-sm bg-white rounded-3xl p-8 text-center space-y-4">
                {status === 'loading' && <p className="text-sm text-gray-400">Vérification en cours...</p>}
                {status === 'success' && (
                    <>
                        <div className="text-4xl">✅</div>
                        <p className="text-sm text-gray-700">Email confirmé ! Tu peux maintenant te connecter.</p>
                    </>
                )}
                {status === 'error' && (
                    <>
                        <div className="text-4xl">⚠️</div>
                        <p className="text-sm text-gray-700">Lien invalide ou expiré.</p>
                    </>
                )}
                <Link to="/connexion" className="text-brand font-semibold hover:underline text-sm">
                    Aller à la connexion
                </Link>
            </div>
        </div>
    );
}
