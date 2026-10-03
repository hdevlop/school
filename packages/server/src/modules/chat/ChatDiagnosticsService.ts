import { Injectable } from '../../najm';
import { chatDiagnosticsLog } from './ChatDiagnosticsLog';

@Injectable()
export class ChatDiagnosticsService {
  list(limit: number) {
    return chatDiagnosticsLog.recent(limit);
  }

  /** Null (204) while the answer is still being saved or after the record aged out. */
  find(correlationId: string) {
    return chatDiagnosticsLog.find(correlationId);
  }
}
