import { describe, expect, it } from 'bun:test';
import { mkdtempSync, rmdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { acquireChatbotRunLock } from '../chatbot-run-lock.mjs';

describe('exclusive shared-model benchmark runs', () => {
  it('blocks overlap and allows a new run after release', () => {
    const directory = mkdtempSync(join(tmpdir(), 'school-chat-lock-test-'));
    const path = join(directory, 'run.lock');
    const release = acquireChatbotRunLock(path);
    try { expect(() => acquireChatbotRunLock(path)).toThrow('shared-model lock'); }
    finally { release(); }
    const next = acquireChatbotRunLock(path);
    next();
    next();
    rmdirSync(directory);
  });
});
