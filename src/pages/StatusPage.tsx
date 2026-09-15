// src/pages/StatusPage.tsx — Vanessa API Platform
import { useState, useEffect, useCallback } from 'react';
import { TopNav } from '@/components/layout/TopNav';
import { VANESSA_API_URL } from '@/api/constants';

interface HealthResponse {
    status: 'ok' | 'degraded';
    database: 'ok' | 'unreachable';
    anthropic: 'configured' | 'missing';
    timestamp: string;
}

export default function StatusPage() {
    const [health, setHealth] = useState<HealthResponse | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [lastChecked, setLastChecked] = useState<Date | null>(null);

    const check = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const base = VANESSA_API_URL || 'https://api.kinemaplus.com';
            const response = await fetch(`${base}/v1/health`);
            const data = await response.json();
            setHealth(data);
        } catch {
            setError('Impossible de joindre le service.');
            setHealth(null);
        } finally {
            setLastChecked(new Date());
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        check();
        // Revérifie automatiquement toutes les 60 secondes, mais
        // SEULEMENT tant que l'onglet est réellement visible — inutile de
        // continuer à interroger le service si la personne a changé
        // d'onglet ou mis son écran en veille, ça ne fait que gonfler le
        // nombre d'exécutions pour rien.
        let interval: ReturnType<typeof setInterval> | null = null;

        const startPolling = () => {
            if (interval) return;
            check();
            interval = setInterval(check, 60_000);
        };
        const stopPolling = () => {
            if (interval) clearInterval(interval);
            interval = null;
        };

        const handleVisibilityChange = () => {
            if (document.visibilityState === 'visible') startPolling();
            else stopPolling();
        };

        if (document.visibilityState === 'visible') startPolling();
        document.addEventListener('visibilitychange', handleVisibilityChange);

        return () => {
            stopPolling();
            document.removeEventListener('visibilitychange', handleVisibilityChange);
        };
    }, [check]);

    const isUp = health?.status === 'ok';
    const isDown = !!error || health?.status === 'degraded';

    return (
        <div className="min-h-screen bg-gray-50">
            <TopNav />
            <div className="max-w-xl mx-auto px-4 py-16">
                <div className="text-center mb-8">
                    <h1 className="text-2xl font-bold text-gray-800">Statut de Vanessa API</h1>
                    <p className="text-sm text-gray-400 mt-1">Vérification en direct, toutes les 60 secondes.</p>
                </div>

                <div className={`rounded-3xl border p-6 text-center ${
                    loading ? 'bg-gray-50 border-gray-200' : isUp ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'
                }`}>
                    <div className="flex items-center justify-center gap-3 mb-2">
                        <span className={`w-3 h-3 rounded-full ${loading ? 'bg-gray-300' : isUp ? 'bg-green-500' : 'bg-red-500'}`} />
                        <p className="text-lg font-bold text-gray-800">
                            {loading ? 'Vérification...' : isUp ? 'Tout fonctionne' : isDown ? 'Problème détecté' : 'Statut inconnu'}
                        </p>
                    </div>
                    {lastChecked && (
                        <p className="text-xs text-gray-400">
                            Dernière vérification : {lastChecked.toLocaleTimeString('fr-FR')}
                        </p>
                    )}
                </div>

                {health && (
                    <div className="mt-4 bg-white rounded-2xl border border-gray-100 divide-y divide-gray-50">
                        <StatusRow label="Base de données" ok={health.database === 'ok'} />
                        <StatusRow label="Service IA" ok={health.anthropic === 'configured'} />
                    </div>
                )}

                {error && (
                    <p className="text-sm text-red-500 text-center mt-4">{error}</p>
                )}

                <p className="text-xs text-gray-400 text-center mt-8">
                    Un problème persistant ? Contacte-nous depuis ta{' '}
                    <a href="/console" className="text-brand hover:underline">console développeur</a>.
                </p>
            </div>
        </div>
    );
}

function StatusRow({ label, ok }: { label: string; ok: boolean }) {
    return (
        <div className="flex items-center justify-between px-5 py-3">
            <span className="text-sm text-gray-600">{label}</span>
            <span className={`text-xs font-semibold ${ok ? 'text-green-600' : 'text-red-500'}`}>
                {ok ? '● Opérationnel' : '● Indisponible'}
            </span>
        </div>
    );
}