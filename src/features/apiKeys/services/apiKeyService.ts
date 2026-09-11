// src/features/apiKeys/services/apiKeyService.ts — Vanessa API Platform
import { callFunction } from '@/api/functionsClient';
import { FUNCTIONS } from '@/api/constants';

export interface ApiKey {
    $id: string;
    name: string;
    keyPrefix: string;
    status: 'pending' | 'active' | 'suspended' | 'exhausted';
    tokensGranted: number;
    tokensUsed: number;
    tokensRemaining: number;
    isPartner: boolean;
    createdAt: string;
    activatedAt: string | null;
    lastUsedAt: string | null;
}

export interface ApiKeyRequest {
    $id: string;
    type: 'new' | 'recharge';
    keyId: string;
    keyName: string;
    contactPhone: string;
    contactEmail: string;
    amount: number;
    tokensRequested: number;
    status: 'pending' | 'approved' | 'rejected';
    adminNote: string;
    createdAt: string;
}

export interface UsageLog {
    $id: string;
    keyId: string;
    tokensIn: number;
    tokensOut: number;
    totalTokens: number;
    statusCode: number;
    errorType: string;
    createdAt: string;
}

export const apiKeyService = {
    async listKeys(): Promise<ApiKey[]> {
        const result = await callFunction<{ keys: ApiKey[] }>(FUNCTIONS.MANAGE_API_KEYS, { action: 'list_keys' });
        return result.keys;
    },

    async listRequests(): Promise<ApiKeyRequest[]> {
        const result = await callFunction<{ requests: ApiKeyRequest[] }>(FUNCTIONS.MANAGE_API_KEYS, { action: 'list_requests' });
        return result.requests;
    },

    async requestKey(data: { keyName: string; contactPhone: string; contactEmail: string; amount: number; tokensRequested: number }): Promise<void> {
        await callFunction(FUNCTIONS.MANAGE_API_KEYS, { action: 'request_key', ...data });
    },

    async requestRecharge(data: { keyId: string; contactPhone: string; contactEmail: string; amount: number; tokensRequested: number }): Promise<void> {
        await callFunction(FUNCTIONS.MANAGE_API_KEYS, { action: 'request_recharge', ...data });
    },

    async usage(keyId?: string, limit = 50): Promise<UsageLog[]> {
        const result = await callFunction<{ logs: UsageLog[] }>(FUNCTIONS.MANAGE_API_KEYS, { action: 'usage', keyId, limit });
        return result.logs;
    },

    async revokeKey(keyId: string): Promise<void> {
        await callFunction(FUNCTIONS.MANAGE_API_KEYS, { action: 'revoke_key', keyId });
    },
};
