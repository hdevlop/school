import { ACADEMIC_YEAR_HEADER, ACADEMIC_YEAR_QUERY } from '@sms/contracts/academic-years';
import type { Container, Constructor, PropsInject } from 'diject';
import type { MiddlewareHandler } from 'hono';
import { McpErrorCode, McpException } from 'najm-mcp';
import { z } from 'zod';
import { createParamDecorator, Err, INJECTION_TYPES, USER } from '../../najm';
import { AcademicYearValidator, type ResolvedAcademicYear } from './AcademicYearValidator';

const YEAR_SCOPE_KEY = 'school:resolvedAcademicYear';
const yearProperties = new WeakMap<object, Set<string | symbol>>();

/** Bind this to the server's existing container before its services are built. */
export function registerYearPropertyInjector(container: Container) {
  const injector: PropsInject = {
    canInject: (_instance, constructor) => yearProperties.has(constructor),
    inject: (instance, constructor) => {
      if (!constructor) return;
      for (const propertyKey of yearProperties.get(constructor) ?? []) {
        // Injection runs after the constructor, so it replaces any own field
        // emitted by TypeScript rather than leaving an `undefined` shadow.
        Object.defineProperty(instance, propertyKey, {
          configurable: false,
          enumerable: false,
          get: () => {
            const year = container.store.get(YEAR_SCOPE_KEY) as ResolvedAcademicYear | undefined;
            if (!year) throw new Error('Resolved academic year is missing from the current operation');
            return year;
          },
        });
      }
    },
  };
  container.use(injector);
}

/** REST boundary: Najm guards run at order 40 and validation at 45. */
export function registerYearRequestScope(container: Container, controllers: readonly Constructor[]) {
  const handler: MiddlewareHandler = async (context, next) => {
    const year = await resolveRequestYear({
      header: (name) => context.req.header(name),
      query: (name) => context.req.query(name),
      container,
    });
    // Keep the child ALS scope alive through the handler and all nested awaits.
    return runWithResolvedYear(container, year, next);
  };
  for (const target of controllers) {
    container.setInjection({ type: INJECTION_TYPES.MIDDLEWARE, target, order: 50, handler });
  }
}

/** A trusted transport or job runner calls this after access validation. */
export function runWithResolvedYear<T>(container: Container, year: ResolvedAcademicYear, run: () => T): T {
  if (!year?.id) throw new TypeError('A validated academic year is required');
  return container.run({ [YEAR_SCOPE_KEY]: Object.freeze({ ...year }) }, run);
}

/** Scope migrated module tools in the published Najm invocation hook. */
export function schoolMcpYearHooks(groups: readonly string[]) {
  const forScopedTool = (tool: { group?: string }) =>
    tool.group !== undefined && groups.includes(tool.group);
  // Fee writes already expose `academicYear` in their body as the charged
  // year. Reuse that value as their MCP selection instead of declaring a
  // second input with the same name. Other fee tools use the shared input.
  const feeBodyYear = (tool: { group?: string; methodKey?: string | symbol }) =>
    tool.group === 'fees' && ['create', 'createClassBulk', 'update'].includes(String(tool.methodKey));
  const studentQueryYear = (tool: { group?: string; methodKey?: string | symbol }) =>
    tool.group === 'students' && ['getStudents', 'getStudent'].includes(String(tool.methodKey));
  const declaredYear = (tool: { group?: string; methodKey?: string | symbol }) =>
    feeBodyYear(tool) || studentQueryYear(tool);
  return {
    toolInput: (tool: { group?: string; methodKey?: string | symbol }) => forScopedTool(tool) && !declaredYear(tool)
      ? { [ACADEMIC_YEAR_QUERY]: z.string().optional() }
      : undefined,
    invocationScope: (tool: { group?: string }) => forScopedTool(tool)
      ? { [YEAR_SCOPE_KEY]: undefined }
      : undefined,
    aroundInvoke: async (
      context: {
        tool: { group?: string; methodKey?: string | symbol };
        input?: Readonly<Record<string, unknown>>;
        toolInput: Readonly<Record<string, unknown>>;
        container: Container;
        header(name: string): string | undefined;
      },
      next: () => Promise<unknown>,
    ) => {
      if (!forScopedTool(context.tool)) return next();
      const validator = await context.container.resolve(AcademicYearValidator);
      const user = context.container.get(USER) as { role?: string } | null | undefined;
      let year: ResolvedAcademicYear;
      try {
        year = await validator.resolveSelection({
          header: context.header(ACADEMIC_YEAR_HEADER),
          query: declaredYear(context.tool)
            ? context.input?.[ACADEMIC_YEAR_QUERY]
            : context.toolInput[ACADEMIC_YEAR_QUERY],
        }, user?.role);
      } catch (error) {
        if (Err.is(error)) {
          const code = error.status === 400 ? McpErrorCode.INVALID_ARGS
            : error.status === 403 ? McpErrorCode.FORBIDDEN
              : error.status === 404 ? McpErrorCode.NOT_FOUND
                : error.status === 409 ? McpErrorCode.UNAVAILABLE : undefined;
          if (code) throw new McpException(error.message, code);
        }
        throw error;
      }
      return runWithResolvedYear(context.container, year, next);
    },
  };
}

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
const yearParameter = createParamDecorator<ResolvedAcademicYear>(resolveRequestYear);

/**
 * Parameter form remains available for routes awaiting migration. The property
 * form only reads the current operation, even on a singleton. It never wraps
 * methods or resolves request input; repositories and validators can use it.
 */
export function Year(): ParameterDecorator & PropertyDecorator {
  return ((target: object, key: string | symbol | undefined, index?: number) => {
    if (typeof index === 'number') {
      yearParameter()(target, key!, index);
      return;
    }
    if (key === undefined) throw new TypeError('@Year() requires a property or method parameter');
    const constructor = target.constructor;
    let properties = yearProperties.get(constructor);
    if (!properties) {
      properties = new Set();
      yearProperties.set(constructor, properties);
    }
    properties.add(key);
  }) as ParameterDecorator & PropertyDecorator;
}
