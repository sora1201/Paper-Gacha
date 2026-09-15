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
declare module "better-auth/adapters/drizzle" { export function drizzleAdapter(db: unknown, options: { provider: "sqlite"; schema?: Record<string, unknown> }): unknown }
declare module "drizzle-orm/d1" { export function drizzle(db: D1Database, options?: { schema?: Record<string, unknown> }): unknown }
declare module "drizzle-orm/sqlite-core" {
  type Column = { primaryKey(): Column; notNull(): Column; unique(): Column; default(value: unknown): Column; references(reference: () => Column, options?: { onDelete?: string }): Column };
  export function text(name: string): Column;
  export function integer(name: string, options?: { mode?: "boolean" | "timestamp" }): Column;
  export function sqliteTable<T extends Record<string, Column>>(name: string, columns: T): T;
}
