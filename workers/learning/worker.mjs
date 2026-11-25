import { earned } from './score.mjs';
const uuid = /^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/;
const str = value => ({ stringValue: value });
const integer = value => ({ integerValue: String(value) });
const stamp = () => ({ timestampValue: new Date().toISOString() });
const utf8 = new TextEncoder();
const b64 = bytes => btoa(String.fromCharCode(...bytes)).replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/, '');
const segment = value => b64(utf8.encode(JSON.stringify(value)));

async function serviceToken(env, fetcher) {
  const account = JSON.parse(env.FIREBASE_SERVICE_ACCOUNT);
  const now = Math.floor(Date.now() / 1000);
  const header = segment({ alg: 'RS256', typ: 'JWT' });
  const body = segment({ iss: account.client_email, aud: 'https://oauth2.googleapis.com/token', iat: now, exp: now + 600,
    scope: 'https://www.googleapis.com/auth/datastore' });
  const signatureInput = header + '.' + body;
  const pem = account.private_key.replace(/-----[^-]+-----|\s+/g, '');
  const key = await crypto.subtle.importKey('pkcs8', Uint8Array.from(atob(pem), char => char.charCodeAt(0)),
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['sign']);
  const signature = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', key, utf8.encode(signatureInput));
  const response = await fetcher('https://oauth2.googleapis.com/token', { method: 'POST', body: new URLSearchParams({
    grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion: signatureInput + '.' + b64(new Uint8Array(signature)),
  }) });
  if (!response.ok) throw new Error('Service authentication failed');
  return (await response.json()).access_token;
}

const create = (name, fields) => ({ update: { name, fields }, currentDocument: { exists: false } });
export function handler(fetcher = fetch, token = serviceToken) {
  return { async fetch(request, env) {
    const origin = request.headers.get('Origin');
    if (!origin || !env.ALLOWED_ORIGINS?.split(',').map(x => x.trim()).includes(origin)) return new Response(null, { status: 403 });
    const headers = { 'Access-Control-Allow-Origin': origin, 'Access-Control-Allow-Headers': 'Authorization, Content-Type',
      'Access-Control-Allow-Methods': 'POST, OPTIONS', 'Cache-Control': 'no-store', Vary: 'Origin' };
    const json = (data, status = 200) => Response.json(data, { status, headers });
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers });
    const route = new URL(request.url).pathname;
    if (request.method !== 'POST' || !['/verify', '/appeal'].includes(route)) return json({}, 404);
    const idToken = request.headers.get('Authorization')?.match(/^Bearer (\S+)$/)?.[1];
    if (!idToken) return json({}, 401);
    try {
      const auth = await fetcher('https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=' + encodeURIComponent(env.FIREBASE_API_KEY), {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ idToken }),
      });
      if (auth.status === 400 || auth.status === 401) return json({}, 401);
      if (!auth.ok) return json({}, 503);
      const user = (await auth.json()).users?.[0];
      if (!user?.localId || user.disabled || user.localId.includes('/')) return json({}, 401);
      const raw = await request.text();
      if (raw.length > 50000) return json({}, 413);
      let input;
      try { input = JSON.parse(raw); } catch { return json({}, 400); }
      if (!input || typeof input.id !== 'string' || !uuid.test(input.id)) return json({}, 400);
      const document = 'projects/' + env.FIREBASE_PROJECT_ID + '/databases/(default)/documents';
      const root = document + '/users/' + encodeURIComponent(user.localId);
      const endpoint = 'https://firestore.googleapis.com/v1/';
      const bearer = await token(env, fetcher);
      const call = (path, body) => fetcher(endpoint + path, { method: body ? 'POST' : 'GET',
        headers: { Authorization: 'Bearer ' + bearer, 'Content-Type': 'application/json' }, body: body && JSON.stringify(body) });
      const path = root + '/verifiedSessions/' + input.id;
      const existing = await call(path);
      const saved = existing.ok ? (await existing.json()).fields : null;
      if (!saved && existing.status !== 404) return json({}, 503);
      const result = fields => ({ status: fields.status.stringValue, points: Number(fields.points.integerValue), xp: Number(fields.xp.integerValue) });
      if (route === '/appeal') {
        if (saved?.status.stringValue !== 'mismatch' || typeof input.reason !== 'string' || !input.reason.trim() || input.reason.length > 300) return json({}, 400);
        const day = new Date().toISOString().slice(0, 10);
        for (let slot = 0; slot < 3; slot++) {
          const response = await call(document + ':commit', { writes: [
            create(root + '/verificationAppeals/' + input.id, { sessionId: str(input.id), uid: str(user.localId), reason: str(input.reason.trim()), createdAt: stamp() }),
            create(root + '/verificationAppealSlots/' + day + '_' + slot, { createdAt: stamp() }),
          ] });
          if (response.ok) return json({ status: 'received' });
          if (![400, 409].includes(response.status) || (await response.json()).error?.status !== 'ALREADY_EXISTS') return json({}, 503);
          if ((await call(root + '/verificationAppeals/' + input.id)).ok) return json({ status: 'received' });
        }
        return json({}, 429);
      }
      if (saved) return json(result(saved));
      const ids = input.attempts;
      if (!Array.isArray(ids) || ids.length < 1 || ids.length > 400 || new Set(ids).size !== ids.length ||
        !ids.every(id => typeof id === 'string' && /^(math|english)-[a-zA-Z0-9_-]{1,100}$/.test(id)) ||
        !Number.isSafeInteger(input.points) || !Number.isSafeInteger(input.xp)) return json({}, 400);
      const paths = ids.map(id => root + '/learning/' + id);
      const reads = await call(document + ':batchGet', { documents: paths });
      if (!reads.ok) return json({}, 503);
      const rows = await reads.json();
      const found = new Map(rows.filter(row => row.found).map(row => [row.found.name, row.found.fields.result?.stringValue]));
      if (paths.some(name => !found.has(decodeURI(name)))) return json({}, 503);
      const totals = earned(paths.map(name => found.get(decodeURI(name))));
      const status = totals.points === input.points && totals.xp === input.xp ? 'accepted' : 'mismatch';
      const fields = { status: str(status), points: integer(status === 'accepted' ? totals.points : 0),
        xp: integer(status === 'accepted' ? totals.xp : 0), createdAt: stamp() };
      const writes = [create(path, fields)];
      if (status === 'accepted') {
        for (const id of ids) writes.push(create(root + '/verifiedAttempts/' + id, { sessionId: str(input.id) }));
        writes.push({
          update: { name: root + '/harueum/learningTotals', fields: { updatedAt: stamp() } },
          updateMask: { fieldPaths: ['updatedAt'] },
          updateTransforms: [
            { fieldPath: 'points', increment: integer(totals.points) }, { fieldPath: 'xp', increment: integer(totals.xp) },
          ],
        });
      }
      const response = await call(document + ':commit', { writes });
      if (response.ok) return json(result(fields));
      const prior = await call(path);
      if (prior.ok) return json(result((await prior.json()).fields));
      return json({}, 503);
    } catch { return json({}, 503); }
  } };
}

export default handler();
