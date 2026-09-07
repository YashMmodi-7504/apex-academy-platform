/**
 * Netlify Function wrapping the existing Express API.
 *
 * The same `apiRoutes` router used by server.ts is mounted here, so route
 * definitions, controllers, middleware and auth behaviour are unchanged —
 * only the HTTP transport differs (Lambda instead of a long-lived listener).
 *
 * netlify.toml redirects /api/* here, so the frontend keeps calling relative
 * /api paths exactly as it does locally.
 */
import express from 'express';
import serverless from 'serverless-http';
import apiRoutes from '../../src/backend/routes/api.routes';
import { errorHandler, notFoundHandler } from '../../src/backend/middleware/error.middleware';

const app = express();

app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ extended: true }));

/**
 * Netlify hands the function the full request path, which may arrive as
 * `/.netlify/functions/api/...` or as the original `/api/...` depending on how
 * the redirect resolved. Normalise both to the router's own paths so route
 * matching does not depend on which form we receive.
 */
app.use((req, _res, next) => {
  req.url = req.url
    .replace(/^\/\.netlify\/functions\/api/, '')
    .replace(/^\/api(?=\/|$)/, '') || '/';
  next();
});

app.use(apiRoutes);
app.use(notFoundHandler);
app.use(errorHandler);

export const handler = serverless(app);
