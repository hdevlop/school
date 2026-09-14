import { server } from '../index';
import { NotificationWorker } from '../modules';

await server.init();
const worker = server.container.get(NotificationWorker);
const work = await worker.dispatchOnce();
console.log(`School notification dispatch completed (${work} item(s)).`);
