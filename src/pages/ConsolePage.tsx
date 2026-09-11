// src/pages/ConsolePage.tsx — Vanessa API Platform
import { useState } from 'react';
import { useApiKeys } from '@/features/apiKeys/hooks/useApiKeys';
import { ApiKeyCard } from '@/features/apiKeys/components/ApiKeyCard';
import { RequestKeyModal } from '@/features/apiKeys/components/RequestKeyModal';
import type { ApiKey } from '@/features/apiKeys/services/apiKeyService';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';

export default function ConsolePage() {
    const { keys, requests, loading, error, refresh } = useApiKeys();
    const [modalMode, setModalMode] = useState<'new' | 'recharge' | null>(null);
    const [rechargeTarget, setRechargeTarget] = useState<ApiKey | undefined>(undefined);

    const openRecharge = (key: ApiKey) => {
        setRechargeTarget(key);
        setModalMode('recharge');
    };

    const closeModal = () => {
        setModalMode(null);
        setRechargeTarget(undefined);
    };

    const handleDone = () => {
        closeModal();
        refresh();
    };

    const pendingRequests = requests.filter((r) => r.status === 'pending');

    return (
        <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800">Console développeur</h1>
                    <p className="text-sm text-gray-400 mt-1">Gère tes clés Vanessa API et suis leur consommation.</p>
                </div>
                <Button onClick={() => setModalMode('new')}>+ Nouvelle clé</Button>
            </div>

            {pendingRequests.length > 0 && (
                <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 space-y-2">
                    <p className="text-sm font-semibold text-amber-800">
                        {pendingRequests.length} demande{pendingRequests.length > 1 ? 's' : ''} en attente de validation
                    </p>
                    {pendingRequests.map((r) => (
                        <p key={r.$id} className="text-xs text-amber-700">
                            • {r.type === 'recharge' ? 'Recharge' : 'Nouvelle clé'} — {r.tokensRequested.toLocaleString('fr-FR')} tokens pour {r.amount.toLocaleString('fr-FR')} FCFA
                        </p>
                    ))}
                </div>
            )}

            {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-2xl text-sm">❌ {error}</div>
            )}

            {loading ? (
                <p className="text-sm text-gray-400 text-center py-10">Chargement...</p>
            ) : keys.length === 0 ? (
                <div className="bg-white rounded-2xl border border-gray-100 p-10 text-center space-y-3">
                    <div className="text-3xl">🔑</div>
                    <p className="text-sm text-gray-500">Tu n'as pas encore de clé active.</p>
                    <Button onClick={() => setModalMode('new')}>Demander ma première clé</Button>
                </div>
            ) : (
                <div className="grid sm:grid-cols-2 gap-4">
                    {keys.map((k) => (
                        <ApiKeyCard key={k.$id} apiKey={k} onRequestRecharge={openRecharge} onRevoked={refresh} />
                    ))}
                </div>
            )}

            <div className="bg-white rounded-2xl border border-gray-100 p-5">
                <p className="text-sm text-gray-600">
                    Besoin d'aide pour intégrer l'API ? Consulte la{' '}
                    <Link to="/documentation" className="text-brand font-semibold hover:underline">documentation</Link>.
                </p>
            </div>

            {modalMode && (
                <RequestKeyModal
                    mode={modalMode}
                    existingKey={rechargeTarget}
                    onClose={closeModal}
                    onDone={handleDone}
                />
            )}
        </div>
    );
}
