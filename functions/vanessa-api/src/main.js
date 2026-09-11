// functions/vanessa-api/src/main.js — Vanessa API
//
// ENDPOINT PUBLIC — c'est LE produit vendu aux développeurs.
// Permissions d'exécution : "any" (pas de session Appwrite, l'authentification
// se fait uniquement par la clé API dans l'en-tête).
//
// Appel côté client développeur :
//   POST https://<domaine-de-cette-function>/
//   Headers : x-api-key: cp_live_xxxxx
//             content-type: application/json
//   Body    : { "messages": [{ "role": "user", "content": "..." }],
//               "max_tokens": 300 }              (max_tokens optionnel)
//
// ⚠️ SÉCURITÉ FINANCIÈRE : chaque appel coûte réellement de l'argent sur le
// compte Anthropic du propriétaire de la plateforme. Le quota est donc
// vérifié AVANT d'appeler Claude, jamais après — sinon une clé épuisée
// pourrait continuer à générer des coûts. Ne jamais inverser cet ordre.
import { Client, Databases, Query, ID } from 'node-appwrite';
import crypto from 'crypto';

// Personnalité de Vanessa — c'est ce qui est vendu : le ton, le style, les
// expressions. Volontairement dupliqué ici plutôt qu'importé : les Functions
// Appwrite ne partagent pas de code, et cette version "API" doit rester
// stable même si la personnalité évolue côté plateforme Ça Parle.
const VANESSA_SYSTEM_PROMPT = `Tu es Vanessa, 19 ans, triple nationalité (béninoise, camerounaise, ivoirienne). Tu es une personnalité IA au langage des jeunes africains.

TON STYLE :
- Tu parles en français de rue, à l'africaine — jamais en français littéraire ou soutenu.
- Tu utilises naturellement des expressions du Bénin, de Côte d'Ivoire, du Togo, du Cameroun, du Sénégal ("gbairai", "wèèh", "mon frère", "eh Dieu", "on dit koi", "c'est comment"...), sans en abuser à chaque phrase.
- Tes phrases sont courtes, vivantes, avec des emojis utilisés avec parcimonie (1-2 par message maximum).
- Tu ne parles jamais comme un robot ou un service client.

EXEMPLES DE TON EXACT (inspire-toi de ce niveau de langage, ne recopie jamais mot pour mot) :
- "Hummm... attends un peu. Cette histoire-là sent le gbairai à plein nez hein 😂"
- "Wèèh, raconte-moi ça bien, qu'est-ce qui s'est passé exactement ?"
- "Làààà, cette affaire mérite une enquête."
- "Donc après tout ça, tu veux me faire croire que c'était accidentel ?"

CE QU'IL NE FAUT JAMAIS FAIRE — trop soutenu/robotique, à éviter absolument :
❌ "Je comprends votre situation, pourriez-vous m'en dire davantage ?"
✅ "Eh Dieu, raconte-moi ça, qu'est-ce qui s'est passé avant ?"

RÈGLES DE FOND, prioritaires sur le style :
- Sur les sujets sérieux ou sensibles (politique, justice, santé, drame, actualité grave), tu restes factuellement rigoureuse et respectueuse. Ton STYLE ne change pas, mais tu ne tournes jamais ces sujets en dérision.
- Tu ne commentes JAMAIS le physique, le corps ou l'apparence d'une personne, même sur le ton de l'humour.
- Tu n'inventes pas de rumeurs ou d'accusations sur des personnes réelles nommées.
- Face à une détresse réelle (violence, idées suicidaires, agression), sors du ton léger, exprime une empathie sincère et invite la personne à en parler à un adulte de confiance ou à un professionnel. Ne donne jamais de conseil médical, juridique ou psychologique toi-même.`;

const MAX_TOKENS_DEFAULT = 300;
const MAX_TOKENS_CEILING = 1024;

function hashKey(rawKey) {
    return crypto.createHash('sha256').update(rawKey).digest('hex');
}

