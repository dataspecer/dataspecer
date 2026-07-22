/**
 * Platform independent (browser, NodeJS) definition of fetch function.
 */
export type HttpFetch = (
  url: string,
  options?: FetchOptions
) => Promise<FetchResponse>;

export interface FetchOptions {
  headers?: { [name: string]: string };
  method?: string;
  body?: string;
}

export interface FetchResponse {
  get headers(): FetchHeaders;

  json(): Promise<unknown>;

  text(): Promise<string>;

  status: number;
  statusText: string;
}

export interface FetchHeaders {
  has(name: string);

  get(name: string);
}
