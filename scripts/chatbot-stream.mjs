/**
 * Incremental parser for the AI SDK UI message stream (SSE `data:` events).
 * Network chunks can split an event or a UTF-8 character anywhere; feed raw
 * bytes to `push` and call `end` once the body closes.
 */
export function createUiStreamParser({ captureToolInputs = false, captureToolResultSummaries = false, captureStreamTimings = false } = {}) {
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
    ...(captureStreamTimings ? { streamTimings: { events: [], droppedEvents: 0, lastTextMs: null } } : {}),
  };
  let stepIndex = -1;
  let stepHasText = false;

  // Client arrival milestones only. Never retain payloads, names, IDs or inputs.
  function milestone(type, now) {
    if (!captureStreamTimings) return;
    if (state.streamTimings.events.length >= 128) {
      state.streamTimings.droppedEvents++;
      return;
    }
    state.streamTimings.events.push({ type, atMs: now, stepIndex: stepIndex < 0 ? null : stepIndex });
  }

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
    if (type === 'start-step') {
      stepIndex++;
      stepHasText = false;
    }
    if (['start', 'start-step', 'finish-step', 'tool-input-start', 'tool-input-available',
      'tool-input-error', 'tool-output-available', 'tool-output-error', 'tool-output-denied',
      'tool-approval-request', 'finish', 'abort', 'error'].includes(type)) milestone(type, now);
    switch (type) {
      case 'text-delta':
        if (typeof chunk.delta === 'string' && chunk.delta.length > 0) {
          state.firstTextMs ??= now;
          state.text += chunk.delta;
          if (captureStreamTimings) state.streamTimings.lastTextMs = now;
          if (!stepHasText) milestone('first-text', now);
          stepHasText = true;
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
        if (captureToolResultSummaries) {
          // Najm returns JSON as text. Retain shape/count only, never row data.
          let output = chunk.output;
          if (typeof output === 'string') {
            try { output = JSON.parse(output); } catch { output = null; }
          }
          tool(chunk.toolCallId).resultSummary = Array.isArray(output)
            ? { kind: 'array', count: output.length } : null;
        }
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
