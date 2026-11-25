const endpoints = 'https://open.neis.go.kr/hub/';
const dayPattern = /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/;

function dayValue(day) {
  if (!day || !dayPattern.test(day)) return NaN;
  const value = new Date(day + 'T00:00:00Z');
  return !Number.isNaN(value.valueOf()) && value.toISOString().slice(0, 10) === day ? value.valueOf() : NaN;
}

async function neis(endpoint, parameters, env) {
  const search = new URLSearchParams({ KEY: env.NEIS_API_KEY, Type: 'json', pIndex: '1', pSize: '1000', ...parameters });
  const response = await fetch(endpoints + endpoint + '?' + search);
  if (!response.ok) throw new Error('NEIS request failed');
  const data = await response.json();
  if (data.RESULT?.CODE === 'INFO-200') return [];
  const rows = data[endpoint]?.find(entry => Array.isArray(entry.row))?.row;
  if (!rows) throw new Error('NEIS response invalid');
  return rows;
}
const isoDate = value => value?.replace(/^(\d{4})(\d{2})(\d{2})$/, '$1-$2-$3');

async function agenda(env, school, grade, room, start, end) {
  const schools = await neis('schoolInfo', { SD_SCHUL_CODE: school }, env);
  const region = schools.find(item => item.SD_SCHUL_CODE === school)?.ATPT_OFCDC_SC_CODE;
  if (!region) return null;
  const scope = { ATPT_OFCDC_SC_CODE: region, SD_SCHUL_CODE: school };
  const from = start.replaceAll('-', '');
  const to = end.replaceAll('-', '');
  const sources = await Promise.allSettled([
    neis('hisTimetable', { ...scope, GRADE: grade, CLASS_NM: room, TI_FROM_YMD: from, TI_TO_YMD: to }, env),
    neis('mealServiceDietInfo', { ...scope, MLSV_FROM_YMD: from, MLSV_TO_YMD: to, MMEAL_SC_CODE: '2' }, env),
    neis('SchoolSchedule', { ...scope, AA_FROM_YMD: from, AA_TO_YMD: to }, env),
  ]);
  const types = ['timetable', 'meal', 'school'];
  const events = [];
  const errors = [];
  for (const [index, source] of sources.entries()) {
    if (source.status === 'rejected') { errors.push(types[index]); continue; }
    source.value.forEach((item, offset) => {
      const fields = index === 0
        ? { day: isoDate(item.ALL_TI_YMD), title: item.ITRT_CNTNT, note: '', kind: 'class', period: Number(item.PERIO) || undefined }
        : index === 1 ? { day: isoDate(item.MLSV_YMD), title: '급식 · 점심', note: (item.DDISH_NM || '').replace(/<br\s*\/?>/gi, '\n'), kind: 'lunch' }
          : { day: isoDate(item.AA_YMD), title: item.EVENT_NM, note: item.EVENT_CNTNT || '', kind: 'personal' };
      if (!fields.day || fields.day < start || fields.day > end || !fields.title) return;
      events.push({ ...fields, id: types[index] + ':' + fields.day + ':' + offset, start: '', end: '', subject: '', source: types[index] });
    });
  }
  return { events, errors };
}

export default {
  async fetch(request, env, context) {
    const url = new URL(request.url);
    const origin = request.headers.get('Origin');
    const allowed = env.ALLOWED_ORIGINS?.split(',').map(value => value.trim()) ?? [];
    if (!origin || !allowed.includes(origin)) return new Response(null, { status: 403 });
    const headers = { 'Access-Control-Allow-Origin': origin, Vary: 'Origin' };
    const json = (payload, status = 200) => Response.json(payload, { status, headers });
    if (request.method !== 'GET' || url.pathname !== '/v1/agenda') return json({ error: 'Not found' }, 404);
    if (!env.NEIS_RATE_LIMIT) return json({ error: 'Rate limiter unavailable' }, 503);
    const ip = request.headers.get('CF-Connecting-IP') || 'unknown';
    if (!(await env.NEIS_RATE_LIMIT.limit({ key: ip })).success) return json({ error: 'Too many requests' }, 429);
    if (!env.NEIS_API_KEY) return json({ error: 'Service unavailable' }, 503);

    const [school, grade, room, start, end] = ['school', 'grade', 'room', 'start', 'end'].map(key => url.searchParams.get(key) ?? '');
    const duration = dayValue(end) - dayValue(start);
    if (!/^\d{7}$/.test(school) || !/^[1-3]$/.test(grade) || !/^(?:[1-9]|[1-4]\d|50)$/.test(room)
      || !Number.isFinite(duration) || duration < 0 || duration > 30 * 86_400_000) return json({ error: 'Invalid schedule range' }, 400);
    const cacheKey = new URL(url.origin + '/cache/neis/v1');
    cacheKey.search = new URLSearchParams({ school, grade, room, start, end, origin }).toString();
    try {
      const cached = await caches.default.match(cacheKey);
      if (cached) return cached;
      const result = await agenda(env, school, grade, room, start, end);
      if (!result) return json({ error: 'School not found' }, 404);
      const response = json(result);
      if (!result.errors.length) {
        response.headers.set('Cache-Control', 'public, max-age=300, s-maxage=3600');
        context.waitUntil(caches.default.put(cacheKey, response.clone()).catch(() => {}));
      }
      return response;
    } catch {
      return json({ error: 'School data unavailable' }, 502);
    }
  },
};
