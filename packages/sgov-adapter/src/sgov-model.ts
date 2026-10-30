import type { HttpFetch } from "@dataspecer/core/io/fetch/fetch-api";
import { wrapCimAdapter } from "@dataspecer/core-v2/semantic-model/simplified";
import { SgovAdapter } from "./sgov-adapter.ts";

export function createSgovModel(endpoint: string, httpFetch: HttpFetch, id?: string) {
  return wrapCimAdapter(new SgovAdapter(endpoint, httpFetch), id);
}
