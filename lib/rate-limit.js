import { Redis } from '@upstash/redis';
import { Ratelimit } from '@upstash/ratelimit';

const redis = new Redis({
  url:   process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

// Pre-configured limiters per route
const limiters = {
  checkout: new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(1,  '60 s'), prefix: 'rl:checkout' }),
  plan:     new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(5,  '60 s'), prefix: 'rl:plan' }),
  subscribe: new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(3, '60 s'), prefix: 'rl:subscribe' }),
};

/**
 * Check rate limit for a given route and key.
 * @param {'checkout'|'plan'|'subscribe'} route
 * @param {string} key  — user id (preferred) or IP fallback
 * @returns {{ blocked: boolean }}
 */
export async function checkRateLimit(route, key) {
  const limiter = limiters[route];
  if (!limiter) return { blocked: false };

  const { success } = await limiter.limit(key);
  if (!success) {
    console.log(`[rate-limit] blocked route=/api/${route === 'checkout' ? 'create-checkout-session' : route === 'plan' ? 'generate-plan' : 'subscribe'} key=${key}`);
  }
  return { blocked: !success };
}
