// src/features/apiKeys/hooks/useApiKeys.ts — Vanessa API Platform
import { useState, useEffect, useCallback } from 'react';
import { apiKeyService, type ApiKey, type ApiKeyRequest } from '../services/apiKeyService';

export const useApiKeys = () => {
    const [keys, setKeys] = useState<ApiKey[]>([]);
    const [requests, setRequests] = useState<ApiKeyRequest[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const load = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const [k, r] = await Promise.all([apiKeyService.listKeys(), apiKeyService.listRequests()]);
            setKeys(k);
            setRequests(r);
        } catch (err: any) {
            setError(err.message || 'Impossible de charger tes clés.');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        load();
    }, [load]);

    return { keys, requests, loading, error, refresh: load };
};
