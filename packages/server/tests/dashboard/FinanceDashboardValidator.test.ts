import { describe, expect, it } from 'bun:test';
import {
  academicYearQueryDto,
  overdueQueryDto,
  recentPaymentsQueryDto,
} from '@server/modules/dashboard/finance/FinanceDashboardValidator';

describe('FinanceDashboardValidator', () => {
  it('accepts an empty academic year query for MCP callers', () => {
    const result = academicYearQueryDto.safeParse({});

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual({});
    }
  });

  it('accepts a valid academic year string', () => {
    const result = academicYearQueryDto.safeParse({ academicYear: '2025-2026' });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual({ academicYear: '2025-2026' });
    }
  });

  it('rejects an invalid academic year string', () => {
    const result = academicYearQueryDto.safeParse({ academicYear: '2025/2026' });
    expect(result.success).toBe(false);
  });

  it('defaults overdue limit for MCP callers', () => {
    const result = overdueQueryDto.safeParse({});

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual({ limit: 20 });
    }
  });

  it('rejects overdue limits above the supported maximum', () => {
    const result = overdueQueryDto.safeParse({ limit: 101 });
    expect(result.success).toBe(false);
  });

  it('defaults recent payments limit for MCP callers', () => {
    const result = recentPaymentsQueryDto.safeParse({});

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual({ limit: 10 });
    }
  });

  it('rejects non-positive recent payment limits', () => {
    const result = recentPaymentsQueryDto.safeParse({ limit: 0 });
    expect(result.success).toBe(false);
  });
});
