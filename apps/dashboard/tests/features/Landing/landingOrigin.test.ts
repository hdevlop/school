import { afterEach, describe, expect, it } from 'bun:test';
import { landingOrigin } from '@/features/Landing/config/landingOrigin';
import robots, { dynamic } from '@/app/robots';

const originalOrigin = process.env.FRONTEND_URL;
afterEach(() => {
  if (originalOrigin === undefined) delete process.env.FRONTEND_URL;
  else process.env.FRONTEND_URL = originalOrigin;
});

describe('installation origin', () => {
  it('uses runtime origins for metadata and robots without reimporting the module', () => {
    for (const host of ['demo.example.test', 'customer.example.test']) {
      process.env.FRONTEND_URL = `https://${host}/`;
      expect(landingOrigin()?.href).toBe(`https://${host}/`);
      expect(robots().sitemap).toBe(`https://${host}/sitemap.xml`);
    }
    expect(dynamic).toBe('force-dynamic');
  });

  it('omits absolute metadata when no origin is configured', () => {
    delete process.env.FRONTEND_URL;
    expect(landingOrigin()).toBeUndefined();
    expect(robots().sitemap).toBeUndefined();
  });

  it('rejects credentials and non-web origins', () => {
    for (const url of ['https://user:secret@example.test', 'file:///etc/passwd', 'javascript:alert(1)']) {
      process.env.FRONTEND_URL = url;
      expect(landingOrigin).toThrow('Invalid FRONTEND_URL');
    }
  });
});
