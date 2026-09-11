// functions/admin-api-keys/src/main.js — Vanessa API (administration)
//
// Réservé aux modérateurs (isModerator === true sur le document `users`).
//   { action: 'list_requests', status? }
//   { action: 'approve_request', requestId, tokensGranted?, adminNote? }
//   { action: 'reject_request', requestId, adminNote? }
//   { action: 'list_all_keys', status? }
//   { action: 'create_partner_key', targetUserId, keyName, tokensGranted }
//   { action: 'set_key_status', keyId, status }
//   { action: 'stats' }
//
// Permissions d'exécution : `users` (le contrôle isModerator se fait ici).
//
// ⚠️ La clé en clair n'est renvoyée QU'UNE SEULE FOIS, au moment de sa
// création (approve_request sur une demande `new`, ou create_partner_key).
// Seul son hash est stocké : ni l'administrateur ni le client ne pourront
// jamais la relire ensuite. C'est volontaire — si la base de données fuite,
// aucune clé exploitable n'en sort. Transmets-la immédiatement au client.
import { Client, Databases, Query, ID } from 'node-appwrite';
import crypto from 'crypto';

function generateApiKey() {
    const secret = crypto.randomBytes(24).toString('hex'); // 48 caractères
    const raw = `cp_live_${secret}`;
    return {
        raw,
        hash: crypto.createHash('sha256').update(raw).digest('hex'),
        prefix: `${raw.slice(0, 16)}…`, // partie visible pour identifier la clé
    };
}

