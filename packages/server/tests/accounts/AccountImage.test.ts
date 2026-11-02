import 'reflect-metadata';
import { describe, expect, it, mock } from 'bun:test';
import * as i18n from 'najm-i18n';

// Refusals carry their catalog key, so each test names the one it expects.
mock.module('najm-i18n', () => ({ ...i18n, t: (key: string) => key }));
const { AccountService } = await import('../../src/modules/accounts/AccountService');
const { AccountValidator } = await import('../../src/modules/accounts/AccountValidator');

function harness(existing = true) {
  const saved: { namespace: string; filePath?: string }[] = [];
  const written: (string | null)[] = [];
  const repository = {
    getUser: async (id: string) => existing ? { id, image: null } : null,
    updateImage: async (id: string, image: string | null) => {
      written.push(image);
      return { id, image, updatedAt: '2026-11-02T12:00:00' };
    },
  };
  const storage = {
    processFile: async (namespace: string, _file: unknown, options: { filePath?: string }) => {
      saved.push({ namespace, filePath: options.filePath });
      return `/api/${namespace}/files/serve/${options.filePath}`;
    },
  };
  const service = new AccountService(repository as never, new AccountValidator(repository as never), storage as never);
  return { service, saved, written };
}

const png = new File([new Uint8Array([137, 80, 78, 71])], 'me.png', { type: 'image/png' });

describe('account photo', () => {
  it('stores an uploaded image and keeps its path, never the file itself', async () => {
    const h = harness();
    const result = await h.service.updateImage('u1', png);
    expect(h.saved).toEqual([{ namespace: 'users', filePath: 'u1_avatar.png' }]);
    expect(h.written).toEqual(['/api/users/files/serve/u1_avatar.png']);
    expect(result.image).toBe('/api/users/files/serve/u1_avatar.png');
  });

  it('clears the photo when no image is sent', async () => {
    for (const cleared of [null, undefined, '']) {
      const h = harness();
      await h.service.updateImage('u1', cleared);
      expect(h.saved).toEqual([]);
      expect(h.written).toEqual([null]);
    }
  });

  it('refuses a file that is not an image, or text such as "[object File]", and writes nothing', async () => {
    for (const input of [new File(['%PDF'], 'cv.pdf', { type: 'application/pdf' }), '[object File]', { name: 'x' }]) {
      const h = harness();
      const refusal = await h.service.updateImage('u1', input).catch(error => error);
      expect(refusal).toMatchObject({ status: 400, message: 'users.errors.imageInvalid' });
      expect(h.written).toEqual([]);
    }
  });

  it('refuses an account that does not exist', async () => {
    const h = harness(false);
    const refusal = await h.service.updateImage('missing', png).catch(error => error);
    expect(refusal).toMatchObject({ status: 404, message: 'users.errors.notFound' });
    expect(h.saved).toEqual([]);
  });
});
