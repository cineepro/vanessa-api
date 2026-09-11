// functions/manage-api-keys/src/main.js — Vanessa API (espace développeur)
//
// Côté CLIENT (tout utilisateur authentifié, même compte que Ça Parle) :
//   { action: 'list_keys' }
//   { action: 'request_key', keyName, contactPhone, contactEmail, amount, tokensRequested }
//   { action: 'request_recharge', keyId, contactPhone, contactEmail, amount, tokensRequested }
//   { action: 'list_requests' }
//   { action: 'usage', keyId?, limit? }
//   { action: 'revoke_key', keyId }
//
// Permissions d'exécution : `users`.
//
// ⚠️ Ne renvoie JAMAIS keyHash. La clé en clair n'existe qu'une seule fois,
// au moment de l'activation par un administrateur — elle n'est stockée nulle
// part et ne peut donc jamais être réaffichée ensuite, y compris ici.
import { Client, Databases, Query, ID } from 'node-appwrite';

const MAX_ACTIVE_REQUESTS = 5;

// Ne laisse sortir que des champs sûrs — barrière explicite plutôt que de
// renvoyer le document brut, pour qu'un futur ajout d'attribut sensible ne
// se retrouve pas exposé par accident.
function publicKey(doc) {
    return {
        $id: doc.$id,
        name: doc.name,
        keyPrefix: doc.keyPrefix,
        status: doc.status,
        tokensGranted: doc.tokensGranted || 0,
        tokensUsed: doc.tokensUsed || 0,
        tokensRemaining: Math.max(0, (doc.tokensGranted || 0) - (doc.tokensUsed || 0)),
        isPartner: !!doc.isPartner,
        createdAt: doc.createdAt,
        activatedAt: doc.activatedAt || null,
        lastUsedAt: doc.lastUsedAt || null,
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
    const COLLECTION_API_KEYS = process.env.COLLECTION_API_KEYS;
    const COLLECTION_API_KEY_REQUESTS = process.env.COLLECTION_API_KEY_REQUESTS;
    const COLLECTION_API_USAGE_LOGS = process.env.COLLECTION_API_USAGE_LOGS;

    try {
        const body = req.bodyJson ?? JSON.parse(req.body || '{}');
        const { action, keyId, keyName, contactPhone, contactEmail, amount, tokensRequested, limit } = body;

        switch (action) {
            case 'list_keys': {
                const result = await databases.listDocuments(DATABASE_ID, COLLECTION_API_KEYS, [
                    Query.equal('userId', callerId),
                    Query.orderDesc('createdAt'),
                    Query.limit(50),
                ]);
                return res.json({ success: true, keys: result.documents.map(publicKey) });
            }

            case 'list_requests': {
                const result = await databases.listDocuments(DATABASE_ID, COLLECTION_API_KEY_REQUESTS, [
                    Query.equal('userId', callerId),
                    Query.orderDesc('createdAt'),
                    Query.limit(50),
                ]);
                return res.json({ success: true, requests: result.documents });
            }

            case 'request_key':
            case 'request_recharge': {
                if (!contactPhone || !contactEmail) {
                    return res.json({ success: false, error: 'Un numéro WhatsApp et un email sont obligatoires pour être recontacté.' }, 400);
                }
                const tokens = parseInt(tokensRequested, 10);
                const price = parseInt(amount, 10);
                if (!tokens || tokens <= 0 || !price || price <= 0) {
                    return res.json({ success: false, error: 'Le montant et le nombre de tokens doivent être des nombres positifs.' }, 400);
                }

                // Garde-fou anti-spam : empêche d'empiler des dizaines de
                // demandes en attente, ce qui rendrait le suivi manuel
                // ingérable côté administration.
                const pending = await databases.listDocuments(DATABASE_ID, COLLECTION_API_KEY_REQUESTS, [
                    Query.equal('userId', callerId),
                    Query.equal('status', 'pending'),
                    Query.limit(MAX_ACTIVE_REQUESTS + 1),
                ]);
                if (pending.documents.length >= MAX_ACTIVE_REQUESTS) {
                    return res.json({
                        success: false,
                        error: `Tu as déjà ${MAX_ACTIVE_REQUESTS} demandes en attente. Attends leur traitement avant d'en envoyer d'autres.`,
                    }, 429);
                }

                if (action === 'request_recharge') {
                    if (!keyId) return res.json({ success: false, error: 'keyId requis pour une recharge.' }, 400);
                    // Vérifie que la clé appartient bien à l'appelant — sans
                    // ça, n'importe qui pourrait demander une recharge sur
                    // la clé d'un autre.
                    const target = await databases.getDocument(DATABASE_ID, COLLECTION_API_KEYS, keyId);
                    if (target.userId !== callerId) {
                        return res.json({ success: false, error: 'Cette clé ne t\'appartient pas.' }, 403);
                    }
                }

                const request = await databases.createDocument(DATABASE_ID, COLLECTION_API_KEY_REQUESTS, ID.unique(), {
                    userId: callerId,
                    keyId: action === 'request_recharge' ? keyId : '',
                    type: action === 'request_recharge' ? 'recharge' : 'new',
                    keyName: keyName || 'Ma clé',
                    contactPhone,
                    contactEmail,
                    amount: price,
                    tokensRequested: tokens,
                    status: 'pending',
                    adminNote: '',
                    createdAt: new Date().toISOString(),
                });

                return res.json({ success: true, request });
            }

            case 'usage': {
                const queries = [
                    Query.equal('userId', callerId),
                    Query.orderDesc('createdAt'),
                    Query.limit(Math.min(parseInt(limit, 10) || 50, 100)),
                ];
                if (keyId) queries.splice(1, 0, Query.equal('keyId', keyId));
                const result = await databases.listDocuments(DATABASE_ID, COLLECTION_API_USAGE_LOGS, queries);
                return res.json({ success: true, logs: result.documents, total: result.total });
            }

            case 'revoke_key': {
                if (!keyId) return res.json({ success: false, error: 'keyId requis.' }, 400);
                const target = await databases.getDocument(DATABASE_ID, COLLECTION_API_KEYS, keyId);
                if (target.userId !== callerId) {
                    return res.json({ success: false, error: 'Cette clé ne t\'appartient pas.' }, 403);
                }
                // Suspension plutôt que suppression : conserve l'historique
                // d'usage et de facturation associé à cette clé.
                await databases.updateDocument(DATABASE_ID, COLLECTION_API_KEYS, keyId, { status: 'suspended' });
                return res.json({ success: true });
            }

            default:
                return res.json({ success: false, error: `Action inconnue : ${action}` }, 400);
        }
    } catch (err) {
        error(err.message);
        return res.json({ success: false, error: err.message }, 500);
    }
};
