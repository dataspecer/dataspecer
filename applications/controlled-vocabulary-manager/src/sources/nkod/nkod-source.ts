import { runSparqlSelect, type SparqlRow } from "../sparql-client"
import type { Page, PageRequest, RequestOptions, VocabularySource } from "../types"
import { buildDetail, distributionsQuery, recordQuery } from "./detail"
import {
  candidateCountQuery,
  candidatesQuery,
  mapCandidateRows,
  mapPublisherRows,
  publisherCountQuery,
  publishersQuery,
  readCount,
} from "./listing"
import { readMetadata } from "./metadata"

export const NKOD_SPARQL_ENDPOINT = "https://data.gov.cz/sparql"

export interface NkodSourceDependencies {
  /** Replaces the global fetch, for tests. */
  fetch?: typeof fetch
}

/**
 * The Czech National Open Data Catalog (NKOD) SPARQL endpoint. 
 * The vocabularies are the datasets of the catalog that conform to the open formal norm for codelists,
 * browsed by their publishers.
 */
export function createNkodSource(dependencies: NkodSourceDependencies = {}): VocabularySource {
  const run = (query: string, options?: RequestOptions) =>
    runSparqlSelect(NKOD_SPARQL_ENDPOINT, query, { signal: options?.signal, fetch: dependencies.fetch })

  /**
   * Loads a page of a listing. The whole listing is counted only when the
   * request does not bring the count of an earlier page.
   */
  async function loadPage<T>(
    request: PageRequest,
    countQuery: string,
    pageQuery: string,
    map: (rows: SparqlRow[]) => T[],
    options?: RequestOptions,
  ): Promise<Page<T>> {
    const [countRows, pageRows] = await Promise.all([
      request.total === undefined ? run(countQuery, options) : Promise.resolve([]),
      run(pageQuery, options),
    ])
    return { items: map(pageRows), total: request.total ?? readCount(countRows, "total") }
  }

  return {
    id: "nkod",
    listGroups: (request, options) => loadPage(
      request,
      publisherCountQuery(),
      publishersQuery(request.limit, request.offset),
      mapPublisherRows,
      options,
    ),
    listCandidates: (filter, request, options) => loadPage(
      request,
      candidateCountQuery(filter),
      candidatesQuery(filter, request.limit, request.offset),
      mapCandidateRows,
      options,
    ),
    getDetail: async (candidateId, options) => {
      const [recordRows, distributionRows] = await Promise.all([
        run(recordQuery(candidateId), options),
        run(distributionsQuery(candidateId), options),
      ])
      return buildDetail(candidateId, recordRows, distributionRows)
    },
    getMetadata: (detail, distributionId, options) =>
      readMetadata(detail, distributionId, options, { fetch: dependencies.fetch }),
  }
}

export const nkodSource = createNkodSource()
