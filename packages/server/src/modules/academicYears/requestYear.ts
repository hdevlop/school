import { ACADEMIC_YEAR_HEADER, ACADEMIC_YEAR_QUERY } from '@sms/contracts/academic-years';
import { createParamDecorator, USER } from '../../najm';
import { AcademicYearValidator, type ResolvedAcademicYear } from './AcademicYearValidator';

/**
 * What the year of one REST request or MCP tool call is read from: the
 * `X-Academic-Year` header, the `academicYear` query value (the tool argument
 * for MCP) and the authenticated user in the request container.
 */
export interface YearRequest {
  header(name: string): string | undefined;
  query(name: string): unknown;
  container: {
    get(token: unknown): unknown;
    resolve<T>(token: new (...args: any[]) => T): Promise<T>;
  };
}

/**
 * The year a request works in, resolved after authentication for that request
 * only and checked against the actor's role. Nothing is kept between calls:
 * each invocation resolves its own year.
 */
export async function resolveRequestYear(request: YearRequest): Promise<ResolvedAcademicYear> {
  const validator = await request.container.resolve(AcademicYearValidator);
  const user = request.container.get(USER) as { role?: string } | null | undefined;
  return validator.resolveSelection(
    { header: request.header(ACADEMIC_YEAR_HEADER), query: request.query(ACADEMIC_YEAR_QUERY) },
    user?.role,
  );
}

/**
 * Injects the year a REST request or MCP tool call works in, resolved by
 * `resolveRequestYear` after the route's authentication and guards. Routes
 * that take it keep `academicYear` in their query schema so MCP tools still
 * advertise the argument; the resolved record itself is never tool input.
 */
export const Year = createParamDecorator<ResolvedAcademicYear>(resolveRequestYear);
