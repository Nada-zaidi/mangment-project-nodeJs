import { createRateLimiter } from '../apiRateLimiter';

export default (app) => {
  const signInRateLimiter = createRateLimiter({
    max: 20,
    windowMs: 15 * 60 * 1000,
    message: 'errors.429',
  });

  app.post(
    `/auth/sign-in`,
    signInRateLimiter,
    require('./authSignIn').default,
  );

  const signUpRateLimiter = createRateLimiter({
    max: 20,
    windowMs: 60 * 60 * 1000,
    message: 'errors.429',
  });

  app.post(
    `/auth/sign-up`,
    signUpRateLimiter,
    require('./authSignUp').default,
  );  
  app.get(`/auth/me`, require('./authMe').default);
};
