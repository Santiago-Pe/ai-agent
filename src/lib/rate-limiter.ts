// Sistema simple de rate limiting para OpenAI
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

export function checkRateLimit(userId: string, maxRequests = 10, windowMinutes = 60): boolean {
  const now = Date.now();
  const windowMs = windowMinutes * 60 * 1000;
  const key = userId;

  const userLimit = rateLimitStore.get(key);
  
  if (!userLimit || now > userLimit.resetTime) {
    rateLimitStore.set(key, { count: 1, resetTime: now + windowMs });
    return true;
  }

  if (userLimit.count >= maxRequests) {
    return false;
  }

  userLimit.count++;
  return true;
}

export function getRemainingRequests(userId: string, maxRequests = 10): number {
  const userLimit = rateLimitStore.get(userId);
  if (!userLimit || Date.now() > userLimit.resetTime) {
    return maxRequests;
  }
  return Math.max(0, maxRequests - userLimit.count);
}

export function getResetTime(userId: string): number | null {
  const userLimit = rateLimitStore.get(userId);
  if (!userLimit || Date.now() > userLimit.resetTime) {
    return null;
  }
  return userLimit.resetTime;
}