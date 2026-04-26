import { createClient } from "redis";

const redisHost = process.env.REDIS_HOST;
const redisPort = process.env.REDIS_PORT ? parseInt(process.env.REDIS_PORT) : 6379;
const redisPassword = process.env.REDIS_PASSWORD;
const redisUsername = process.env.REDIS_USERNAME || 'default';

if (!redisHost || redisHost.trim() === '') {
  throw new Error('REDIS_HOST environment variable is not defined or empty.');
}

if (isNaN(redisPort) || redisPort < 1 || redisPort > 65535) {
  throw new Error(`Invalid REDIS_PORT: ${process.env.REDIS_PORT}`);
}

if (!redisPassword || redisPassword.trim() === '') {
  throw new Error('REDIS_PASSWORD environment variable is not defined or empty.');
}

export const redis = createClient({
  username: redisUsername,
  password: redisPassword,
  socket: {
    host: redisHost,
    port: redisPort,
    reconnectStrategy: (retries) => {
      const delay = Math.min(100 * Math.pow(2, retries), 30000);
      console.warn('Redis reconnecting', { attempt: retries + 1 });
      return delay;
    },
  }
});

redis.on('error', (err) => console.error('Redis error', err.message));
redis.on('connect', () => console.info('Redis connected'));
redis.on('ready', () => console.info('Redis ready'));

export interface UserWallet {
  publicKey: string;
  secretKey: number[];
}

export interface ActiveGame {
  userId: number;
  publicKey: string;
  direction: number;
  betSol: number;
  startPrice: number;
  startTime: number;
  chatId: number;
}

export async function saveUserWallet(userId: number, wallet: UserWallet) {
  await redis.set(`wallet:${userId}`, JSON.stringify(wallet));
}

export async function getUserWallet(userId: number): Promise<UserWallet | null> {
  const data = await redis.get(`wallet:${userId}`);
  return data ? JSON.parse(data) : null;
}

export async function saveGame(userId: number, game: ActiveGame) {
  await redis.set(`game:${userId}`, JSON.stringify(game), { EX: 300 });
}

export async function getGame(userId: number): Promise<ActiveGame | null> {
  const data = await redis.get(`game:${userId}`);
  return data ? JSON.parse(data) : null;
}

export async function deleteGame(userId: number) {
  await redis.del(`game:${userId}`);
}
