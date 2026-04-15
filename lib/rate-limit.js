import { Redis } from '@upstash/redis';
import { Ratelimit } from '@upstash/ratelimit';

const ROUTE_NAMES = {
  checkout:  'create-checkout-session',
  plan:      'generate-plan',
  subscribe: 'subscribe',
};

const CONFIGS = {
  checkout:  { limit: 1,  window: '60 s' },
  plan:      { limit: 5,  window: '60 s' },
  subscribe: { limit: 3,  window: '60 s' },
};

let limiters = null;

function getLimiters() {
  if (limiters) return limiters;

  const url   = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!url || !token) {
    console.warn('[rate-limit] UPSTASH_REDIS_REST_URL / TOKEN not set — rate limiting disabled');
    return null;
  }

  const redis = new Redis({ url, token });

  limiters = Object.fromEntries(
    Object.entries(CONFIGS).map(([route, { limit, window }]) => [
      route,
      new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(limit, window), prefix: `rl:${route}` }),
    ])
  );

  return limiters;
}

/**
 * Check rate limit for a given route and key.
 * @param {'checkout'|'plan'|'subscribe'} route
 * @param {string} key  — user id (preferred) or IP fallback
 * @returns {{ blocked: boolean }}
 */
export async function checkRateLimit(route, key) {
  const map = getLimiters();
  if (!map) return { blocked: false };

  const limiter = map[route];
  if (!limiter) return { blocked: false };

  const { success } = await limiter.limit(key);
  if (!success) {
    console.log(`[rate-limit] blocked route=/api/${ROUTE_NAMES[route] ?? route} key=${key}`);
  }
  return { blocked: !success };
}
