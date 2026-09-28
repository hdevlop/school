import 'reflect-metadata';
import { afterEach, describe, expect, it } from 'bun:test';
import { Controller, Get, Server, Service, USER } from '../../src/najm';
import { McpBuilderService, McpTool, ToolGroup, mcp } from 'najm-mcp';
import { AcademicYearRepository } from '../../src/modules/academicYears/AcademicYearRepository';
import { AcademicYearValidator, type ResolvedAcademicYear } from '../../src/modules/academicYears/AcademicYearValidator';
import { Year, registerYearPropertyInjector, schoolMcpYearHooks } from '../../src/modules/academicYears/requestYear';

const years = {
  '2025-2026': { id: 'year-2025', label: '2025-2026', status: 'closed' },
  '2026-2027': { id: 'year-2026', label: '2026-2027', status: 'active' },
} as const;

@Service()
class AlertYearProbeService {
  @Year()
  private readonly year!: ResolvedAcademicYear;

  async read() {
    const before = this.year.label;
    await new Promise((resolve) => setTimeout(resolve, before === '2025-2026' ? 15 : 1));
    return { before, after: this.year.label };
  }
}

@ToolGroup('alerts')
@Controller('/alert-year-probe')
class AlertYearProbeController {
  constructor(private service: AlertYearProbeService) {}

  @Get()
  @McpTool('Read an Alert year probe')
  read() { return this.service.read(); }
}

let server: Server | undefined;
let port = 5480;
afterEach(async () => {
  await server?.stop();
  server = undefined;
});

async function boot() {
  const listenPort = port++;
  server = new Server({ isolated: true, silent: true })
    .use(mcp({
      name: 'school-year-hook-gate', version: '1.0.0', path: '/mcp',
      auth: {
        type: 'bearer',
        validate: (token) => ({ user: {
          id: token,
          role: token.startsWith('admin') ? 'admin' : token.startsWith('principal') ? 'principal' : 'teacher',
        } }),
      },
      ...schoolMcpYearHooks(['alerts', 'announcements']),
    }))
    .base('/api')
    .load({ AlertYearProbeService, AlertYearProbeController, AcademicYearValidator, AcademicYearRepository });
  registerYearPropertyInjector(server.container);
  await server.listen(listenPort);
  const repository = await server.container.resolve(AcademicYearRepository);
  Object.assign(repository, {
    findWithActivePointer: async (match?: { label?: string }) => ({
      activeAcademicYearId: 'year-2026',
      currentAcademicYear: '2026-2027',
      year: years[(match?.label ?? '2026-2027') as keyof typeof years] ?? null,
    }),
  });
  return { instance: server, endpoint: `http://localhost:${listenPort}/api/mcp` };
}

describe('School year hook on the published Najm MCP extension', () => {
  it('advertises the optional year and isolates concurrent direct calls', async () => {
    const { instance } = await boot();
    const builder = await instance.container.resolve(McpBuilderService);
    const [older, active] = await instance.container.run({ [USER.key]: { id: 'admin-a', role: 'admin' } }, () =>
      Promise.all([
        builder.invokeTool('alerts_read', { academicYear: '2025-2026' }),
        builder.invokeTool('alerts_read', { academicYear: '2026-2027' }),
      ]));
    expect(JSON.parse(older.content[0].text)).toEqual({ before: '2025-2026', after: '2025-2026' });
    expect(JSON.parse(active.content[0].text)).toEqual({ before: '2026-2027', after: '2026-2027' });
  });

  it('resolves real HTTP MCP calls from header or tool input under each actor', async () => {
    const { endpoint } = await boot();
    const { Client } = await import('@modelcontextprotocol/sdk/client/index.js');
    const { StreamableHTTPClientTransport } = await import('@modelcontextprotocol/sdk/client/streamableHttp.js');

    const call = async (actor: string, headerYear: string | undefined, toolYear?: string) => {
      const client = new Client({ name: `school-${actor}`, version: '1.0.0' });
      const transport = new StreamableHTTPClientTransport(new URL(endpoint), {
        requestInit: { headers: {
          Authorization: `Bearer ${actor}`,
          ...(headerYear ? { 'X-Academic-Year': headerYear } : {}),
        } },
      });
      await client.connect(transport);
      try {
        const tools = await client.listTools();
        expect(tools.tools.find((tool) => tool.name === 'alerts_read')?.inputSchema.properties)
          .toHaveProperty('academicYear');
        return await client.callTool({
          name: 'alerts_read', arguments: toolYear ? { academicYear: toolYear } : {},
        }) as { content: Array<{ text: string }>; isError?: boolean };
      } finally {
        await transport.close();
      }
    };

    const [older, active, sameAdmin] = await Promise.all([
      call('admin-a', '2025-2026'),
      call('principal-b', '2026-2027'),
      call('admin-a', undefined, '2026-2027'),
    ]);
    expect(JSON.parse(older.content[0].text)).toEqual({ before: '2025-2026', after: '2025-2026' });
    expect(JSON.parse(active.content[0].text)).toEqual({ before: '2026-2027', after: '2026-2027' });
    expect(JSON.parse(sameAdmin.content[0].text)).toEqual({ before: '2026-2027', after: '2026-2027' });
    expect((await call('teacher-c', '2025-2026')).isError).toBe(true);
    expect((await call('admin-a', '2025-2026', '2026-2027')).isError).toBe(true);
  });
});
