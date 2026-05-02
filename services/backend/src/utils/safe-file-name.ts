/**
 * Generates a Content-Disposition header value.
 * @param {string} asciiName - A fallback name containing only ASCII characters.
 * @param {string} unicodeName - The full name, potentially containing Unicode characters.
 * @returns {string} The formatted header value.
 */
export function getContentDispositionAttachmentHeaderValue(asciiName: string, unicodeName: string) {
  // 1. Sanitize the ASCII name by removing double quotes and backslashes
  const safeAscii = asciiName.replace(/["\\]/g, '');

  // 2. Encode the Unicode name according to RFC 5987
  // It needs to be URI encoded, and then we fix specific characters
  // that encodeURIComponent doesn't handle strictly for this header.
  const encodedUnicode = encodeURIComponent(unicodeName)
    // The following creates the sequences %27 %28 %29 %2A (Note that
    // the valid encoding of "*" is %2A, which necessitates calling
    // toUpperCase() to properly encode). Although RFC3986 reserves "!",
    // RFC5987 does not, so we do not need to escape it.
    .replace(
      /['()*]/g,
      (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`,
    )
    // The following are not required for percent-encoding per RFC5987,
    // so we can allow for a little better readability over the wire: |`^
    .replace(/%(7C|60|5E)/g, (_, hex) =>
      String.fromCharCode(parseInt(hex, 16)),
    )

  return `attachment; filename="${safeAscii}"; filename*=UTF-8''${encodedUnicode}`;
}

export function safeUnicodeFileName(input: string, fallback: string) {
  input = input.replace(/ *[\\\/:\*\?"<>|] +/g, " ");
  input = input.replace(/ +[\\\/:\*\?"<>|]/g, " ");
  input = input.replace(/[\\\/:\*\?"<>|]/g, "-");
  input = input.trim();
  if (input.length === 0) {
    return fallback;
  }
  return input;
}

export function safeAsciiFileName(input: string, fallback: string) {
  input = input
    // 1. Decompose combined characters (like 'é' into 'e' + '´')
    .normalize('NFD')
    // 2. Remove the combining marks (accents) specifically
    // This targets the Unicode Range for "Mark, Nonspacing"
    .replace(/[\u0300-\u036f]/g, "");

  input = input.replace(/ *[^a-zA-Z0-9._-]+ +/g, " ");
  input = input.replace(/ +[^a-zA-Z0-9._-]+/g, " ");
  input = input.replace(/[^a-zA-Z0-9 ._-]+/g, "-");
  input = input.trim();
  if (input.length === 0) {
    return fallback;
  }
  return input;
}