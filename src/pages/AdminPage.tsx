// src/pages/AdminPage.tsx — Vanessa API Platform
import { useState, useEffect } from 'react';
import { adminApiKeyService, type AdminRequest } from '@/features/admin/services/adminApiKeyService';
import { RequestRow } from '@/features/admin/components/RequestRow';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export default function AdminPage() {
    const [requests, setRequests] = useState<AdminRequest[]>([]);
    const [stats, setStats] = useState<{ pendingRequests: number; activeKeys: number; totalCalls: number; tokensLast100Calls: number } | null>(null);
    const [loading, setLoading] = useState(true);

    const [partnerUserId, setPartnerUserId] = useState('');
    const [partnerKeyName, setPartnerKeyName] = useState('');
    const [partnerTokens, setPartnerTokens] = useState('');
    const [creatingPartner, setCreatingPartner] = useState(false);
    const [partnerRevealedKey, setPartnerRevealedKey] = useState<string | null>(null);

    const load = async () => {
        setLoading(true);
        try {
            const [r, s] = await Promise.all([
                adminApiKeyService.listRequests('pending'),
                adminApiKeyService.stats(),
            ]);
            setRequests(r);
            setStats(s);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        load();
    }, []);

    const handleCreatePartner = async (e: React.FormEvent) => {
        e.preventDefault();
        const tokens = parseInt(partnerTokens, 10);
        if (!partnerUserId.trim() || !tokens) return;
        setCreatingPartner(true);
        try {
            const result = await adminApiKeyService.createPartnerKey(partnerUserId.trim(), partnerKeyName.trim() || 'Clé partenaire', tokens);
            setPartnerRevealedKey(result.apiKey);
            setPartnerUserId('');
            setPartnerKeyName('');
            setPartnerTokens('');
            load();
        } finally {
            setCreatingPartner(false);
        }
    };

    return (
        <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
            <h1 className="text-2xl font-bold text-gray-800">Administration — Vanessa API</h1>

            {stats && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <StatCard label="Demandes en attente" value={stats.pendingRequests} />
                    <StatCard label="Clés actives" value={stats.activeKeys} />
                    <StatCard label="Appels (100 derniers)" value={stats.totalCalls} />
                    <StatCard label="Tokens (100 derniers appels)" value={stats.tokensLast100Calls.toLocaleString('fr-FR')} />
                </div>
            )}

            <div>
                <h2 className="text-base font-bold text-gray-800 mb-3">Demandes en attente</h2>
                {loading ? (
                    <p className="text-sm text-gray-400">Chargement...</p>
                ) : requests.length === 0 ? (
                    <p className="text-sm text-gray-400">Aucune demande en attente.</p>
                ) : (
                    <div className="space-y-3">
                        {requests.map((r) => (
                            <RequestRow key={r.$id} request={r} onProcessed={load} />
                        ))}
                    </div>
                )}
            </div>

            <div className="bg-white rounded-2xl border-2 border-indigo-100 p-5 space-y-3">
                <div>
                    <h2 className="text-base font-bold text-gray-800">🤝 Créer une clé partenaire</h2>
                    <p className="text-xs text-gray-400 mt-1">
                        Quota offert dans le cadre d'un partenariat (ex: Madame Actu). Même mécanique de quota que les
                        clés payantes — à épuisement, le partenaire pourra demander une recharge payante normalement.
                    </p>
                </div>

                {partnerRevealedKey ? (
                    <div className="bg-green-50 border border-green-200 rounded-xl p-4 space-y-2">
                        <p className="text-sm font-bold text-green-800">✅ Clé partenaire générée — transmets-la maintenant :</p>
                        <div className="bg-white border border-green-200 rounded-xl p-3 font-mono text-xs break-all">
                            {partnerRevealedKey}
                        </div>
                        <Button size="sm" onClick={() => setPartnerRevealedKey(null)}>Fermer</Button>
                    </div>
                ) : (
                    <form onSubmit={handleCreatePartner} className="space-y-3">
                        <Input
                            label="ID utilisateur du partenaire (Appwrite $id, même compte que Ça Parle)"
                            value={partnerUserId}
                            onChange={(e) => setPartnerUserId(e.target.value)}
                            required
                            placeholder="Le partenaire doit déjà avoir un compte"
                        />
                        <Input label="Nom de la clé" value={partnerKeyName} onChange={(e) => setPartnerKeyName(e.target.value)} placeholder="Ex: Madame Actu — Widget site" />
                        <Input label="Tokens offerts" type="number" min={1} value={partnerTokens} onChange={(e) => setPartnerTokens(e.target.value)} required />
                        <Button type="submit" isLoading={creatingPartner}>Générer la clé partenaire</Button>
                    </form>
                )}
            </div>
        </div>
    );
}

function StatCard({ label, value }: { label: string; value: string | number }) {
    return (
        <div className="bg-white rounded-2xl border border-gray-100 p-4">
            <p className="text-2xl font-bold text-gray-800">{value}</p>
            <p className="text-xs text-gray-400 mt-1">{label}</p>
        </div>
    );
}
