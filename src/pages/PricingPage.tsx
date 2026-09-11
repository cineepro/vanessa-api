// src/pages/PricingPage.tsx — Vanessa API Platform
import { Link } from 'react-router-dom';
import { TopNav } from '@/components/layout/TopNav';
import { useAuth } from '@/features/auth/hooks/useAuth';

export default function PricingPage() {
    const { isAuthenticated } = useAuth();

    return (
        <div className="min-h-screen bg-gray-50">
            <TopNav />
            <div className="max-w-2xl mx-auto px-4 py-16 text-center">
                <h1 className="text-3xl font-bold text-gray-800">Tarifs</h1>
                <p className="text-gray-500 mt-3">
                    Pas d'abonnement forcé : tu proposes un montant pour un volume de tokens, on valide ensemble.
                </p>

                <div className="bg-white rounded-3xl border border-gray-100 p-8 mt-8 text-left space-y-4">
                    <Step n={1} text="Depuis ta console, indique le montant que tu proposes et le nombre de tokens souhaités." />
                    <Step n={2} text="On te recontacte sur WhatsApp ou par email pour confirmer les modalités de paiement." />
                    <Step n={3} text="Une fois le paiement confirmé de notre côté, ta clé est activée et affichée une seule fois." />
                    <Step n={4} text="Tu peux recharger à tout moment, même avant épuisement — le quota s'additionne au restant." />
                </div>

                <p className="text-xs text-gray-400 mt-6">
                    Partenaire (média, association, institution) ? Certains volumes peuvent être offerts dans le cadre
                    d'un partenariat — contacte-nous directement.
                </p>

                <Link
                    to={isAuthenticated ? '/console' : '/inscription'}
                    className="inline-block mt-6 bg-brand text-white font-semibold px-6 py-3 rounded-xl hover:bg-brand-dark transition-colors"
                >
                    Faire une demande
                </Link>
            </div>
        </div>
    );
}

function Step({ n, text }: { n: number; text: string }) {
    return (
        <div className="flex items-start gap-3">
            <span className="shrink-0 w-6 h-6 rounded-full bg-brand/10 text-brand text-xs font-bold flex items-center justify-center">{n}</span>
            <p className="text-sm text-gray-600">{text}</p>
        </div>
    );
}
