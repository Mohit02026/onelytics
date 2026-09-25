import { Redis } from 'ioredis';

const globalForRedis = global as unknown as { redis: Redis };

const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379'

export const redis =
  globalForRedis.redis ||
  new Redis(redisUrl, {
    // Required by BullMQ's Worker (uses blocking commands) — safe for the
    // simple get/set usage elsewhere too, just changes retry behavior on
    // failure rather than command correctness.
    maxRetriesPerRequest: null,
    ...(redisUrl.startsWith('rediss://') ? { tls: {} } : {}),
  });

// ioredis emits 'error' on failed connections — with no listener, Node treats
// that as an unhandled EventEmitter error and crashes the process. Log
// instead so a misconfigured/unreachable Redis degrades the worker, not the
// whole app.
redis.on('error', (err) => console.error('[redis] connection error:', err.message));

if (process.env.NODE_ENV !== 'production') globalForRedis.redis = redis;
