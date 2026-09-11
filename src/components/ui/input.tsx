// src/components/ui/input.tsx — Vanessa API Platform
import type { InputHTMLAttributes } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
    label?: string;
}

export const Input = ({ label, className = '', id, ...props }: InputProps) => {
    return (
        <div className="w-full">
            {label && (
                <label htmlFor={id} className="block text-sm font-medium text-gray-700 mb-1.5">
                    {label}
                </label>
            )}
            <input
                id={id}
                className={`w-full rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand/40 ${className}`}
                {...props}
            />
        </div>
    );
};
