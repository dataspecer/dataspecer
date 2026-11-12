/**
 * Matches an IRI prefix that has at least one path segment after the host,
 * for example `https://example.org/codelist/`.
 */
const PREFIX_WITH_PATH = /^[a-z][a-z0-9+.-]*:\/\/[^\/]+\/.+/i

function escapeRegex(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
}

function commonPrefix(values: string[]): string {
  let prefix = values[0]
  for (const value of values) {
    let length = 0
    while (length < prefix.length && length < value.length && prefix[length] === value[length]) {
      length++
    }
    prefix = prefix.slice(0, length)
  }
  return prefix
}

/**
 * Builds a regular expression source matching the IRIs that start with the prefix.
 */
export function iriPrefixPattern(prefix: string): string {
  return `^${escapeRegex(prefix)}.*$`
}

/**
 * Builds a regular expression source matching the IRIs of vocabulary values.
 *
 * The pattern is the longest common prefix of the given IRIs, cut back to its last `/` or `#`
 * so that it never ends in the middle of a name. 
 * Returns null when no meaningful pattern exists: fewer than two distinct IRIs, or a common prefix that is no more than a host.
 */
export function buildIriPattern(iris: string[]): string | null {
  const distinct = [...new Set(iris)]
  if (distinct.length < 2) {
    return null
  }
  const prefix = commonPrefix(distinct)
  const boundary = Math.max(prefix.lastIndexOf("/"), prefix.lastIndexOf("#"))
  if (boundary < 0) {
    return null
  }
  const base = prefix.slice(0, boundary + 1)
  if (!PREFIX_WITH_PATH.test(base)) {
    return null
  }
  return iriPrefixPattern(base)
}
