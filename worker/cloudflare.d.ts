interface D1Result<T = unknown> { results: T[]; success: boolean; meta: unknown }
interface D1PreparedStatement {
  bind(...values: unknown[]): D1PreparedStatement;
  first<T = unknown>(): Promise<T | null>;
  run<T = unknown>(): Promise<D1Result<T>>;
}
interface D1Database { prepare(query: string): D1PreparedStatement }

declare module "better-auth" {
  export function betterAuth(options: any): {
    handler(request: Request): Promise<Response>;
    api: { getSession(input: { headers: Headers }): Promise<{ user: { id: string; email: string } } | null> };
  };
}
declare module "better-auth/adapters/drizzle" { export function drizzleAdapter(db: unknown, options: { provider: "sqlite" }): unknown }
declare module "drizzle-orm/d1" { export function drizzle(db: D1Database): unknown }
