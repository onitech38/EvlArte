export default {
  async fetch(request) {
    // CORS preflight
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
    if (!target) {
      return new Response('Missing url param', { status: 400 });
    }

    // Clonar método, headers e body
    const init = {
      method: request.method,
      headers: request.headers,
    };

    if (request.method !== 'GET' && request.method !== 'HEAD') {
      init.body = await request.arrayBuffer();
    }

    const resp = await fetch(target, init);

    // Copiar headers e adicionar CORS
    const headers = new Headers(resp.headers);
    headers.set('Access-Control-Allow-Origin', '*');

    return new Response(resp.body, {
      status: resp.status,
      headers,
    });
  },
};
