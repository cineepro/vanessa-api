// src/api/constants.ts — Vanessa API Platform
export const DATABASE_ID = import.meta.env.VITE_APPWRITE_DATABASE_ID || '';

export const COLLECTIONS = {
    USERS: import.meta.env.VITE_APPWRITE_COLLECTION_USERS || '',
    API_KEYS: import.meta.env.VITE_APPWRITE_COLLECTION_API_KEYS || '',
    API_KEY_REQUESTS: import.meta.env.VITE_APPWRITE_COLLECTION_API_KEY_REQUESTS || '',
    API_USAGE_LOGS: import.meta.env.VITE_APPWRITE_COLLECTION_API_USAGE_LOGS || '',
} as const;

export const FUNCTIONS = {
    MANAGE_API_KEYS: import.meta.env.VITE_APPWRITE_FUNCTION_MANAGE_API_KEYS || '',
    ADMIN_API_KEYS: import.meta.env.VITE_APPWRITE_FUNCTION_ADMIN_API_KEYS || '',
} as const;

// URL publique affichée dans la documentation — c'est celle que les
// développeurs tiers appellent réellement, pas une Function interne.
export const VANESSA_API_URL = import.meta.env.VITE_VANESSA_API_URL || '';
