// src/pages/NotFoundPage.tsx — Vanessa API Platform
import { Link } from 'react-router-dom';

export default function NotFoundPage() {
    return (
        <div className="min-h-screen flex flex-col items-center justify-center gap-3">
            <p className="text-6xl">🔮</p>
            <p className="text-gray-500">Cette page n'existe pas.</p>
            <Link to="/" className="text-brand font-semibold hover:underline">Retour à l'accueil</Link>
        </div>
    );
}
