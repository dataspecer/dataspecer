/**
 * One term of a SPARQL result row, in the SPARQL 1.1 JSON results format.
 */
export interface SparqlTerm {
  type: string
  value: string
  "xml:lang"?: string
  datatype?: string
}

/**
 * One row of a SELECT result: the terms by variable name. 
 * Variables that are unbound in the row are missing.
 */
export type SparqlRow = Record<string, SparqlTerm>

/**
 * Why a query failed:
 * - network = the endpoint could not be reached, or the browser blocked the request
 * - timeout = no complete answer within the time limit
 * - aborted = the caller cancelled the query
 * - http = the endpoint answered with an error status, `status` and `message` tell which
 * - parse = the answer is not a SPARQL JSON result
 */
export type SparqlErrorKind = "network" | "timeout" | "aborted" | "http" | "parse"

export class SparqlError extends Error {
  readonly kind: SparqlErrorKind
  readonly status?: number

  constructor(kind: SparqlErrorKind, message: string, status?: number) {
    super(message)
    this.name = "SparqlError"
    this.kind = kind
    this.status = status
  }
}

export interface SparqlOptions {
  /** Cancels the query, which then fails with the kind "aborted". */
  signal?: AbortSignal
  /** Time limit of the whole request in milliseconds, 30 000 by default. */
  timeoutMs?: number
  /** Replaces the global fetch, for tests. */
  fetch?: typeof fetch
}

const DEFAULT_TIMEOUT_MS = 30_000

/**
 * The part of an error response worth showing: its first non-empty line.
 */
async function readErrorMessage(response: Response): Promise<string> {
  try {
    const text = await response.text()
    const line = text.split("\n").find((candidate) => candidate.trim() !== "")
    // HTML pages, such as those of a gateway timeout, are not worth showing.
    if (line !== undefined && !line.trim().startsWith("<")) {
      return line.trim()
    }
  } catch {
    // The status is enough.
  }
  return response.statusText
}

function isRow(value: unknown): value is SparqlRow {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

/**
 * Runs a SPARQL SELECT query on the endpoint and returns the result rows.
 *
 * The query is sent with GET and no custom headers other than Accept, because
 * the endpoints allow cross-origin requests from the browser only for such
 * requests.
 */
export async function runSparqlSelect(
  endpoint: string,
  query: string,
  options: SparqlOptions = {},
): Promise<SparqlRow[]> {
  const { signal, timeoutMs = DEFAULT_TIMEOUT_MS, fetch: fetchImplementation = fetch } = options
  const timeout = AbortSignal.timeout(timeoutMs)
  const combined = signal === undefined ? timeout : AbortSignal.any([signal, timeout])
  const url = `${endpoint}?${new URLSearchParams({ query })}`

  let response: Response
  let body: unknown
  try {
    response = await fetchImplementation(url, {
      headers: { Accept: "application/sparql-results+json" },
      signal: combined,
    })
    if (!response.ok) {
      throw new SparqlError("http", await readErrorMessage(response), response.status)
    }
    body = await response.json()
  } catch (error) {
    if (error instanceof SparqlError) {
      throw error
    }
    if (signal?.aborted) {
      throw new SparqlError("aborted", "The query was cancelled.")
    }
    if (timeout.aborted) {
      throw new SparqlError("timeout", `The endpoint did not answer in ${timeoutMs} ms.`)
    }
    if (error instanceof SyntaxError) {
      throw new SparqlError("parse", "The answer of the endpoint is not valid JSON.")
    }
    throw new SparqlError("network", error instanceof Error ? error.message : "The endpoint could not be reached.")
  }

  const bindings = (body as { results?: { bindings?: unknown } } | null)?.results?.bindings
  if (!Array.isArray(bindings) || !bindings.every(isRow)) {
    throw new SparqlError("parse", "The answer of the endpoint is not a SPARQL result.")
  }
  return bindings
}
