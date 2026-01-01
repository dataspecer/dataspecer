/**
 * Note that we also use this on paths on filesystem for {@link ClassicFilesystem}.
 * This is for simplicity and uniformity, even though we should ideally use "\\" on Windows (that is path.sep).
 * But it really complicates stuff since we then have to spend extra mental capacity on thinking whether given can use OS specific separators or it is IRI.
 * @returns Given {@link pathParts} joined by "/".
 */
export function dsPathJoin(...pathParts: string[]) {
  return pathParts.filter(pathPart => pathPart !== "").join("/");
}
