// Narrow structural contract shared across pinned SDK versions.
export interface DataQuery extends PromiseLike<{ data: Record<string, any>[] | null; error: unknown }> {
  eq(column: string, value: unknown): DataQuery;
  range(from: number, to: number): DataQuery;
  maybeSingle(): PromiseLike<{ data: Record<string, any> | null; error: unknown }>;
}

export interface DataClient {
  from(table: string): { select(columns: string): DataQuery };
}