import { registerAs } from '@nestjs/config';

const DEFAULT_HOST = '127.0.0.1';
const DEFAULT_PORT = 19_222;

export const httpConfig = registerAs('http', () => ({
  host: process.env.REVO_HOST ?? DEFAULT_HOST,
  port: Number(process.env.REVO_PORT ?? DEFAULT_PORT),
}));
