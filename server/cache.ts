import debug from "debug";

import { createClient, RedisClient } from "redis";
import { promisify } from "util";

const error = debug("bobaserver:cache-error");
const log = debug("bobaserver:cache-log");
const info = debug("bobaserver:cache-info");

let client: {
  set: (key: CacheKeys, value: string) => Promise<void>;
  get: (key: CacheKeys) => Promise<string>;
  del: (key: CacheKeys) => Promise<void>;
  hset: (key: CacheKeys, objectKey: string, value: string) => Promise<void>;
  hget: (key: CacheKeys, objectKey: string) => Promise<string>;
  hdel: (key: CacheKeys, objectKey: string) => Promise<void>;
};

export const initCache = (createClientMethod?: any) => {
  if (client) {
    return;
  }
  let innerClient: RedisClient;
  log(`Attempting cache connection...`);
  log(
    `Attempting connection to redis client on host ${process.env.REDIS_HOST} and port ${process.env.REDIS_PORT}`
  );
  innerClient = createClientMethod
    ? createClientMethod()
    : createClient(parseInt(process.env.REDIS_PORT), process.env.REDIS_HOST);

  innerClient.on("connect", () => {
    log("You are now connected to the cache");
  });
  innerClient.on("error", (err) => {
    error("Redis connection failed");
  });

  client = {
    set: promisify(innerClient.set).bind(innerClient),
    get: promisify(innerClient.get).bind(innerClient),
    del: promisify(innerClient.del).bind(innerClient),
    hset: promisify(innerClient.hset).bind(innerClient),
    hget: promisify(innerClient.hget).bind(innerClient),
    hdel: promisify(innerClient.hdel).bind(innerClient),
  };
};

export const cache = () => client;

export enum CacheKeys {
  // All boards data.
  BOARDS,
  // Data pertaining to a single board, keyed by the board slug.
  BOARD,
  // Data pertaining to the user, keyed by the user's firebase id.
  USER,
}
