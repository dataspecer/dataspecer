import type { LanguageString } from "@dataspecer/core/core/core-resource"
import type { SparqlRow, SparqlTerm } from "./sparql-client"
import { assertNonNegativeInteger, labelOrIri, toLanguageString } from "./sparql-utils"
import type { CandidateFilter, Page, PageRequest, SourceCandidate, SourceGroup, VocabularySource } from "./types"

/*
 * The listing shared by the sources whose catalogue is small enough to be read at once.
 * The source reads all its vocabularies with their groups, pages, searches and counts are made in the browser. 
 */

/**
 * The rows a source reads its catalogue from. The columns are the same for every source:
 * - catalogue = a row for each title of each vocabulary: ?dataset, ?group and ?title (missing for a vocabulary without a title)
 * - groupNames = a row for each name of each group: ?group and ?name (missing for a group without a name)
 */
export interface CatalogueRows {
  catalogue: SparqlRow[]
  groupNames: SparqlRow[]
}

/**
 * - sortLanguage = the language the vocabularies are sorted by their title in.
 */
export interface CatalogueOptions {
  sortLanguage: string
}

/**
 * A vocabulary of the catalogue.
 * - sortKey = the title in the sort language in lower case, or another title after a "~" when there is none
 * - searchText = the titles in lower case, one per line
 */
interface CatalogueEntry {
  id: string
  title: LanguageString
  groupId: string
  sortKey: string
  searchText: string
}

/**
 * All the vocabularies of the catalogue and their groups, ready to be paged and searched.
 */
export interface Catalogue {
  /** In the order of the sort key. */
  entries: CatalogueEntry[]
  /** The biggest first. */
  groups: SourceGroup[]
}

function compare(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0
}

/**
 * The sort key of a vocabulary: the smallest of its titles, where a title in the sort language counts as itself
 * and any other as coming after all of those. A vocabulary without a title sorts last.
 */
function sortKeyOf(titles: SparqlTerm[], sortLanguage: string): string {
  const keys = titles.map((title) => {
    const text = title.value.toLowerCase()
    return title["xml:lang"] === sortLanguage ? text : `~${text}`
  })
  return keys.length === 0 ? "~" : keys.reduce((smallest, key) => (key < smallest ? key : smallest))
}

/**
 * Builds the catalogue from its rows. The rows of one vocabulary are merged, and the vocabularies are
 * put in the order of the sort key, then of their IRI. A vocabulary without a title is titled by its IRI, and
 * a group without a name is labeled by its IRI. The groups are those that have a vocabulary.
 */
export function buildCatalogue({ catalogue, groupNames }: CatalogueRows, { sortLanguage }: CatalogueOptions): Catalogue {
  const datasets = new Map<string, { groupId: string, titles: SparqlTerm[] }>()
  for (const row of catalogue) {
    const id = row.dataset?.value
    const groupId = row.group?.value
    if (id === undefined || groupId === undefined) {
      continue
    }
    const dataset = datasets.get(id) ?? { groupId, titles: [] }
    datasets.set(id, dataset)
    if (row.title !== undefined) {
      dataset.titles.push(row.title)
    }
  }

  const entries = [...datasets].map(([id, { groupId, titles }]): CatalogueEntry => {
    const title = labelOrIri(toLanguageString(titles), id)
    return {
      id,
      title,
      groupId,
      sortKey: sortKeyOf(titles, sortLanguage),
      searchText: Object.values(title).join("\n").toLowerCase(),
    }
  }).sort((a, b) => compare(a.sortKey, b.sortKey) || compare(a.id, b.id))

  const counts = new Map<string, number>()
  for (const entry of entries) {
    counts.set(entry.groupId, (counts.get(entry.groupId) ?? 0) + 1)
  }
  const names = new Map<string, SparqlTerm[]>()
  for (const row of groupNames) {
    const id = row.group?.value
    if (id !== undefined) {
      names.set(id, [...(names.get(id) ?? []), ...(row.name === undefined ? [] : [row.name])])
    }
  }
  const groups = [...counts]
    .map(([id, count]): SourceGroup => ({ id, count, label: labelOrIri(toLanguageString(names.get(id) ?? []), id) }))
    .sort((a, b) => b.count - a.count || compare(a.id, b.id))
  return { entries, groups }
}

/**
 * Cuts the page out of the list.
 */
function pageOf<T>(items: T[], request: PageRequest): Page<T> {
  assertNonNegativeInteger(request.limit, "limit")
  assertNonNegativeInteger(request.offset, "offset")
  return { items: items.slice(request.offset, request.offset + request.limit), total: items.length }
}

/**
 * A page of the groups, the biggest first.
 */
export function listGroups(catalogue: Catalogue, request: PageRequest): Page<SourceGroup> {
  return pageOf(catalogue.groups, request)
}

/**
 * A page of the vocabularies that satisfy the filter, in the order of the catalogue. The text is searched in the
 * titles in all the languages the catalogue has, ignoring case. Each vocabulary is labeled with the name of its group.
 */
export function listCandidates(catalogue: Catalogue, filter: CandidateFilter, request: PageRequest): Page<SourceCandidate> {
  const text = filter.query?.trim().toLowerCase()
  const found = catalogue.entries.filter((entry) =>
    (filter.groupId === undefined || entry.groupId === filter.groupId)
    && (!text || entry.searchText.includes(text)))
  const page = pageOf(found, request)
  const labels = new Map(catalogue.groups.map((group) => [group.id, group.label]))
  return {
    total: page.total,
    items: page.items.map((entry) => ({ id: entry.id, title: entry.title, groupLabel: labels.get(entry.groupId) ?? {} })),
  }
}

/**
 * Creates the listing of a source from the function that reads its catalogue.
 *
 * The catalogue is read with the first listing and kept for all the following ones, including those that
 * start while it is still being read. It is shared, so reading it is not cancelled together with the listing
 * that started it. A failed reading is forgotten, so that the next listing tries again.
 */
export function createCatalogueListing(
  read: () => Promise<CatalogueRows>,
  options: CatalogueOptions,
): Required<Pick<VocabularySource, "listGroups" | "listCandidates">> {
  let catalogue: Promise<Catalogue> | null = null
  const load = (): Promise<Catalogue> => {
    const loading = catalogue ?? read().then((rows) => buildCatalogue(rows, options))
    catalogue = loading
    loading.catch(() => {
      if (catalogue === loading) {
        catalogue = null
      }
    })
    return loading
  }
  return {
    listGroups: async (request) => listGroups(await load(), request),
    listCandidates: async (filter, request) => listCandidates(await load(), filter, request),
  }
}
