// src/features/apiKeys/components/RequestKeyModal.tsx — Vanessa API Platform
import { useState } from 'react';
import { apiKeyService, type ApiKey } from '../services/apiKeyService';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

interface Props {
    mode: 'new' | 'recharge';
    existingKey?: ApiKey; // requis si mode === 'recharge'
    onClose: () => void;
    onDone: () => void;
}

export const RequestKeyModal = ({ mode, existingKey, onClose, onDone }: Props) => {
    const [keyName, setKeyName] = useState('');
    const [contactPhone, setContactPhone] = useState('');
    const [contactEmail, setContactEmail] = useState('');
    const [amount, setAmount] = useState('');
    const [tokensRequested, setTokensRequested] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [done, setDone] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        const amountNum = parseInt(amount, 10);
        const tokensNum = parseInt(tokensRequested, 10);
        if (!contactPhone.trim() || !contactEmail.trim()) {
            setError('Un numéro WhatsApp et un email sont obligatoires — on s\'en sert pour te recontacter et valider le paiement.');
            return;
        }
        if (!amountNum || amountNum <= 0 || !tokensNum || tokensNum <= 0) {
            setError('Indique un montant et un nombre de tokens valides.');
            return;
        }

        setLoading(true);
        try {
            if (mode === 'recharge' && existingKey) {
                await apiKeyService.requestRecharge({
                    keyId: existingKey.$id, contactPhone, contactEmail, amount: amountNum, tokensRequested: tokensNum,
                });
            } else {
                await apiKeyService.requestKey({
                    keyName: keyName.trim() || 'Ma clé', contactPhone, contactEmail, amount: amountNum, tokensRequested: tokensNum,
                });
            }
            setDone(true);
        } catch (err: any) {
            setError(err.message || 'La demande a échoué, réessaie.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-4">
            <div className="bg-white rounded-3xl p-6 w-full max-w-md space-y-4 max-h-[90vh] overflow-y-auto">
                {done ? (
                    <div className="text-center space-y-3 py-4">
                        <div className="text-4xl">✅</div>
                        <p className="text-sm text-gray-600">
                            Demande envoyée ! On te recontacte sur WhatsApp ou par email pour confirmer le paiement
                            {mode === 'new' ? ' — ta clé apparaîtra ici une fois validée.' : ' — ton quota sera ajouté au restant dès validation.'}
                        </p>
                        <Button onClick={onDone} className="w-full">Fermer</Button>
                    </div>
                ) : (
                    <>
                        <div>
                            <h2 className="text-lg font-bold text-gray-800">
                                {mode === 'recharge' ? `Recharger "${existingKey?.name}"` : 'Demander une nouvelle clé'}
                            </h2>
                            <p className="text-xs text-gray-400 mt-1">
                                Aucun paiement en ligne pour l'instant : indique ta proposition, on te recontacte pour la confirmer.
                            </p>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-3">
                            {mode === 'new' && (
                                <Input label="Nom de la clé" value={keyName} onChange={(e) => setKeyName(e.target.value)} placeholder="Ex: Mon site, Mon bot Discord..." />
                            )}
                            <Input label="Numéro WhatsApp" value={contactPhone} onChange={(e) => setContactPhone(e.target.value)} required placeholder="+229 ..." />
                            <Input label="Email de contact" type="email" value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} required placeholder="ton@email.com" />
                            <Input label="Montant proposé (FCFA)" type="number" min={1} value={amount} onChange={(e) => setAmount(e.target.value)} required placeholder="Ex: 5000" />
                            <Input label="Nombre de tokens souhaités" type="number" min={1} value={tokensRequested} onChange={(e) => setTokensRequested(e.target.value)} required placeholder="Ex: 1000000" />

                            {error && (
                                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-2xl text-sm">
                                    ❌ {error}
                                </div>
                            )}

                            <div className="flex gap-2 pt-2">
                                <Button type="submit" isLoading={loading} className="flex-1">Envoyer la demande</Button>
                                <Button type="button" variant="secondary" onClick={onClose}>Annuler</Button>
                            </div>
                        </form>
                    </>
                )}
            </div>
        </div>
    );
};
