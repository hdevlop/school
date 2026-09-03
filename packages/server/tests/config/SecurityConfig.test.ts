import { describe, expect, it } from 'bun:test';

import { mcpConfig } from '@server/config';

describe('shared security configuration', () => {
  it('protects same-origin MCP discovery and sanitizes failures', () => {
    expect(mcpConfig().config).toMatchObject({
      auth: { type: 'najm-auth' },
      cors: false,
      exposeErrorDetails: false,
    });
  });
});