export default async ({ req, res, error }) => {
    const callerId = req.headers['x-appwrite-user-id'];
    if (!callerId) {
        return res.json({ success: false, error: 'Authentification requise.' }, 401);
    }

    const client = new Client()
        .setEndpoint(process.env.APPWRITE_FUNCTION_API_ENDPOINT)
        .setProject(process.env.APPWRITE_FUNCTION_PROJECT_ID)
        .setKey(process.env.APPWRITE_API_KEY);

    const databases = new Databases(client);
    const DATABASE_ID = process.env.DATABASE_ID;
    const COLLECTION_USERS = process.env.COLLECTION_USERS;
    const COLLECTION_API_KEYS = process.env.COLLECTION_API_KEYS;
    const COLLECTION_API_KEY_REQUESTS = process.env.COLLECTION_API_KEY_REQUESTS;
    const COLLECTION_API_USAGE_LOGS = process.env.COLLECTION_API_USAGE_LOGS;

    try {
        const callerUser = await databases.getDocument(DATABASE_ID, COLLECTION_USERS, callerId);
        if (!callerUser.isModerator) {
            return res.json({ success: false, error: 'Action réservée aux administrateurs.' }, 403);
        }

        const body = req.bodyJson ?? JSON.parse(req.body || '{}');
        const { action, requestId, keyId, status, tokensGranted, adminNote, targetUserId, keyName } = body;

        switch (action) {
            case 'list_requests': {
                const queries = [Query.orderDesc('createdAt'), Query.limit(100)];
                if (status) queries.unshift(Query.equal('status', status));
                const result = await databases.listDocuments(DATABASE_ID, COLLECTION_API_KEY_REQUESTS, queries);

                // Enrichit avec le nom du demandeur — évite d'avoir à
                // croiser manuellement les IDs côté interface.
                const enriched = await Promise.all(result.documents.map(async (r) => {
                    let userName = 'Utilisateur';
                    try {
                        const u = await databases.getDocument(DATABASE_ID, COLLECTION_USERS, r.userId);
                        userName = u.name || userName;
                    } catch { /* compte supprimé entre-temps */ }
                    return { ...r, userName };
                }));

                return res.json({ success: true, requests: enriched });
            }

            case 'approve_request': {
                if (!requestId) return res.json({ success: false, error: 'requestId requis.' }, 400);
                const request = await databases.getDocument(DATABASE_ID, COLLECTION_API_KEY_REQUESTS, requestId);
                if (request.status !== 'pending') {
                    return res.json({ success: false, error: 'Cette demande a déjà été traitée.' }, 400);
                }

                // Permet d'accorder un volume différent de celui demandé
                // (négociation, ajustement du tarif...).
                const granted = parseInt(tokensGranted, 10) || request.tokensRequested;

                if (request.type === 'recharge') {
                    const target = await databases.getDocument(DATABASE_ID, COLLECTION_API_KEYS, request.keyId);
                    // Le quota s'ADDITIONNE au restant : un client qui
                    // recharge avant épuisement ne perd pas son solde.
                    await databases.updateDocument(DATABASE_ID, COLLECTION_API_KEYS, request.keyId, {
                        tokensGranted: (target.tokensGranted || 0) + granted,
                        status: 'active',
                    });
                    await databases.updateDocument(DATABASE_ID, COLLECTION_API_KEY_REQUESTS, requestId, {
                        status: 'approved',
                        adminNote: adminNote || '',
                        processedAt: new Date().toISOString(),
                    });
                    return res.json({ success: true, recharged: true, tokensAdded: granted });
                }

                // Nouvelle clé
                const { raw, hash, prefix } = generateApiKey();
                const keyDoc = await databases.createDocument(DATABASE_ID, COLLECTION_API_KEYS, ID.unique(), {
                    userId: request.userId,
                    name: request.keyName || 'Ma clé',
                    keyPrefix: prefix,
                    keyHash: hash,
                    status: 'active',
                    tokensGranted: granted,
                    tokensUsed: 0,
                    isPartner: false,
                    createdAt: new Date().toISOString(),
                    activatedAt: new Date().toISOString(),
                });

                await databases.updateDocument(DATABASE_ID, COLLECTION_API_KEY_REQUESTS, requestId, {
                    status: 'approved',
                    keyId: keyDoc.$id,
                    adminNote: adminNote || '',
                    processedAt: new Date().toISOString(),
                });

                return res.json({
                    success: true,
                    keyId: keyDoc.$id,
                    // Unique et seule occasion de voir cette valeur.
                    apiKey: raw,
                    warning: "Transmets cette clé au client maintenant : elle ne pourra plus jamais être réaffichée.",
                });
            }

            case 'reject_request': {
                if (!requestId) return res.json({ success: false, error: 'requestId requis.' }, 400);
                await databases.updateDocument(DATABASE_ID, COLLECTION_API_KEY_REQUESTS, requestId, {
                    status: 'rejected',
                    adminNote: adminNote || '',
                    processedAt: new Date().toISOString(),
                });
                return res.json({ success: true });
            }

            case 'create_partner_key': {
                // Clé offerte dans le cadre d'un partenariat : même
                // mécanique de quota que les clés payantes (donc aucun
                // risque de coût illimité), mais marquée `isPartner` pour
                // la distinguer dans les statistiques. À épuisement, le
                // partenaire bascule naturellement vers une recharge
                // payante, sans traitement particulier.
                if (!targetUserId || !tokensGranted) {
                    return res.json({ success: false, error: 'targetUserId et tokensGranted requis.' }, 400);
                }
                const { raw, hash, prefix } = generateApiKey();
                const keyDoc = await databases.createDocument(DATABASE_ID, COLLECTION_API_KEYS, ID.unique(), {
                    userId: targetUserId,
                    name: keyName || 'Clé partenaire',
                    keyPrefix: prefix,
                    keyHash: hash,
                    status: 'active',
                    tokensGranted: parseInt(tokensGranted, 10),
                    tokensUsed: 0,
                    isPartner: true,
                    createdAt: new Date().toISOString(),
                    activatedAt: new Date().toISOString(),
                });
                return res.json({
                    success: true,
                    keyId: keyDoc.$id,
                    apiKey: raw,
                    warning: "Transmets cette clé au partenaire maintenant : elle ne pourra plus jamais être réaffichée.",
                });
            }

            case 'list_all_keys': {
                const queries = [Query.orderDesc('createdAt'), Query.limit(100)];
                if (status) queries.unshift(Query.equal('status', status));
                const result = await databases.listDocuments(DATABASE_ID, COLLECTION_API_KEYS, queries);
                const enriched = await Promise.all(result.documents.map(async (k) => {
                    let userName = 'Utilisateur';
                    try {
                        const u = await databases.getDocument(DATABASE_ID, COLLECTION_USERS, k.userId);
                        userName = u.name || userName;
                    } catch { /* compte supprimé */ }
                    // keyHash volontairement exclu, même pour un admin.
                    const { keyHash, ...safe } = k;
                    return { ...safe, userName };
                }));
                return res.json({ success: true, keys: enriched });
            }

            case 'set_key_status': {
                if (!keyId || !status) return res.json({ success: false, error: 'keyId et status requis.' }, 400);
                const allowed = ['active', 'suspended', 'exhausted', 'pending'];
                if (!allowed.includes(status)) {
                    return res.json({ success: false, error: `Statut invalide. Valeurs possibles : ${allowed.join(', ')}` }, 400);
                }
                await databases.updateDocument(DATABASE_ID, COLLECTION_API_KEYS, keyId, { status });
                return res.json({ success: true });
            }

            case 'stats': {
                const [pendingReqs, activeKeys, recentLogs] = await Promise.all([
                    databases.listDocuments(DATABASE_ID, COLLECTION_API_KEY_REQUESTS, [Query.equal('status', 'pending'), Query.limit(1)]),
                    databases.listDocuments(DATABASE_ID, COLLECTION_API_KEYS, [Query.equal('status', 'active'), Query.limit(1)]),
                    databases.listDocuments(DATABASE_ID, COLLECTION_API_USAGE_LOGS, [Query.orderDesc('createdAt'), Query.limit(100)]),
                ]);
                const tokensLast100 = recentLogs.documents.reduce((sum, l) => sum + (l.totalTokens || 0), 0);
                return res.json({
                    success: true,
                    stats: {
                        pendingRequests: pendingReqs.total,
                        activeKeys: activeKeys.total,
                        totalCalls: recentLogs.total,
                        tokensLast100Calls: tokensLast100,
                    },
                });
            }

            default:
                return res.json({ success: false, error: `Action inconnue : ${action}` }, 400);
        }
    } catch (err) {
        error(err.message);
        return res.json({ success: false, error: err.message }, 500);
    }
};
