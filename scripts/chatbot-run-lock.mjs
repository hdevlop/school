import { closeSync, openSync, unlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

// Every School checkout on this machine shares the same model settings.
export function acquireChatbotRunLock(path = join(tmpdir(), 'school-chatbot-benchmark.lock')) {
  let descriptor;
  try { descriptor = openSync(path, 'wx'); }
  catch (error) {
    if (error.code === 'EEXIST') throw new Error('Another chatbot benchmark holds the shared-model lock. Finish that run before starting this one.');
    throw error;
  }
  writeFileSync(descriptor, JSON.stringify({ pid: process.pid, startedAt: new Date().toISOString() }));
  let released = false;
  const release = () => {
    if (released) return;
    released = true;
    closeSync(descriptor);
    unlinkSync(path);
  };
  process.once('exit', release);
  return release;
}
