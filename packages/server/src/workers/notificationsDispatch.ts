import { server } from '../index';
import { NotificationWorker } from '../modules';

// One pass, then exit: server.init() also starts background work (the chatbot's
// tool indexing, pooled connections) that would otherwise keep a cron run alive.
try {
  await server.init();
  const worker = server.container.get(NotificationWorker);
  const work = await worker.dispatchOnce();
  console.log(`School notification dispatch completed (${work} item(s)).`);
  process.exit(0);
} catch (error) {
  console.error('School notification dispatch failed:', error);
  process.exit(1);
}