export default async ({ req, res, log, error }) => {
    const client = new Client()
        .setEndpoint(process.env.APPWRITE_FUNCTION_API_ENDPOINT)
        .setProject(process.env.APPWRITE_FUNCTION_PROJECT_ID)
        .setKey(process.env.APPWRITE_API_KEY);

    const databases = new Databases(client);
    const DATABASE_ID = process.env.DATABASE_ID;
    const COLLECTION_API_KEYS = process.env.COLLECTION_API_KEYS;
    const COLLECTION_API_USAGE_LOGS = process.env.COLLECTION_API_USAGE_LOGS;
    const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;

    // Journalise l'appel, quel que soit son issue — c'est la source de
    // vérité pour la facturation et pour le suivi côté client.
    async function logUsage(keyDoc, tokensIn, tokensOut, statusCode, errorType) {
        try {
            await databases.createDocument(DATABASE_ID, COLLECTION_API_USAGE_LOGS, ID.unique(), {
                keyId: keyDoc?.$id || 'unknown',
                userId: keyDoc?.userId || 'unknown',
                tokensIn: tokensIn || 0,
                tokensOut: tokensOut || 0,
                totalTokens: (tokensIn || 0) + (tokensOut || 0),
                statusCode,
                errorType: errorType || '',
                createdAt: new Date().toISOString(),
            });
        } catch (logErr) {
            log(`⚠️ Échec journalisation (non bloquant) : ${logErr.message}`);
        }
    }

    try {
        // --- 1. Authentification par clé API ---
        const rawKey = req.headers['x-api-key'] || '';
        if (!rawKey) {
            return res.json({
                error: { type: 'authentication_error', message: 'Clé API manquante. Envoie-la dans l\'en-tête x-api-key.' },
            }, 401);
        }

        const keyResult = await databases.listDocuments(DATABASE_ID, COLLECTION_API_KEYS, [
            Query.equal('keyHash', hashKey(rawKey)),
            Query.limit(1),
        ]);

        if (keyResult.documents.length === 0) {
            // Volontairement générique : ne jamais indiquer si la clé a
            // existé, a été révoquée, ou n'a jamais existé.
            return res.json({
                error: { type: 'authentication_error', message: 'Clé API invalide.' },
            }, 401);
        }

        const keyDoc = keyResult.documents[0];

        if (keyDoc.status !== 'active') {
            const messages = {
                pending: "Cette clé n'est pas encore activée. Elle le sera après validation de ton paiement.",
                suspended: 'Cette clé a été suspendue. Contacte-nous pour en savoir plus.',
                exhausted: 'Le quota de cette clé est épuisé. Recharge-la depuis ton espace développeur.',
            };
            await logUsage(keyDoc, 0, 0, 403, `key_${keyDoc.status}`);
            return res.json({
                error: { type: 'permission_error', message: messages[keyDoc.status] || 'Cette clé est inactive.' },
            }, 403);
        }

        // --- 2. Vérification du quota AVANT tout appel payant ---
        const remaining = (keyDoc.tokensGranted || 0) - (keyDoc.tokensUsed || 0);
        if (remaining <= 0) {
            // Bascule le statut pour que les prochains appels soient
            // rejetés plus tôt, sans même recalculer.
            try {
                await databases.updateDocument(DATABASE_ID, COLLECTION_API_KEYS, keyDoc.$id, { status: 'exhausted' });
            } catch { /* non bloquant */ }
            await logUsage(keyDoc, 0, 0, 429, 'quota_exhausted');
            return res.json({
                error: { type: 'quota_error', message: 'Quota épuisé. Recharge ta clé depuis ton espace développeur.' },
            }, 429);
        }

        // --- 3. Validation de la requête ---
        const body = req.bodyJson ?? JSON.parse(req.body || '{}');
        const { messages, max_tokens } = body;

        if (!Array.isArray(messages) || messages.length === 0) {
            await logUsage(keyDoc, 0, 0, 400, 'invalid_request');
            return res.json({
                error: { type: 'invalid_request_error', message: '`messages` est requis : un tableau non vide de { role, content }.' },
            }, 400);
        }

        const invalid = messages.find((m) => !m || (m.role !== 'user' && m.role !== 'assistant') || typeof m.content !== 'string');
        if (invalid) {
            await logUsage(keyDoc, 0, 0, 400, 'invalid_request');
            return res.json({
                error: { type: 'invalid_request_error', message: 'Chaque message doit avoir un `role` ("user" ou "assistant") et un `content` texte.' },
            }, 400);
        }

        // Claude exige une alternance stricte user/assistant et un premier
        // message "user" — on normalise ici plutôt que de renvoyer une
        // erreur, pour que l'API reste tolérante côté développeur.
        const normalized = [];
        for (const m of messages) {
            const last = normalized[normalized.length - 1];
            if (last && last.role === m.role) {
                last.content += '\n' + m.content;
            } else {
                normalized.push({ role: m.role, content: m.content });
            }
        }
        while (normalized.length > 0 && normalized[0].role !== 'user') {
            normalized.shift();
        }
        if (normalized.length === 0) {
            await logUsage(keyDoc, 0, 0, 400, 'invalid_request');
            return res.json({
                error: { type: 'invalid_request_error', message: 'Aucun message exploitable : la conversation doit commencer par un message "user".' },
            }, 400);
        }

        // Plafonné : empêche un client de vider son quota (et de gonfler la
        // facture) en une seule requête démesurée.
        const requestedTokens = Math.min(
            Math.max(parseInt(max_tokens, 10) || MAX_TOKENS_DEFAULT, 1),
            MAX_TOKENS_CEILING
        );

        // --- 4. Appel à Claude ---
        const response = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': ANTHROPIC_API_KEY,
                'anthropic-version': '2023-06-01',
            },
            body: JSON.stringify({
                model: 'claude-sonnet-5',
                system: VANESSA_SYSTEM_PROMPT,
                messages: normalized,
                max_tokens: requestedTokens,
            }),
        });

        if (!response.ok) {
            const errorBody = await response.text();
            log(`❌ Erreur Claude (${response.status}) : ${errorBody}`);
            await logUsage(keyDoc, 0, 0, 502, 'upstream_error');
            return res.json({
                error: { type: 'api_error', message: 'Le service est momentanément indisponible, réessaie dans un instant.' },
            }, 502);
        }

        const data = await response.json();
        const reply = data.content?.[0]?.text?.trim() || '';
        const tokensIn = data.usage?.input_tokens || 0;
        const tokensOut = data.usage?.output_tokens || 0;
        const consumed = tokensIn + tokensOut;

        // --- 5. Décompte réel + journalisation ---
        const newUsed = (keyDoc.tokensUsed || 0) + consumed;
        const updates = { tokensUsed: newUsed, lastUsedAt: new Date().toISOString() };
        if (newUsed >= (keyDoc.tokensGranted || 0)) {
            updates.status = 'exhausted';
        }
        try {
            await databases.updateDocument(DATABASE_ID, COLLECTION_API_KEYS, keyDoc.$id, updates);
        } catch (updErr) {
            // Non bloquant pour le client, mais grave côté facturation :
            // la consommation reste tracée dans les logs d'usage même si
            // le compteur de la clé n'a pas pu être mis à jour.
            log(`⚠️ Échec mise à jour compteur clé ${keyDoc.$id} : ${updErr.message}`);
        }

        await logUsage(keyDoc, tokensIn, tokensOut, 200, '');

        return res.json({
            reply,
            usage: {
                input_tokens: tokensIn,
                output_tokens: tokensOut,
                total_tokens: consumed,
                tokens_remaining: Math.max(0, (keyDoc.tokensGranted || 0) - newUsed),
            },
        });
    } catch (err) {
        error(err.message);
        return res.json({
            error: { type: 'api_error', message: 'Une erreur interne est survenue.' },
        }, 500);
    }
};
