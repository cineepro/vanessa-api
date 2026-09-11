// src/pages/LandingPage.tsx — Vanessa API Platform
import { Link } from 'react-router-dom';
import { TopNav } from '@/components/layout/TopNav';
import { useAuth } from '@/features/auth/hooks/useAuth';

export default function LandingPage() {
    const { isAuthenticated } = useAuth();

    return (
        <div className="min-h-screen bg-gray-50">
            <TopNav />

            {/* Hero */}
            <section className="max-w-4xl mx-auto px-4 pt-20 pb-16 text-center">
                <span className="inline-block bg-indigo-50 text-brand text-xs font-semibold px-3 py-1.5 rounded-full mb-5">
                    🔮 Propulsé par Ça Parle
                </span>
                <h1 className="text-4xl sm:text-5xl font-bold text-gray-900 leading-tight">
                    Le langage des jeunes africains,<br />dans <span className="text-brand">votre</span> application
                </h1>
                <p className="text-gray-500 mt-5 max-w-xl mx-auto">
                    Vanessa API donne à vos sites, applications, bots et outils le ton, le style et les expressions de la
                    rue africaine — la même personnalité qui fait le succès de Ça Parle, exploitable partout où vous en
                    avez besoin.
                </p>
                <div className="flex items-center justify-center gap-3 mt-8">
                    <Link to={isAuthenticated ? '/console' : '/inscription'} className="bg-brand text-white font-semibold px-6 py-3 rounded-xl hover:bg-brand-dark transition-colors">
                        Obtenir une clé API
                    </Link>
                    <Link to="/documentation" className="bg-white text-gray-700 font-semibold px-6 py-3 rounded-xl border border-gray-200 hover:bg-gray-50 transition-colors">
                        Voir la documentation
                    </Link>
                </div>
            </section>

            {/* Exemple de code */}
            <section className="max-w-3xl mx-auto px-4 pb-16">
                <div className="bg-gray-900 rounded-2xl p-6 overflow-x-auto">
                    <pre className="text-xs text-gray-300 font-mono leading-relaxed">
{`curl https://api.kinemaplus.com \\
  -H "x-api-key: cp_live_votre_cle" \\
  -H "Content-Type: application/json" \\
  -d '{
    "messages": [
      { "role": "user", "content": "Salut Vanessa !" }
    ]
  }'`}
                    </pre>
                </div>
            </section>

            {/* Fonctionnalités */}
            <section className="max-w-4xl mx-auto px-4 pb-20 grid sm:grid-cols-3 gap-6">
                <Feature icon="🗣️" title="Ton authentique" desc="Français de rue, expressions locales, humeurs — pas un chatbot générique." />
                <Feature icon="🎯" title="Cadrée et sérieuse" desc="Toujours factuelle sur les sujets sensibles, jamais de dérive incontrôlée." />
                <Feature icon="📊" title="Suivi transparent" desc="Console avec usage en temps réel, historique des appels, gestion de quota." />
            </section>
        </div>
    );
}

function Feature({ icon, title, desc }: { icon: string; title: string; desc: string }) {
    return (
        <div className="bg-white rounded-2xl border border-gray-100 p-5 text-center">
            <div className="text-2xl mb-2">{icon}</div>
            <p className="font-semibold text-gray-800 text-sm">{title}</p>
            <p className="text-xs text-gray-400 mt-1">{desc}</p>
        </div>
    );
}
