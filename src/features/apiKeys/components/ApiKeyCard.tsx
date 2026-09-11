// src/features/apiKeys/components/ApiKeyCard.tsx — Ça Parle Dev / Vanessa API
import { useState } from 'react';
import type { ApiKey } from '../services/apiKeyService';
import { apiKeyService } from '../services/apiKeyService';
import { Button } from '@/components/ui/button';

const STATUS_LABEL: Record<ApiKey['status'], { label: string; color: string }> = {
    active: { label: 'Active', color: 'text-green-600 bg-green-50' },
    pending: { label: 'En attente de validation', color: 'text-amber-600 bg-amber-50' },
    suspended: { label: 'Suspendue', color: 'text-gray-500 bg-gray-100' },
    exhausted: { label: 'Quota épuisé', color: 'text-red-600 bg-red-50' },
};

interface Props {
    apiKey: ApiKey;
    onRequestRecharge: (key: ApiKey) => void;
    onRevoked: () => void;
}

export const ApiKeyCard = ({ apiKey, onRequestRecharge, onRevoked }: Props) => {
    const [revoking, setRevoking] = useState(false);
    const percentUsed = apiKey.tokensGranted > 0 ? Math.min(100, Math.round((apiKey.tokensUsed / apiKey.tokensGranted) * 100)) : 0;
    const status = STATUS_LABEL[apiKey.status];

    const handleRevoke = async () => {
        if (!confirm(`Révoquer définitivement la clé "${apiKey.name}" ? Cette action est irréversible.`)) return;
        setRevoking(true);
        try {
            await apiKeyService.revokeKey(apiKey.$id);
            onRevoked();
        } finally {
            setRevoking(false);
        }
    };

    return (
        <div className="bg-white rounded-2xl border border-gray-100 p-5 space-y-3">
            <div className="flex items-start justify-between">
                <div>
                    <p className="font-semibold text-gray-800">{apiKey.name}</p>
                    <p className="text-xs text-gray-400 font-mono mt-0.5">{apiKey.keyPrefix}</p>
                </div>
                <div className="flex items-center gap-2">
                    {apiKey.isPartner && (
                        <span className="text-xs font-semibold px-2 py-1 rounded-full bg-indigo-50 text-indigo-600">Partenaire</span>
                    )}
                    <span className={`text-xs font-semibold px-2 py-1 rounded-full ${status.color}`}>{status.label}</span>
                </div>
            </div>

            <div>
                <div className="flex justify-between text-xs text-gray-500 mb-1">
                    <span>{apiKey.tokensUsed.toLocaleString('fr-FR')} tokens utilisés</span>
                    <span>{apiKey.tokensGranted.toLocaleString('fr-FR')} tokens accordés</span>
                </div>
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div
                        className={`h-full rounded-full ${percentUsed > 90 ? 'bg-red-400' : percentUsed > 70 ? 'bg-amber-400' : 'bg-brand'}`}
                        style={{ width: `${percentUsed}%` }}
                    />
                </div>
                <p className="text-xs text-gray-400 mt-1">{apiKey.tokensRemaining.toLocaleString('fr-FR')} tokens restants</p>
            </div>

            <div className="flex gap-2 pt-1">
                <Button size="sm" variant="secondary" onClick={() => onRequestRecharge(apiKey)} disabled={apiKey.status === 'suspended'}>
                    Recharger
                </Button>
                {apiKey.status !== 'suspended' && (
                    <Button size="sm" variant="ghost" onClick={handleRevoke} isLoading={revoking}>
                        Révoquer
                    </Button>
                )}
            </div>
        </div>
    );
};
