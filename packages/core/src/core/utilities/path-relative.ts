/**
 * Returns the relative path between files from {@param from} to {@param to}.
 * Works for both file system paths starting with / and URLs starting with
 * http(s)://. Supports query strings and fragments.
 *
 * @param useAbsoluteIfHttp If true and the path is a URL, it will return the
 * absolute path, effectively ignoring the from parameter. Otherwise, it will
 * try to create relative paths for same origin URLs.
 *
 * ! Directories must end with a slash (/). If they don't, they are treated as files.
 *
 * Note: Most webservers are kind and if the link points to a directory
 * (.../dir) they redirect first to slash version of that.
 */
export function pathRelative(from: string, to: string, useAbsoluteIfHttp: boolean = false): string {
  try {
    const isHttp = /^https?:\/\//i.test(to);
    if (isHttp && useAbsoluteIfHttp) return to;

    const base = "http://domain.internal";
    const fromUrl = new URL(from, base);
    const toUrl = new URL(to, base);

    // Handle cross-origin or cross-protocol
    if (fromUrl.origin !== toUrl.origin) {
      return to;
    }

    // Same origins, calculate relative path

    const fromPathname = fromUrl.pathname;
    const toPathname = toUrl.pathname;

    // Case with same pathnames
    if (fromPathname === toPathname) {
      return toUrl.search + toUrl.hash;
    }

    // The hard part: Relative paths are calculated relative to directories

    const fromDirs = fromPathname.split("/").filter(Boolean);
    const toDirs = toPathname.split("/").filter(Boolean);
    let fromFilename: string | null = null;
    let toFilename: string | null = null;
    if (!fromPathname.endsWith("/") && fromDirs.length > 0) {
      fromFilename = fromDirs.pop();
    }
    if (!toPathname.endsWith("/") && toDirs.length > 0) {
      toFilename = toDirs.pop();
    }

    //

    let sameDirectories = 0;
    while (sameDirectories < fromDirs.length && sameDirectories < toDirs.length && fromDirs[sameDirectories] === toDirs[sameDirectories]) {
      sameDirectories++;
    }

    let finalPath = "";

    if (sameDirectories === fromDirs.length) {
      finalPath = ".";
    } else {
      finalPath = Array(fromDirs.length - sameDirectories)
        .fill("..")
        .join("/");
    }

    if (sameDirectories < toDirs.length) {
      finalPath += "/";
      finalPath += toDirs.slice(sameDirectories).join("/");
      finalPath += "/";
    }

    if (toFilename) {
      if (!finalPath.endsWith("/")) {
        finalPath += "/";
      }
      finalPath += toFilename;
    }

    return finalPath + toUrl.search + toUrl.hash;
  } catch (e) {
    return to;
  }
}
