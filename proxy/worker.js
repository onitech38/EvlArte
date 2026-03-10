// EvlArte — worker.js (v2.0)
// Injeta tokens conforme o destino:
//   - huggingface.co → HF_TOKEN (mantido por compatibilidade)
//   - gen.pollinations.ai → POLLINATIONS_TOKEN

export default {
  async fetch(request, env) {

    // Preflight CORS
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET,POST,PUT,PATCH,DELETE,OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        },
      });
    }

    const url = new URL(request.url);
    const target = url.searchParams.get('url');
    if (!target) return new Response('Missing url param', { status: 400 });

    const headers = new Headers(request.headers);
    // Remove o header Host para evitar conflitos
    headers.delete('host');

    // Injetar token conforme destino
    if (target.includes('huggingface.co') && env.HF_TOKEN) {
      headers.set('Authorization', `Bearer ${env.HF_TOKEN}`);
    }
    if (target.includes('gen.pollinations.ai') && env.POLLINATIONS_TOKEN) {
      headers.set('Authorization', `Bearer ${env.POLLINATIONS_TOKEN}`);
    }

    const init = { method: request.method, headers };
    if (request.method !== 'GET' && request.method !== 'HEAD') {
      init.body = await request.arrayBuffer();
    }

    const resp = await fetch(target, init);
    const respHeaders = new Headers(resp.headers);
    respHeaders.set('Access-Control-Allow-Origin', '*');

    return new Response(resp.body, {
      status: resp.status,
      headers: respHeaders,
    });
  },
};
