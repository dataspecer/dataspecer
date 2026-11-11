import { describe, expect, test, vi } from "vitest"
import { runSparqlSelect, SparqlError, type SparqlErrorKind } from "./sparql-client"

const ENDPOINT = "https://example.org/sparql"

function jsonResponse(body: unknown, init?: ResponseInit): Response {
  return new Response(JSON.stringify(body), { status: 200, ...init })
}

function mockFetch(response: Response | Error) {
  return vi.fn<typeof fetch>(async () => {
    if (response instanceof Error) {
      throw response
    }
    return response
  })
}

/**
 * A fetch that never answers and rejects with the abort reason of its signal,
 * at once when the signal is already aborted, as the real fetch does.
 */
function hangingFetch() {
  return vi.fn<typeof fetch>((_input, init) => new Promise((_resolve, reject) => {
    const signal = init?.signal
    if (signal?.aborted) {
      reject(signal.reason)
    }
    signal?.addEventListener("abort", () => reject(signal.reason))
  }))
}

async function failureKind(promise: Promise<unknown>): Promise<{ kind: SparqlErrorKind, error: SparqlError }> {
  try {
    await promise
  } catch (error) {
    expect(error).toBeInstanceOf(SparqlError)
    return { kind: (error as SparqlError).kind, error: error as SparqlError }
  }
  throw new Error("The query was expected to fail.")
}

describe("runSparqlSelect", () => {
  test("sends the query with GET and only the Accept header", async () => {
    const fetchMock = mockFetch(jsonResponse({ results: { bindings: [] } }))
    await runSparqlSelect(ENDPOINT, 'SELECT ?s WHERE { ?s ?p "č & =" }', { fetch: fetchMock })

    const [url, init] = fetchMock.mock.calls[0]
    const parsed = new URL(url as string)
    expect(`${parsed.origin}${parsed.pathname}`).toBe(ENDPOINT)
    expect(parsed.searchParams.get("query")).toBe('SELECT ?s WHERE { ?s ?p "č & =" }')
    expect(init?.method ?? "GET").toBe("GET")
    expect(init?.headers).toEqual({ Accept: "application/sparql-results+json" })
  })

  test("returns the result rows", async () => {
    const rows = [
      { s: { type: "uri", value: "https://example.org/a" }, n: { type: "literal", value: "2", datatype: "http://www.w3.org/2001/XMLSchema#integer" } },
      { s: { type: "uri", value: "https://example.org/b" } },
    ]
    const result = await runSparqlSelect(ENDPOINT, "SELECT *", { fetch: mockFetch(jsonResponse({ head: { vars: [] }, results: { bindings: rows } })) })
    expect(result).toEqual(rows)
  })

  test("fails with the status and the first line of an error answer", async () => {
    const response = new Response("\nVirtuoso 37000 Error SP030: syntax error at 'SELEKT'\n\nSPARQL query:", { status: 400, statusText: "Bad Request" })
    const { kind, error } = await failureKind(runSparqlSelect(ENDPOINT, "SELEKT", { fetch: mockFetch(response) }))
    expect(kind).toBe("http")
    expect(error.status).toBe(400)
    expect(error.message).toBe("Virtuoso 37000 Error SP030: syntax error at 'SELEKT'")
  })

  test("does not show an HTML error page", async () => {
    const response = new Response("<!DOCTYPE html><html>Gateway Timeout</html>", { status: 504, statusText: "Gateway Timeout" })
    const { kind, error } = await failureKind(runSparqlSelect(ENDPOINT, "SELECT *", { fetch: mockFetch(response) }))
    expect(kind).toBe("http")
    expect(error.status).toBe(504)
    expect(error.message).toBe("Gateway Timeout")
  })

  test("fails with parse when the answer is not JSON", async () => {
    const { kind } = await failureKind(runSparqlSelect(ENDPOINT, "SELECT *", { fetch: mockFetch(new Response("not json", { status: 200 })) }))
    expect(kind).toBe("parse")
  })

  test("fails with parse when the answer is not a SELECT result", async () => {
    for (const body of [{ boolean: true }, { results: {} }, { results: { bindings: [1] } }, null, []]) {
      const { kind } = await failureKind(runSparqlSelect(ENDPOINT, "SELECT *", { fetch: mockFetch(jsonResponse(body)) }))
      expect(kind).toBe("parse")
    }
  })

  test("fails with network when the endpoint cannot be reached", async () => {
    const { kind, error } = await failureKind(runSparqlSelect(ENDPOINT, "SELECT *", { fetch: mockFetch(new TypeError("Failed to fetch")) }))
    expect(kind).toBe("network")
    expect(error.message).toBe("Failed to fetch")
  })

  test("fails with timeout when there is no answer in time", async () => {
    const { kind } = await failureKind(runSparqlSelect(ENDPOINT, "SELECT *", { fetch: hangingFetch(), timeoutMs: 20 }))
    expect(kind).toBe("timeout")
  })

  test("fails with aborted when the caller cancels", async () => {
    const controller = new AbortController()
    const promise = runSparqlSelect(ENDPOINT, "SELECT *", { fetch: hangingFetch(), signal: controller.signal })
    controller.abort()
    const { kind } = await failureKind(promise)
    expect(kind).toBe("aborted")
  })

  test("fails with aborted when the signal is already aborted", async () => {
    const { kind } = await failureKind(runSparqlSelect(ENDPOINT, "SELECT *", { fetch: hangingFetch(), signal: AbortSignal.abort() }))
    expect(kind).toBe("aborted")
  })
})
