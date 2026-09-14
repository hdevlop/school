import { server } from '../index';
import { NotificationWorker } from '../modules';

await server.init();
const worker = server.container.get(NotificationWorker);
await worker.run();
