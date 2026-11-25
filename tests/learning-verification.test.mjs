import { test } from 'node:test';
import assert from 'node:assert/strict';
import { handler } from '../workers/learning/worker.mjs';

test('session totals use stored attempts and mismatches, outages, retries and appeals stay separate', async () => {
  const saved = new Map();
  let totalXp = 0;
  let offline = false;
  const worker = handler(async (url, options) => {
    if (url.includes('identitytoolkit')) return Response.json({ users: [{ localId: 'tester' }] });
    const path = url.slice(url.indexOf('/v1/projects/') + 4);
    if (path.endsWith(':batchGet')) {
      if (offline) return Response.json({}, { status: 503 });
      return Response.json(JSON.parse(options.body).documents.map(name => ({ found: { name, fields: { result: { stringValue: 'correct' } } } })));
    }
    if (path.endsWith(':commit')) {
      const { writes } = JSON.parse(options.body);
      if (writes.some(item => item.currentDocument && saved.has(item.update.name))) return Response.json({ error: { status: 'ALREADY_EXISTS' } }, { status: 409 });
      writes.forEach(item => {
        if (item.updateTransforms) totalXp += Number(item.updateTransforms.find(field => field.fieldPath === 'xp').increment.integerValue);
        else saved.set(item.update.name, item.update.fields);
      });
      return Response.json({});
    }
    return saved.has(path) ? Response.json({ fields: saved.get(path) }) : Response.json({}, { status: 404 });
  }, async () => 'service-token');
  const env = { ALLOWED_ORIGINS: 'https://test.example', FIREBASE_PROJECT_ID: 'test' };
  const ask = (route, body) => worker.fetch(new Request('https://worker.example' + route, {
    method: 'POST', headers: { Origin: 'https://test.example', Authorization: 'Bearer tester' }, body: JSON.stringify(body),
  }), env);
  const a = { id: 'aaaa0000-0000-0000-0000-000000000000', attempts: ['math-one'], points: 7, xp: 7 };
  assert.equal((await (await ask('/verify', a)).json()).status, 'mismatch');
  assert.equal((await ask('/appeal', { id: a.id, reason: '결과를 확인해 주세요.' })).status, 200);
  assert.equal((await ask('/appeal', { id: a.id, reason: '중복 요청' })).status, 200);
  assert.equal([...saved.keys()].filter(key => key.includes('/verificationAppeals/')).length, 1);
  const b = { ...a, id: 'bbbb0000-0000-0000-0000-000000000000', attempts: ['math-two'], points: 3, xp: 4 };
  offline = true;
  assert.equal((await ask('/verify', b)).status, 503);
  offline = false;
  assert.deepEqual(await (await ask('/verify', b)).json(), { status: 'accepted', points: 3, xp: 4 });
  assert.equal((await (await ask('/verify', b)).json()).status, 'accepted');
  assert.equal(totalXp, 4);
  assert.equal((await ask('/verify', { ...b, id: 'cccc0000-0000-0000-0000-000000000000' })).status, 503);
});
