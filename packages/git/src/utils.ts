/**
 * Note that we also use this on paths on filesystem for {@link ClassicFilesystem}.
 * This is for simplicity and uniformity, even though we should ideally use "\\" on Windows (that is path.sep).
 * But it really complicates stuff since we then have to spend extra mental capacity on thinking whether given can use OS specific separators or it is IRI.
 * @returns Given {@link pathParts} joined by "/".
 */
export function dsPathJoin(...pathParts: string[]) {
  return pathParts.filter(pathPart => pathPart !== "").join("/");
}

/**
 * @returns The index of the {@link n}-th last {@link separator} in given {@link value}. -1 there is not enough separators.
 * @example name = "a.b.c.d", separator = ".", n = 3 returns 1
 */
export function findNthlastSeparator(value: string, separator: string, n: number): number {
  let index = value.length + 1;
  for (let i = 0; i < n; i++) {
    index = value.lastIndexOf(separator, index - 1);
    if (index === -1) {
      return -1;
    }
  }

  return index;
}
