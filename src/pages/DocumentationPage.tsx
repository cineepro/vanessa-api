// src/pages/DocumentationPage.tsx — Vanessa API Platform
import { TopNav } from '@/components/layout/TopNav';
import { VANESSA_API_URL } from '@/api/constants';

const CodeBlock = ({ children }: { children: string }) => (
    <pre className="bg-gray-900 text-gray-200 rounded-2xl p-5 overflow-x-auto text-xs font-mono leading-relaxed my-4">
        {children}
    </pre>
);

export default function DocumentationPage() {
    const apiUrl = VANESSA_API_URL || 'https://api.kinemaplus.com';

    return (
        <div className="min-h-screen bg-gray-50">
            <TopNav />
            <div className="max-w-3xl mx-auto px-4 py-12 space-y-10">
                <div>
                    <h1 className="text-3xl font-bold text-gray-800">Documentation</h1>
                    <p className="text-gray-500 mt-2">Tout ce qu'il faut pour intégrer Vanessa dans votre projet.</p>
                </div>

                <section>
                    <h2 className="text-lg font-bold text-gray-800 mb-2">Authentification</h2>
                    <p className="text-sm text-gray-600">
                        Chaque requête doit inclure votre clé API dans l'en-tête <code className="bg-gray-100 px-1.5 py-0.5 rounded text-xs">x-api-key</code>.
                        Récupérez votre clé depuis votre <a href="/console" className="text-brand font-semibold hover:underline">console développeur</a>.
                    </p>
                </section>

                <section>
                    <h2 className="text-lg font-bold text-gray-800 mb-2">Point d'accès</h2>
                    <CodeBlock>{`POST ${apiUrl}`}</CodeBlock>
                </section>

                <section>
                    <h2 className="text-lg font-bold text-gray-800 mb-2">Requête</h2>
                    <p className="text-sm text-gray-600 mb-2">
                        Un tableau de messages, comme sur la plupart des API conversationnelles. Le premier message doit
                        avoir le rôle <code className="bg-gray-100 px-1 rounded text-xs">user</code>.
                    </p>
                    <CodeBlock>{`{
  "messages": [
    { "role": "user", "content": "Salut Vanessa, comment ça va ?" }
  ],
  "context": "..."     // optionnel, voir section dédiée ci-dessous
  "max_tokens": 300     // optionnel, 300 par défaut, 1024 maximum
}`}</CodeBlock>
                </section>

                <section>
                    <h2 className="text-lg font-bold text-gray-800 mb-2">Le champ <code className="bg-gray-100 px-1.5 py-0.5 rounded text-base">context</code> — cadrer une conversation</h2>
                    <p className="text-sm text-gray-600 mb-2">
                        Un texte libre (2000 caractères maximum) qui vient s'ajouter aux instructions de Vanessa — pour
                        cadrer une conversation autour d'un thème, ou fournir du contenu qu'elle ne connaît pas
                        autrement (un article, un sujet précis...).
                    </p>
                    <p className="text-sm text-gray-600 mb-2">
                        <strong>Ce n'est pas un champ "system" classique</strong> : il ne peut jamais remplacer ni
                        désactiver le ton, le style ou les garde-fous de Vanessa — il s'ajoute simplement en complément.
                        C'est ce qui garantit que Vanessa reste elle-même, avec sa personnalité et ses limites de
                        sécurité intactes, quel que soit le site ou l'application où elle est intégrée.
                    </p>
                    <CodeBlock>{`{
  "messages": [
    { "role": "user", "content": "Raconte-moi une histoire" }
  ],
  "context": "Cadre toutes tes réponses autour du thème jeunes & aventures."
}`}</CodeBlock>
                </section>

                <section>
                    <h2 className="text-lg font-bold text-gray-800 mb-2">Réponse</h2>
                    <CodeBlock>{`{
  "reply": "Wèèh ça va, et toi ? 👀",
  "usage": {
    "input_tokens": 24,
    "output_tokens": 18,
    "total_tokens": 42,
    "tokens_remaining": 999958
  }
}`}</CodeBlock>
                </section>

                <section>
                    <h2 className="text-lg font-bold text-gray-800 mb-2">Exemple — cURL</h2>
                    <CodeBlock>{`curl ${apiUrl} \\
  -H "x-api-key: cp_live_votre_cle" \\
  -H "Content-Type: application/json" \\
  -d '{
    "messages": [
      { "role": "user", "content": "Raconte-moi un ragot" }
    ]
  }'`}</CodeBlock>
                </section>

                <section>
                    <h2 className="text-lg font-bold text-gray-800 mb-2">Exemple — JavaScript</h2>
                    <CodeBlock>{`const response = await fetch("${apiUrl}", {
  method: "POST",
  headers: {
    "x-api-key": "cp_live_votre_cle",
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    messages: [{ role: "user", content: "Salut Vanessa !" }],
  }),
});

const data = await response.json();
console.log(data.reply);`}</CodeBlock>
                </section>

                <section>
                    <h2 className="text-lg font-bold text-gray-800 mb-2">Exemple — Python</h2>
                    <CodeBlock>{`import requests

response = requests.post(
    "${apiUrl}",
    headers={"x-api-key": "cp_live_votre_cle"},
    json={"messages": [{"role": "user", "content": "Salut Vanessa !"}]},
)

print(response.json()["reply"])`}</CodeBlock>
                </section>

                <section>
                    <h2 className="text-lg font-bold text-gray-800 mb-2">Conserver l'historique d'une conversation</h2>
                    <p className="text-sm text-gray-600 mb-2">
                        L'API est sans état : c'est à vous de renvoyer l'historique complet à chaque appel pour que
                        Vanessa garde le contexte, en alternant les rôles <code className="bg-gray-100 px-1 rounded text-xs">user</code> et <code className="bg-gray-100 px-1 rounded text-xs">assistant</code>.
                    </p>
                    <CodeBlock>{`{
  "messages": [
    { "role": "user", "content": "Salut Vanessa !" },
    { "role": "assistant", "content": "Wèèh ça va, et toi ? 👀" },
    { "role": "user", "content": "Ça va, dis-moi un truc drôle" }
  ]
}`}</CodeBlock>
                </section>

                <section>
                    <h2 className="text-lg font-bold text-gray-800 mb-2">Erreurs</h2>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left border-collapse">
                            <thead>
                                <tr className="border-b border-gray-200 text-gray-400 text-xs uppercase">
                                    <th className="py-2 pr-4">Code</th>
                                    <th className="py-2">Signification</th>
                                </tr>
                            </thead>
                            <tbody className="text-gray-600">
                                <tr className="border-b border-gray-100">
                                    <td className="py-2 pr-4 font-mono text-xs">401</td>
                                    <td className="py-2">Clé API manquante ou invalide</td>
                                </tr>
                                <tr className="border-b border-gray-100">
                                    <td className="py-2 pr-4 font-mono text-xs">403</td>
                                    <td className="py-2">Clé en attente de validation ou suspendue</td>
                                </tr>
                                <tr className="border-b border-gray-100">
                                    <td className="py-2 pr-4 font-mono text-xs">429</td>
                                    <td className="py-2">Quota de tokens épuisé — rechargez depuis la console</td>
                                </tr>
                                <tr>
                                    <td className="py-2 pr-4 font-mono text-xs">400</td>
                                    <td className="py-2">Requête mal formée (voir le message d'erreur retourné)</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </section>
            </div>
        </div>
    );
}