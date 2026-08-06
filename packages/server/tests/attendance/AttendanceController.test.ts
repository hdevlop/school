import { beforeAll, describe, expect, it } from 'bun:test';

describe('AttendanceController MCP wiring', () => {
  let source = '';

  beforeAll(async () => {
    source = await Bun.file(
      new URL('../../src/modules/attendance/AttendanceController.ts', import.meta.url),
    ).text();
  });

  it('assigns the attendance MCP tool group', () => {
    expect(source).toContain("@ToolGroup('attendance')");
  });

  it('exposes the expected attendance MCP tools', () => {
    const descriptions = [...source.matchAll(/@McpTool\('([^']+)'\)/g)]
      .map(match => match[1]);

    // Read tools use the plain string form; write tools (mark/update/delete) now use
    // the object form with a confirm prompt, so they are asserted separately below.
    expect(descriptions).toEqual([
      'List all attendance records',
      'Get attendance records for a specific date',
      'Get attendance records for a section',
      'Get attendance records for a student',
      'Get attendance records for a staff member',
      'Get attendance records for a teacher through their staff profile',
      'Get an attendance record by ID',
    ]);
    expect(source).toContain('@McpTool("List today\'s attendance records")');
    expect(source).toContain('@McpTool("List today\'s staff attendance records")');
    expect(source).toContain("description: 'Mark attendance for a student or staff member'");
    expect(source).toContain("description: 'Update an attendance record by ID'");
    expect(source).toContain("description: 'Delete an attendance record by ID'");
    expect(source).toContain("description: 'Delete all attendance records'");
  });

  it('uses validated type query schemas for MCP-friendly attendance filters', () => {
    expect(source).toContain("@Validate({ query: typeQueryParam })");
    expect(source).toContain("@Validate({ params: attendanceDateParam, query: typeQueryParam })");
    expect(source).toContain("@Validate({ body: typeQueryParam })");
    expect(source).toContain("@Validate({ body: attendanceDateFilterDto })");
  });
});
