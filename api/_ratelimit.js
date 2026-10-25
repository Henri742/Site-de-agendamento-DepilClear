// api/_ratelimit.js
// Rate limit compatível com serverless.
//  - Com UPSTASH_REDIS_REST_URL e UPSTASH_REDIS_REST_TOKEN: contador compartilhado entre instâncias (recomendado).
//  - Sem Upstash: fallback em memória, com TTL e teto de tamanho.
//    LIMITAÇÃO: na Vercel cada instância tem a sua própria memória (e ela some a cada cold start),
//    então o limite em memória é "melhor esforço" e pode ser contornado por quem cai em instâncias diferentes.
//    Para proteção real contra força bruta, configure o Upstash.
const MAX_MEM_ENTRIES = 5000;
const mem = new Map(); // key -> { count, expiresAt }

const UPSTASH_URL = process.env.UPSTASH_REDIS_REST_URL;
const UPSTASH_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;
const useUpstash = Boolean(UPSTASH_URL && UPSTASH_TOKEN);

async function upstash(command) {
  const res = await fetch(UPSTASH_URL, {
    method: 'POST',
    headers: { Authorization: `Bearer ${UPSTASH_TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(command)
  });
  if (!res.ok) throw new Error(`Upstash HTTP ${res.status}`);
  const json = await res.json();
  return json.result;
}

function memPurge(now) {
  if (mem.size < 500) return;
  for (const [k, v] of mem) if (v.expiresAt <= now) mem.delete(k);
  while (mem.size > MAX_MEM_ENTRIES) mem.delete(mem.keys().next().value); // descarta os mais antigos
}

// Soma 1 ao contador (janela fixa que começa na 1ª ocorrência). Retorna { count, ttlSec }.
export async function rlIncr(key, windowSec) {
  if (useUpstash) {
    try {
      const count = Number(await upstash(['INCR', key]));
      if (count === 1) await upstash(['EXPIRE', key, String(windowSec)]);
      const ttl = Number(await upstash(['TTL', key]));
      return { count, ttlSec: ttl > 0 ? ttl : windowSec };
    } catch (err) {
      console.error('[RATELIMIT] Upstash indisponível, usando memória:', err.message);
    }
  }
  const now = Date.now();
  memPurge(now);
  let rec = mem.get(key);
  if (!rec || rec.expiresAt <= now) rec = { count: 0, expiresAt: now + windowSec * 1000 };
  rec.count += 1;
  mem.set(key, rec);
  return { count: rec.count, ttlSec: Math.max(1, Math.ceil((rec.expiresAt - now) / 1000)) };
}

// Lê sem incrementar. Retorna { count, ttlSec }.
export async function rlStatus(key) {
  if (useUpstash) {
    try {
      const count = Number(await upstash(['GET', key]) || 0);
      const ttl = count ? Number(await upstash(['TTL', key])) : 0;
      return { count, ttlSec: ttl > 0 ? ttl : 0 };
    } catch (err) {
      console.error('[RATELIMIT] Upstash indisponível, usando memória:', err.message);
    }
  }
  const now = Date.now();
  const rec = mem.get(key);
  if (!rec || rec.expiresAt <= now) { mem.delete(key); return { count: 0, ttlSec: 0 }; }
  return { count: rec.count, ttlSec: Math.max(1, Math.ceil((rec.expiresAt - now) / 1000)) };
}

export async function rlReset(key) {
  if (useUpstash) {
    try { await upstash(['DEL', key]); return; } catch (err) { console.error('[RATELIMIT] Upstash:', err.message); }
  }
  mem.delete(key);
}

export function getClientIp(req) {
  const fwd = req.headers['x-forwarded-for'];
  const first = (Array.isArray(fwd) ? fwd[0] : (fwd || '')).split(',')[0].trim();
  return first || req.socket?.remoteAddress || 'unknown';
}

// Limite simples por IP (ex.: 30 req/min). Responde 429 e retorna false quando estoura.
export async function rateLimit(req, res, { name, limit = 30, windowSec = 60 }) {
  const { count, ttlSec } = await rlIncr(`rl:${name}:${getClientIp(req)}`, windowSec);
  if (count > limit) {
    res.setHeader('Retry-After', String(ttlSec));
    res.status(429).json({ erro: 'Muitas requisições. Aguarde um instante e tente novamente.' });
    return false;
  }
  return true;
}
