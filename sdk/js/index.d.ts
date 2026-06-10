export interface AvenaClientOptions {
  baseUrl?: string;
  apiKey?: string;
}

export declare class AvenaClient {
  baseUrl: string;
  apiKey: string | null;
  constructor(options?: AvenaClientOptions);
  /** Raw GET against any Avena endpoint path (e.g. '/api/v1/delphi'). */
  get<T = unknown>(path: string): Promise<T>;
  /** DELPHI — the daily AI panel on European property. */
  delphi<T = unknown>(): Promise<T>;
  /** PLAB — the European Property AI Benchmark leaderboard. */
  plab<T = unknown>(): Promise<T>;
  /** OpenAPI 3.1 description of every endpoint. */
  openapi<T = unknown>(): Promise<T>;
  /** Machine-readable partnership/API profile. */
  apiProfile<T = unknown>(): Promise<T>;
}

export default AvenaClient;
