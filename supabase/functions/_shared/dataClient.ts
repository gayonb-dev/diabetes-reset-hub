// Narrow structural contract shared across pinned SDK versions.
export interface DataQuery extends PromiseLike<{ data: Record<string, unknown>[] | null; error: unknown }> {
  eq(column: string, value: unknown): DataQuery;
  range(from: number, to: number): DataQuery;
  maybeSingle(): PromiseLike<{ data: Record<string, unknown> | null; error: unknown }>;
}

export interface DataClient {
  from(table: string): { select(columns: string): DataQuery };
}