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

const LEXICON_CATEGORY = 'lexique';

const MAX_TOKENS_DEFAULT = 300;
const MAX_TOKENS_CEILING = 1024;
const MAX_CONTEXT_LENGTH = 2000; // caractères — évite qu'un contexte démesuré gonfle chaque appel
const RATE_LIMIT_PER_MINUTE = 20; // par clé — protège d'un script qui tirerait en rafale
const API_VERSION = 'v1';

function hashKey(rawKey) {
    return crypto.createHash('sha256').update(rawKey).digest('hex');
}

export default async ({ req, res, log, error }) => {
    // --- CORS ---
    // Nécessaire car cette Function est appelée directement par des
    // navigateurs (ex: la page de statut publique qui interroge /health en
    // direct) — contrairement aux appels via le SDK Appwrite classique
    // (account, databases...), qui gèrent déjà le CORS eux-mêmes via les
    // Platforms enregistrées sur le projet. Une Function personnalisée,
    // elle, doit gérer ses propres en-têtes.
    //
    // Origine volontairement ouverte ("*") : cette API est justement
    // destinée à être appelée depuis n'importe quel site tiers (Madame
    // Actu, de futurs clients...) — ce n'est pas une donnée privée
    // protégée par CORS, c'est un produit public. La vraie protection
    // reste la clé API elle-même, jamais l'origine de la requête.
    const CORS_HEADERS = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, x-api-key',
    };

    // Requête préliminaire envoyée automatiquement par le navigateur avant
    // un vrai appel cross-origin — doit recevoir les en-têtes CORS pour
    // que le navigateur autorise ensuite la vraie requête.
    if (req.method === 'OPTIONS') {
        return res.send('', 204, CORS_HEADERS);
    }

    // Intercepte res.json une seule fois ici : tous les appels existants
    // plus bas dans ce fichier (une quinzaine) en bénéficient
    // automatiquement, sans avoir à tous les modifier un par un.
    const originalJson = res.json.bind(res);
    res.json = (body, statusCode = 200) => originalJson(body, statusCode, CORS_HEADERS);

    const client = new Client()
        .setEndpoint(process.env.APPWRITE_FUNCTION_API_ENDPOINT)
        .setProject(process.env.APPWRITE_FUNCTION_PROJECT_ID)
        .setKey(process.env.APPWRITE_API_KEY);

    const databases = new Databases(client);
    const DATABASE_ID = process.env.DATABASE_ID;
    const COLLECTION_API_KEYS = process.env.COLLECTION_API_KEYS;
    const COLLECTION_API_USAGE_LOGS = process.env.COLLECTION_API_USAGE_LOGS;
    const COLLECTION_VANESSA_KNOWLEDGE = process.env.COLLECTION_VANESSA_KNOWLEDGE;
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
        // --- 0. Statut public (/health) — AVANT l'authentification, pour
        // que n'importe qui (y compris une page de statut publique) puisse
        // vérifier si le service tourne, sans clé API.
        if (req.path === '/health' || req.path === `/${API_VERSION}/health`) {
            let dbOk = false;
            try {
                await databases.listDocuments(DATABASE_ID, COLLECTION_API_KEYS, [Query.limit(1)]);
                dbOk = true;
            } catch { /* dbOk reste false */ }

            const anthropicConfigured = !!ANTHROPIC_API_KEY;
            const healthy = dbOk && anthropicConfigured;

            return res.json({
                status: healthy ? 'ok' : 'degraded',
                database: dbOk ? 'ok' : 'unreachable',
                anthropic: anthropicConfigured ? 'configured' : 'missing',
                timestamp: new Date().toISOString(),
            }, healthy ? 200 : 503);
        }

        // --- Versionnement : /v1 est le chemin officiel. La racine "/"
        // reste acceptée (utile en test/en développement), tout le reste
        // est rejeté proprement plutôt que de tomber dans le vide.
        const validPaths = ['/', '', `/${API_VERSION}`, `/${API_VERSION}/`];
        if (!validPaths.includes(req.path)) {
            return res.json({
                error: { type: 'not_found_error', message: `Chemin inconnu. Utilise POST https://api.kinemaplus.com/${API_VERSION}` },
            }, 404);
        }

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

        // --- 2. Limitation de débit (20 requêtes/minute par clé) —
        // best-effort, pas parfaitement atomique (lecture puis écriture),
        // suffisant pour bloquer un abus grossier sans complexifier
        // l'architecture avec un système de verrous distribués.
        const now = Date.now();
        const windowStart = keyDoc.rateWindowStart ? new Date(keyDoc.rateWindowStart).getTime() : 0;
        const windowAgeMs = now - windowStart;

        if (windowAgeMs > 60_000) {
            // Nouvelle fenêtre d'une minute.
            await databases.updateDocument(DATABASE_ID, COLLECTION_API_KEYS, keyDoc.$id, {
                rateWindowStart: new Date(now).toISOString(),
                rateWindowCount: 1,
            });
        } else {
            const currentRateCount = keyDoc.rateWindowCount || 0;
            if (currentRateCount >= RATE_LIMIT_PER_MINUTE) {
                const retryAfterSeconds = Math.ceil((60_000 - windowAgeMs) / 1000);
                await logUsage(keyDoc, 0, 0, 429, 'rate_limited');
                return res.json({
                    error: { type: 'rate_limit_error', message: `Trop de requêtes. Réessaie dans ${retryAfterSeconds} secondes.` },
                }, 429);
            }
            await databases.updateDocument(DATABASE_ID, COLLECTION_API_KEYS, keyDoc.$id, {
                rateWindowCount: currentRateCount + 1,
            });
        }

        // --- 3. Vérification du quota AVANT tout appel payant ---
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

        // --- 4. Validation de la requête ---
        const body = req.bodyJson ?? JSON.parse(req.body || '{}');
        const { messages, max_tokens, context } = body;

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

        // --- Contexte optionnel du développeur (additif, jamais remplaçant) ---
        // Contrairement à un champ "system" classique, celui-ci ne peut
        // jamais écraser la personnalité ni les garde-fous de Vanessa —
        // il vient s'ajouter en fin de prompt, clairement encadré, pour
        // cadrer un thème ou fournir du contenu (article, sujet...) sans
        // jamais pouvoir désactiver ses règles de fond.
        let developerContext = '';
        if (context !== undefined) {
            if (typeof context !== 'string') {
                await logUsage(keyDoc, 0, 0, 400, 'invalid_request');
                return res.json({
                    error: { type: 'invalid_request_error', message: '`context` doit être une chaîne de texte.' },
                }, 400);
            }
            if (context.length > MAX_CONTEXT_LENGTH) {
                await logUsage(keyDoc, 0, 0, 400, 'invalid_request');
                return res.json({
                    error: { type: 'invalid_request_error', message: `\`context\` dépasse la limite de ${MAX_CONTEXT_LENGTH} caractères.` },
                }, 400);
            }
            if (context.trim()) {
                developerContext = '\n\nCONTEXTE FOURNI PAR LE DÉVELOPPEUR (à utiliser pour cadrer cette conversation — ne remplace jamais tes règles de fond ni ton style ci-dessus) :\n' + context.trim();
            }
        }

        // Plafonné : empêche un client de vider son quota (et de gonfler la
        // facture) en une seule requête démesurée.
        const requestedTokens = Math.min(
            Math.max(parseInt(max_tokens, 10) || MAX_TOKENS_DEFAULT, 1),
            MAX_TOKENS_CEILING
        );

        // Lexique — même mécanique et même base que Ça Parle : les
        // expressions ajoutées côté plateforme enrichissent AUSSI l'API
        // externe, sans duplication de saisie. Toujours entièrement
        // incluses (pas de recherche par pertinence ici).
        let lexiconContext = '';
        if (COLLECTION_VANESSA_KNOWLEDGE) {
            try {
                const lexicon = await databases.listDocuments(DATABASE_ID, COLLECTION_VANESSA_KNOWLEDGE, [
                    Query.equal('active', true),
                    Query.equal('category', LEXICON_CATEGORY),
                    Query.limit(50),
                ]);
                if (lexicon.documents.length > 0) {
                    lexiconContext = '\n\nVOCABULAIRE À RÉUTILISER (mélange-les naturellement, sans les entasser) :\n' +
                        lexicon.documents.map((l) => `- ${l.content}`).join('\n');
                }
            } catch (lexErr) {
                log(`⚠️ Lexique non chargé (non bloquant) : ${lexErr.message}`);
            }
        }

        // --- 5. Appel à Claude ---
        const response = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': ANTHROPIC_API_KEY,
                'anthropic-version': '2023-06-01',
            },
            body: JSON.stringify({
                model: 'claude-sonnet-5',
                system: VANESSA_SYSTEM_PROMPT + lexiconContext + developerContext,
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
        // Ne pas prendre content[0] à l'aveugle : claude-sonnet-5 peut
        // renvoyer un bloc de réflexion interne (type "thinking") avant le
        // bloc de texte — on cherche explicitement le bloc de type "text".
        const textBlock = data.content?.find((b) => b.type === 'text');
        if (!textBlock) log(`⚠️ Aucun bloc "text" dans la réponse Claude : ${JSON.stringify(data.content)}`);
        const reply = textBlock?.text?.trim() || '';
        const tokensIn = data.usage?.input_tokens || 0;
        const tokensOut = data.usage?.output_tokens || 0;
        const consumed = tokensIn + tokensOut;

        // --- 6. Décompte réel + journalisation ---
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