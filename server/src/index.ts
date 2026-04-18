import { env } from './utils/env';
import { connectDB } from './utils/db';
import { createApp } from './app';

async function main(): Promise<void> {
  await connectDB();
  const app = createApp();
  app.listen(env.PORT, () => {
    console.log(`[server] listening on :${env.PORT}`);
  });
}

main().catch((err) => {
  console.error('[fatal]', err);
  process.exit(1);
});
