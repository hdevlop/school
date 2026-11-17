import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { readFileSync } from 'node:fs';
import { ENV_NAMES, checkServerEnv, env, rawEnv } from '../../src/env';
import { embeddingEndpoint, resolveEmbedding } from '../../src/modules/chat/routing/embedding';

const original = Object.fromEntries(ENV_NAMES.map(name => [name, process.env[name]]));
const restore = () => {
  for (const name of ENV_NAMES) {
    if (original[name] === undefined) delete process.env[name];
    else process.env[name] = original[name];
  }
};
beforeEach(() => { for (const name of ENV_NAMES) delete process.env[name]; });
afterEach(restore);

describe('server environment', () => {
  it('lists every variable in the env template, set or commented out', () => {
    const template = readFileSync(new URL('../../../../apps/dashboard/.env.local.example', import.meta.url), 'utf8');
    const listed = (name: string) => new RegExp(`^#?[ \\t]*${name}=`, 'm').test(template);
    expect(ENV_NAMES.filter(name => !listed(name))).toEqual([]);
  });

  it('reads each variable under its own name', () => {
    for (const name of ENV_NAMES) process.env[name] = `probe-${name}`;
    for (const name of ENV_NAMES) expect(rawEnv(name)).toBe(`probe-${name}`);
  });

  it('accepts an unset environment', () => {
    expect(checkServerEnv()).toEqual([]);
    expect(env.database.url).toBe('postgres://localhost:5432/postgres');
    expect(env.rag.embedding.provider).toBe('ollama');
    expect(env.chat.jevMode).toBe('off');
  });

  it('reads a change made after import', () => {
    expect(env.notifications.pushEnabled).toBe(false);
    process.env.NOTIFICATIONS_PUSH_ENABLED = 'true';
    expect(env.notifications.pushEnabled).toBe(true);
  });

  it('lists every malformed value at once, by name', () => {
    process.env.RAG_EMBEDDING_BATCH_SIZE = 'four';
    process.env.CHATBOT_JEV_RERANK = 'maybe';
    process.env.CHATBOT_JEV_THRESHOLD = '2';
    process.env.RAG_EMBEDDING_PROVIDER = 'cohere';
    const problems = checkServerEnv().join('\n');
    for (const name of ['RAG_EMBEDDING_BATCH_SIZE', 'CHATBOT_JEV_RERANK', 'CHATBOT_JEV_THRESHOLD', 'RAG_EMBEDDING_PROVIDER'])
      expect(problems).toContain(name);
  });

  it('spells every switch the same way', () => {
    for (const value of ['1', 'true', 'TRUE', 'on', 'yes']) {
      process.env.CHATBOT_JEV_RERANK = value;
      process.env.NOTIFICATIONS_DISPATCH_ENABLED = value;
      expect([env.chat.jevRerank, env.notifications.dispatchEnabled]).toEqual([true, true]);
    }
    for (const value of ['0', 'false', 'off', 'No', '', ' ']) {
      process.env.CHATBOT_JEV_RERANK = value;
      process.env.NOTIFICATIONS_DISPATCH_ENABLED = value;
      expect([env.chat.jevRerank, env.notifications.dispatchEnabled]).toEqual([false, false]);
    }
  });

  it('keeps an empty embedding prefix as a deliberate setting', () => {
    process.env.RAG_EMBEDDING_MODEL = 'qwen3-embedding';
    expect(resolveEmbedding().queryPrefix).toStartWith('Instruct:');
    process.env.RAG_EMBEDDING_QUERY_PREFIX = '';
    expect(resolveEmbedding().queryPrefix).toBe('');
  });

  it('posts chat embeddings to the provider najm-rag indexes with', () => {
    expect(embeddingEndpoint()).toBe('http://127.0.0.1:11434/api/embed');
    process.env.RAG_EMBEDDING_PROVIDER = 'OpenAI-Compatible';
    expect(resolveEmbedding().baseUrl).toBe('http://127.0.0.1:18080/v1');
    expect(embeddingEndpoint()).toBe('http://127.0.0.1:18080/v1/embeddings');
    process.env.RAG_EMBEDDING_BASE_URL = ' https://embed.example.test/v1/ ';
    expect(resolveEmbedding().baseUrl).toBe('https://embed.example.test/v1/');
    expect(embeddingEndpoint()).toBe('https://embed.example.test/v1/embeddings');
  });
});
