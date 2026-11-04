import { runSparqlSelect, type SparqlRow } from "../sparql-client"
import { readCount } from "../sparql-utils"
import type { Page, PageRequest, RequestOptions, SourceGroup, VocabularySource } from "../types"
import { buildDetail, distributionsQuery, recordQuery } from "./detail"
import {
  candidateCountQuery,
  candidatesQuery,
  groupCountQuery,
  groupsQuery,
  mapCandidateRows,
  mapGroupRows,
} from "./listing"
import { readMetadata } from "./metadata"

/**
 * The endpoint of the European Data Portal, which has the Reference Data Catalogue of EU Vocabularies.
 * The endpoint of the Publications Office itself does not allow requests from a browser.
 */
export const EU_SPARQL_ENDPOINT = "https://data.europa.eu/sparql"

/**
 * The groups are few, this many are read at once to label the vocabularies with them.
 */
const ALL_GROUPS = 100

export interface EuSourceDependencies {
  /** Replaces the global fetch, for tests. */
  fetch?: typeof fetch
}

/**
 * The Reference Data Catalogue of EU Vocabularies, read from the SPARQL endpoint of the European Data Portal.
 * The vocabularies are the named authority lists, code lists, taxonomies and thesauri of the catalogue,
 * browsed by the bodies that created them.
 */
export function createEuSource(dependencies: EuSourceDependencies = {}): VocabularySource {
  const run = (query: string, options?: RequestOptions) =>
    runSparqlSelect(EU_SPARQL_ENDPOINT, query, { signal: options?.signal, fetch: dependencies.fetch })

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

  // The groups label the vocabularies in the listing. A failure to load them leaves the vocabularies unlabeled.
  // They are shared by the listings, so loading them is not cancelled together with the listing that started it.
  let groups: Promise<SourceGroup[]> | null = null
  const loadGroups = (): Promise<SourceGroup[]> => {
    const loading = groups ?? run(groupsQuery(ALL_GROUPS, 0)).then(mapGroupRows)
    groups = loading
    loading.catch(() => {
      if (groups === loading) {
        groups = null
      }
    })
    return loading.catch(() => [])
  }

  return {
    id: "eu-vocabularies",
    listGroups: (request, options) => loadPage(
      request,
      groupCountQuery(),
      groupsQuery(request.limit, request.offset),
      mapGroupRows,
      options,
    ),
    listCandidates: async (filter, request, options) => {
      const [page, labels] = await Promise.all([
        loadPage(
          request,
          candidateCountQuery(filter),
          candidatesQuery(filter, request.limit, request.offset),
          (rows) => rows,
          options,
        ),
        loadGroups(),
      ])
      return { items: mapCandidateRows(page.items, labels), total: page.total }
    },
    getDetail: async (candidateId, options) => {
      const [recordRows, distributionRows] = await Promise.all([
        run(recordQuery(candidateId), options),
        run(distributionsQuery(candidateId), options),
      ])
      return buildDetail(candidateId, recordRows, distributionRows)
    },
    getMetadata: (detail, distributionId, options) => readMetadata(detail, distributionId, options, { run }),
  }
}

export const euSource = createEuSource()
