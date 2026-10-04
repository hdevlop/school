/**
 * Incremental parser for the AI SDK UI message stream (SSE `data:` events).
 * Network chunks can split an event or a UTF-8 character anywhere; feed raw
 * bytes to `push` and call `end` once the body closes.
 */
export function createUiStreamParser({ captureToolInputs = false } = {}) {
  const decoder = new TextDecoder();
  let buffer = '';
  const state = {
    firstByteMs: null,
    firstTextMs: null,
    finishMs: null,
    done: false,
    finishReason: null,
    text: '',
    chunkCounts: {},
    tools: new Map(),
    errors: [],
    aborted: false,
    metadata: null,
    malformed: 0,
  };

  function tool(id, name) {
    if (!state.tools.has(id)) state.tools.set(id, { name: name ?? null, input: false, outcome: 'none' });
    const entry = state.tools.get(id);
    if (name && !entry.name) entry.name = name;
    return entry;
  }

  function handle(payload, now) {
    if (payload === '[DONE]') {
      state.done = true;
      return;
    }
    let chunk;
    try {
      chunk = JSON.parse(payload);
    } catch {
      state.malformed++;
      return;
    }
    const type = typeof chunk?.type === 'string' ? chunk.type : 'unknown';
    state.chunkCounts[type] = (state.chunkCounts[type] ?? 0) + 1;
    switch (type) {
      case 'text-delta':
        if (typeof chunk.delta === 'string' && chunk.delta.length > 0) {
          state.firstTextMs ??= now;
          state.text += chunk.delta;
        }
        break;
      case 'tool-input-start':
      case 'tool-input-available':
        tool(chunk.toolCallId, chunk.toolName).input ||= type === 'tool-input-available';
        if (captureToolInputs && type === 'tool-input-available') {
          tool(chunk.toolCallId, chunk.toolName).arguments = chunk.input;
        }
        break;
      case 'tool-input-error':
        tool(chunk.toolCallId, chunk.toolName).outcome = 'input-error';
        break;
      case 'tool-output-available':
        tool(chunk.toolCallId).outcome = 'output';
        break;
      case 'tool-output-error':
        tool(chunk.toolCallId).outcome = 'error';
        break;
      case 'tool-output-denied':
        tool(chunk.toolCallId).outcome = 'denied';
        break;
      case 'tool-approval-request':
        tool(chunk.toolCallId).outcome = 'approval-requested';
        break;
      case 'error':
        state.errors.push(String(chunk.errorText ?? '').slice(0, 200));
        break;
      case 'abort':
        state.aborted = true;
        break;
      case 'message-metadata':
        state.metadata = chunk.messageMetadata ?? null;
        break;
      case 'finish':
        state.finishMs ??= now;
        state.finishReason = chunk.finishReason ?? null;
        if (chunk.messageMetadata !== undefined) state.metadata = chunk.messageMetadata;
        break;
    }
  }

  function drain(now, flush) {
    // SSE events end with a blank line; tolerate CRLF.
    buffer = buffer.replace(/\r\n/g, '\n');
    let boundary;
    while ((boundary = buffer.indexOf('\n\n')) !== -1) {
      emit(buffer.slice(0, boundary), now);
      buffer = buffer.slice(boundary + 2);
    }
    if (flush && buffer.trim()) {
      emit(buffer, now);
      buffer = '';
    }
  }

  function emit(event, now) {
    const data = event.split('\n')
      .filter((line) => line.startsWith('data:'))
      .map((line) => line.slice(5).replace(/^ /, ''))
      .join('\n');
    if (data) handle(data, now);
  }

  return {
    push(bytes, now) {
      if (bytes.length === 0) return;
      state.firstByteMs ??= now;
      buffer += decoder.decode(bytes, { stream: true });
      drain(now, false);
    },
    end(now) {
      buffer += decoder.decode();
      drain(now, true);
      return {
        ...state,
        tools: [...state.tools.values()],
      };
    },
  };
}

/** Nearest-rank percentile; null when there are no observations. */
export function percentile(values, p) {
  const sorted = values.filter((value) => typeof value === 'number').sort((a, b) => a - b);
  if (sorted.length === 0) return null;
  return sorted[Math.max(0, Math.ceil((p / 100) * sorted.length) - 1)];
}
