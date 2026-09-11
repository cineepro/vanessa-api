// src/api/functionsClient.ts — Vanessa API Platform
import { functions } from './appwrite';

export class FunctionCallError extends Error {}

// Même pattern que ça-parle : toutes nos Functions renvoient
// { success: boolean, error?: string, ...data }, jamais d'exception brute
// côté client.
export async function callFunction<T = any>(functionId: string, payload: object): Promise<T> {
    if (!functionId) {
        throw new FunctionCallError('Function non configurée (ID manquant dans le .env).');
    }
    const execution = await functions.createExecution(functionId, JSON.stringify(payload), false);

    if (execution.status === 'failed') {
        throw new FunctionCallError("L'exécution a échoué côté serveur.");
    }

    let body: any;
    try {
        body = JSON.parse(execution.responseBody);
    } catch {
        throw new FunctionCallError('Réponse serveur invalide.');
    }

    if (body.success === false) {
        throw new FunctionCallError(body.error || 'Une erreur est survenue.');
    }

    return body as T;
}
