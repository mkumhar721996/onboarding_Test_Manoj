import { buildApp, ensureAuthSchema } from './app';
import { pool } from './db';

const app = buildApp();
const port = Number(process.env.PORT) || 3000;

ensureAuthSchema(pool)
  .then(() => app.listen({ port, host: '0.0.0.0' }))
  .catch((err) => {
    app.log.error(err);
    process.exit(1);
  });
