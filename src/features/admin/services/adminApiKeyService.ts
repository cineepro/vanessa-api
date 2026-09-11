// src/features/admin/services/adminApiKeyService.ts — Vanessa API Platform
import { callFunction } from '@/api/functionsClient';
import { FUNCTIONS } from '@/api/constants';
import type { ApiKey, ApiKeyRequest } from '@/features/apiKeys/services/apiKeyService';

export interface AdminRequest extends ApiKeyRequest {
    userId: string;
    userName: string;
}

export interface AdminKey extends Omit<ApiKey, 'tokensRemaining'> {
    userId: string;
    userName: string;
}

export const adminApiKeyService = {
    async listRequests(status?: string): Promise<AdminRequest[]> {
        const result = await callFunction<{ requests: AdminRequest[] }>(FUNCTIONS.ADMIN_API_KEYS, { action: 'list_requests', status });
        return result.requests;
    },

    async approveRequest(requestId: string, tokensGranted?: number, adminNote?: string): Promise<{ apiKey?: string; warning?: string; recharged?: boolean }> {
        return await callFunction(FUNCTIONS.ADMIN_API_KEYS, { action: 'approve_request', requestId, tokensGranted, adminNote });
    },

    async rejectRequest(requestId: string, adminNote?: string): Promise<void> {
        await callFunction(FUNCTIONS.ADMIN_API_KEYS, { action: 'reject_request', requestId, adminNote });
    },

    async listAllKeys(status?: string): Promise<AdminKey[]> {
        const result = await callFunction<{ keys: AdminKey[] }>(FUNCTIONS.ADMIN_API_KEYS, { action: 'list_all_keys', status });
        return result.keys;
    },

    async createPartnerKey(targetUserId: string, keyName: string, tokensGranted: number): Promise<{ apiKey: string; warning: string }> {
        return await callFunction(FUNCTIONS.ADMIN_API_KEYS, { action: 'create_partner_key', targetUserId, keyName, tokensGranted });
    },

    async setKeyStatus(keyId: string, status: string): Promise<void> {
        await callFunction(FUNCTIONS.ADMIN_API_KEYS, { action: 'set_key_status', keyId, status });
    },

    async stats(): Promise<{ pendingRequests: number; activeKeys: number; totalCalls: number; tokensLast100Calls: number }> {
        const result = await callFunction<{ stats: any }>(FUNCTIONS.ADMIN_API_KEYS, { action: 'stats' });
        return result.stats;
    },
};
