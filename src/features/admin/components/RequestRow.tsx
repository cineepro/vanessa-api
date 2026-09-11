// src/features/admin/components/RequestRow.tsx — Vanessa API Platform
import { useState } from 'react';
import { adminApiKeyService, type AdminRequest } from '../services/adminApiKeyService';
import { Button } from '@/components/ui/button';

interface Props {
    request: AdminRequest;
    onProcessed: () => void;
}

export const RequestRow = ({ request, onProcessed }: Props) => {
    const [tokensGranted, setTokensGranted] = useState(String(request.tokensRequested));
    const [note, setNote] = useState('');
    const [loading, setLoading] = useState(false);
    const [revealedKey, setRevealedKey] = useState<string | null>(null);
    const [copied, setCopied] = useState(false);

    const handleApprove = async () => {
        setLoading(true);
        try {
            const result = await adminApiKeyService.approveRequest(request.$id, parseInt(tokensGranted, 10), note);
            if (result.apiKey) {
                setRevealedKey(result.apiKey);
            } else {
                onProcessed();
            }
        } finally {
            setLoading(false);
        }
    };

    const handleReject = async () => {
        if (!confirm('Rejeter cette demande ?')) return;
        setLoading(true);
        try {
            await adminApiKeyService.rejectRequest(request.$id, note);
            onProcessed();
        } finally {
            setLoading(false);
        }
    };

    const copyKey = () => {
        if (!revealedKey) return;
        navigator.clipboard.writeText(revealedKey);
        setCopied(true);
    };

    if (revealedKey) {
        return (
            <div className="bg-green-50 border-2 border-green-200 rounded-2xl p-4 space-y-3">
                <p className="text-sm font-bold text-green-800">
                    ✅ Clé générée — transmets-la MAINTENANT à {request.userName}, elle ne sera plus jamais réaffichée.
                </p>
                <div className="bg-white border border-green-200 rounded-xl p-3 font-mono text-xs break-all">
                    {revealedKey}
                </div>
                <p className="text-xs text-gray-500">
                    Contact : {request.contactPhone} — {request.contactEmail}
                </p>
                <div className="flex gap-2">
                    <Button size="sm" onClick={copyKey}>{copied ? 'Copié ✓' : 'Copier la clé'}</Button>
                    <Button size="sm" variant="secondary" onClick={onProcessed}>J'ai transmis, fermer</Button>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-white border border-gray-100 rounded-2xl p-4 space-y-3">
            <div className="flex items-start justify-between">
                <div>
                    <p className="font-semibold text-gray-800">
                        {request.userName} — {request.type === 'recharge' ? 'Recharge' : 'Nouvelle clé'}
                        {request.keyName && request.type === 'new' && ` "${request.keyName}"`}
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5">
                        {request.tokensRequested.toLocaleString('fr-FR')} tokens demandés pour {request.amount.toLocaleString('fr-FR')} FCFA
                    </p>
                </div>
                <span className="text-xs text-gray-400">{new Date(request.createdAt).toLocaleDateString('fr-FR')}</span>
            </div>

            <div className="bg-gray-50 rounded-xl p-3 text-xs text-gray-600 space-y-1">
                <p>📱 WhatsApp : <span className="font-medium">{request.contactPhone}</span></p>
                <p>📧 Email : <span className="font-medium">{request.contactEmail}</span></p>
            </div>

            <div className="flex gap-2 items-end">
                <div className="flex-1">
                    <label className="block text-xs text-gray-500 mb-1">Tokens à accorder (ajustable)</label>
                    <input
                        type="number"
                        value={tokensGranted}
                        onChange={(e) => setTokensGranted(e.target.value)}
                        className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand/40"
                    />
                </div>
            </div>
            <input
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Note interne (optionnel)"
                className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand/40"
            />

            <div className="flex gap-2">
                <Button size="sm" onClick={handleApprove} isLoading={loading}>
                    ✅ Paiement reçu — Approuver
                </Button>
                <Button size="sm" variant="ghost" onClick={handleReject} disabled={loading}>
                    Rejeter
                </Button>
            </div>
        </div>
    );
};
