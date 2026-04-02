import rateLimit from "express-rate-limit";

export const createHttpRateLimiter = () =>
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 300,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
      error: "Too many requests from this IP. Please try again in a while."
    }
  });
