/** @type {import('tailwindcss').Config} */
export default {
    content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
    theme: {
        extend: {
            colors: {
                brand: {
                    DEFAULT: '#6366F1', // indigo — identité distincte de Ça Parle (rouge), pour bien marquer "produit développeur" à part
                    dark: '#4338CA',
                },
            },
        },
    },
    plugins: [],
};
