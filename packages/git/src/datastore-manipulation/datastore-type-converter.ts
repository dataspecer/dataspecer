import YAML from "yaml";
import { pickShareableMetadata, ShareableMetadata } from "../export-import-data-api.ts";

export function getDefaultValueForFormat(format: string | null) {
  return "null";
}


/**
 * Inverse to {@link stringifyDatastoreContentBasedOnFormat}
 * @param shouldConvert if false then returns the given {@link datastoreContent} without performing any converting action.
 * @returns Returns {@link datastoreContent} in format of string to the format in which is the string content (that is what we got from the name extension, for example .json).
 */
export function convertDatastoreContentBasedOnFormat(datastoreContent: string, format: string | null, shouldConvert: boolean): any {
  if (!shouldConvert) {
    return datastoreContent;
  }

  if (format === "json") {
    return JSON.parse(datastoreContent);
  }
  else if (format === "yaml") {
    return YAML.parse(datastoreContent);
  }

  return datastoreContent;
}

/**
 * @returns The given {@link datastoreContent}, which is in {@link inputFormat} converted to string of format {@link outputFormat}
 */
export function convertDatastoreContentForInputFormatToOutputFormat(
  datastoreContent: string,
  inputFormat: string,
  outputFormat: string,
  shouldConvert: boolean
): string {
  const datastoreAsObject: any = convertDatastoreContentBasedOnFormat(datastoreContent, inputFormat, shouldConvert);
  return stringifyDatastoreContentBasedOnFormat(datastoreAsObject, outputFormat, shouldConvert);
}


/**
 * Inverse to {@link convertDatastoreContentBasedOnFormat}
 * @returns Stringified {@link datastoreContent}, which was on input in given {@link format}. If {@link shouldConvert}, then just returns the {@link datastoreContent}.
 */
export function stringifyDatastoreContentBasedOnFormat(datastoreContent: any, format: string | null, shouldConvert: boolean): string {
  if (!shouldConvert) {
    return datastoreContent;
  }

  const indent = 2;

  if (format === "json") {
    return JSON.stringify(datastoreContent, null, indent);
  }
  else if (format === "yaml") {
    return YAML.stringify(datastoreContent, { indent });
  }

  return datastoreContent;
}

export function stringifyShareableMetadataInfoFromDatastoreContent(metadataContent: string, format: string | null) {
  const strippedContent = extractShareableMetadata(metadataContent, format)
  return stringifyDatastoreContentBasedOnFormat(strippedContent, format, true);
}

export function extractShareableMetadata(metadataContent: string, format: string | null): ShareableMetadata {
  const metadataContentAsJSON = convertDatastoreContentBasedOnFormat(metadataContent, format, true);
  const strippedContent = pickShareableMetadata(metadataContentAsJSON);
  return strippedContent;
}