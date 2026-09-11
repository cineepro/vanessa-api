// src/pages/RegisterPage.tsx — Vanessa API Platform
import { Link } from 'react-router-dom';
import { RegisterForm } from '@/features/auth/components/RegisterForm';

export default function RegisterPage() {
    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
            <div className="w-full max-w-md bg-white rounded-3xl shadow-sm p-8">
                <div className="text-center mb-8">
                    <Link to="/" className="text-2xl font-bold text-brand">🔮 Vanessa API</Link>
                    <p className="text-sm text-gray-500 mt-1">Crée ton compte développeur</p>
                </div>
                <RegisterForm />
            </div>
        </div>
    );
}
