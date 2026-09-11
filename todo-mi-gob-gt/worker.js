function getContentType(pathname) {
  const ext = pathname.split('.').pop()?.toLowerCase();
  switch (ext) {
    case 'webp': return 'image/webp';
    case 'jpg':
    case 'jpeg': return 'image/jpeg';
    case 'png': return 'image/png';
    case 'svg': return 'image/svg+xml';
    case 'gif': return 'image/gif';
    case 'avif': return 'image/avif';
    case 'json': return 'application/json; charset=utf-8';
    default: return 'application/octet-stream';
  }
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // Servir en tiempo real desde el Bucket R2
    if (url.pathname === '/noticias.json' || url.pathname === '/api/noticias') {
      if (request.method === 'OPTIONS') {
        return new Response(null, {
          status: 204,
          headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
            'Access-Control-Allow-Headers': '*',
            'Access-Control-Max-Age': '86400',
          },
        });
      }

      try {
        if (env.DB) {
          const object = await env.DB.get('noticias.json');
          if (object) {
            const headers = new Headers();
            object.writeHttpMetadata(headers);
            headers.set('etag', object.httpEtag);
            headers.set('Content-Type', 'application/json; charset=utf-8');
            headers.set('Access-Control-Allow-Origin', '*');
            headers.set('Cache-Control', 'no-cache, no-store, must-revalidate');
            return new Response(object.body, { headers });
          }
        }
      } catch (err) {
        console.error('Error consultando R2:', err);
      }

      // Fallback a URL pública de R2
      try {
        const r2Res = await fetch('https://pub-b246f9594b0f4cb5960b8f6ec9f1ba2b.r2.dev/noticias.json', {
          cache: 'no-cache',
        });
        if (r2Res.ok) {
          const data = await r2Res.text();
          return new Response(data, {
            headers: {
              'Content-Type': 'application/json; charset=utf-8',
              'Access-Control-Allow-Origin': '*',
              'Cache-Control': 'no-cache, no-store, must-revalidate',
            },
          });
        }
      } catch (e) {}
    }

    // Servir imágenes y recursos multimedia desde el Bucket R2
    const isImageOrBucketAsset =
      url.pathname.startsWith('/r2/') ||
      url.pathname.startsWith('/images/') ||
      url.pathname.startsWith('/media/') ||
      url.pathname.startsWith('/bucket/');

    if (isImageOrBucketAsset) {
      if (request.method === 'OPTIONS') {
        return new Response(null, {
          status: 204,
          headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
            'Access-Control-Allow-Headers': '*',
            'Access-Control-Max-Age': '86400',
          },
        });
      }

      let key = url.pathname.replace(/^\/(?:r2|bucket)\//, '');
      if (key.startsWith('/')) key = key.slice(1);

      try {
        if (env.DB) {
          const object = await env.DB.get(key);
          if (object) {
            const headers = new Headers();
            object.writeHttpMetadata(headers);
            headers.set('etag', object.httpEtag);
            headers.set('Content-Type', getContentType(key));
            headers.set('Access-Control-Allow-Origin', '*');
            headers.set('Cache-Control', 'public, max-age=86400, stale-while-revalidate=3600');
            return new Response(object.body, { headers });
          }
        }
      } catch (err) {
        console.error(`Error consultando R2 para imagen ${key}:`, err);
      }

      // Fallback a URL pública de R2
      try {
        const r2Url = `https://pub-b246f9594b0f4cb5960b8f6ec9f1ba2b.r2.dev/${key}`;
        const r2Res = await fetch(r2Url);
        if (r2Res.ok) {
          const resHeaders = new Headers(r2Res.headers);
          resHeaders.set('Access-Control-Allow-Origin', '*');
          resHeaders.set('Cache-Control', 'public, max-age=86400, stale-while-revalidate=3600');
          if (!resHeaders.has('Content-Type')) {
            resHeaders.set('Content-Type', getContentType(key));
          }
          return new Response(r2Res.body, {
            status: r2Res.status,
            headers: resHeaders,
          });
        }
      } catch (e) {}
    }

    // Servir los archivos estáticos de la web
    return env.ASSETS.fetch(request);
  },
};
