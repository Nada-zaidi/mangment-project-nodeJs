import RateLimit from 'express-rate-limit';

export function createRateLimiter({
  max,
  windowMs,
  message,
}: {
  max: number;
  windowMs: number;
  message: string;
}) {
  return new RateLimit({
    max,
    windowMs,
    message,
  });
}
