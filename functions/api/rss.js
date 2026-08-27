/* ============================================================
 * JifaWork · /api/rss —— 同源 RSS 代理（Pages Function）
 * 原因：第三方 CORS 代理（allorigins）已失效，浏览器直连
 *       各资讯站会被跨域拦截。改为站内同源代理，无跨域问题。
 * 安全：仅允许白名单内的域名，防止被当作开放代理滥用。
 * ============================================================ */

const ALLOWED_HOSTS = new Set([
  'www.jiqizhixin.com',
  'www.qbitai.com',
  'openai.com',
  'deepmind.google',
  'www.theverge.com',
  'www.youtube.com',
  'youtube.com',
]);

function json(obj, status) {
  return new Response(JSON.stringify(obj), {
    status: status || 200,
    headers: { 'content-type': 'application/json; charset=utf-8' },
  });
}

export async function onRequestGet({ request }) {
  const u = new URL(request.url);
  const target = u.searchParams.get('url');
  if (!target) return json({ error: 'missing url' }, 400);

  let t;
  try { t = new URL(target); } catch (e) { return json({ error: 'invalid url' }, 400); }
  if (t.protocol !== 'https:' && t.protocol !== 'http:') return json({ error: 'bad protocol' }, 400);
  if (!ALLOWED_HOSTS.has(t.hostname)) return json({ error: 'host not allowed' }, 403);

  const r = await fetch(target, {
    headers: {
      'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126 Safari/537.36',
      'accept': 'application/rss+xml, application/atom+xml, application/xml, text/xml, text/html, */*',
    },
    redirect: 'follow',
  });

  const body = await r.text();
  return new Response(body, {
    status: r.status,
    headers: {
      'content-type': r.headers.get('content-type') || 'text/xml; charset=utf-8',
      'cache-control': 'public, max-age=600',
    },
  });
}
