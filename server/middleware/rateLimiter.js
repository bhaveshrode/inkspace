import rateLimit from 'express-rate-limit';

// Strict rate limiter for authentication endpoints (login, signup)
// Prevents brute force attacks on password authentication
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Limit each IP to 5 requests per windowMs
  message: {
    error: 'Too many authentication attempts. Please try again after 15 minutes.'
  },
  standardHeaders: true, // Return rate limit info in `RateLimit-*` headers
  legacyHeaders: false, // Disable `X-RateLimit-*` headers
  // Skip successful requests (only count failed login attempts)
  skipSuccessfulRequests: false,
  // Skip failed requests (count all attempts)
  skipFailedRequests: false,
});

// Moderate rate limiter for registration endpoints
// Prevents spam account creation
export const registrationLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3, // Limit each IP to 3 registration attempts per hour
  message: {
    error: 'Too many accounts created from this IP. Please try again after an hour.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Lenient rate limiter for general API read endpoints
// Prevents API abuse while allowing normal usage
export const apiReadLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 100, // Limit each IP to 100 read requests per minute
  message: {
    error: 'Too many requests. Please slow down.'
  },
  standardHeaders: true,
  legacyHeaders: false,
  // Skip rate limiting for static assets
  skip: (req) => {
    return req.path.startsWith('/public/') ||
           req.path.endsWith('.css') ||
           req.path.endsWith('.js') ||
           req.path.endsWith('.png') ||
           req.path.endsWith('.jpg') ||
           req.path.endsWith('.svg');
  }
});

// Moderate rate limiter for API write endpoints (create, update, delete)
// Prevents spam and abuse of write operations
export const apiWriteLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 30, // Limit each IP to 30 write requests per minute
  message: {
    error: 'Too many write operations. Please slow down.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Strict rate limiter for password reset requests
// Prevents abuse of password reset flow
export const passwordResetLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3, // Limit each IP to 3 password reset requests per hour
  message: {
    error: 'Too many password reset requests. Please try again after an hour.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Very strict rate limiter for sensitive operations
// For operations like email verification, account deletion
export const sensitiveLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5, // Limit each IP to 5 sensitive operations per hour
  message: {
    error: 'Too many requests for this sensitive operation. Please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});
