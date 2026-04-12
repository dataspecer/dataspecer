import YAML from "yaml";
import { pickShareableMetadata, ShareableMetadata } from "../export-import-data-api.ts";
import { DatastoreStripHandlerMethod } from "../merge/comparison/resource-datastore-strip-handler-base.ts";


/**
 * @todo Can be format specific, but we just use null for everything
 */
export function getDefaultValueForMissingDatastoreInDiffEditor() {
  return "null";
}


type Result<T, E> =
  | { ok: true; value: T }
  | { ok: false; error: E };

export type ConversionResult<T> = Result<T, string>;


/**
 * Inverse to {@link stringifyDatastoreContentBasedOnFormat}
 * @param shouldConvert if false then returns the given {@link datastoreContent} without performing any converting action.
 * @param resourceDatastoreStripHandler If provided then this method returns the json object stripped of values based on the given strip handler.
 * @returns Returns {@link datastoreContent} in format of string to the format in which is the string content (that is what we got from the name extension, for example .json).
 */
export function convertDatastoreContentBasedOnFormat(
  datastoreContent: string,
  format: string | null,
  shouldConvert: boolean,
  resourceDatastoreStripHandler: DatastoreStripHandlerMethod | null,
): ConversionResult<any> {
  if (!shouldConvert) {
    return {
      ok: true,
      value: datastoreContent,
    };
  }

  try {
    let convertedDatastore: any
    if (format === "json") {
      convertedDatastore = JSON.parse(datastoreContent);
    }
    else if (format === "yaml") {
      convertedDatastore = YAML.parse(datastoreContent);
    }
    else {
      return {
        ok: false,
        error: "The provided format of string is unknown, can not convert to JSON object.",
      }
    }

    if (resourceDatastoreStripHandler !== null) {
      const { strippedDatastore } = resourceDatastoreStripHandler(convertedDatastore, true);
      convertedDatastore = strippedDatastore;
    }

    return {
      ok: true,
      value: convertedDatastore,
    };
  }
  catch (error: any) {
    return {
      ok: false,
      error: error.message,
    };
  }
}

/**
 * @returns The given {@link datastoreContent}, which is in {@link inputFormat} converted to string of format {@link outputFormat}
 */
export function convertDatastoreContentToOutputFormat(
  datastoreContent: string,
  inputFormat: string,
  outputFormat: string,
  shouldConvert: boolean,
  resourceDatastoreStripHandler: DatastoreStripHandlerMethod | null,
): ConversionResult<string> {
  const datastoreAsObject: ConversionResult<any> = convertDatastoreContentBasedOnFormat(datastoreContent, inputFormat, shouldConvert, resourceDatastoreStripHandler);
  if (!datastoreAsObject.ok) {
    return datastoreAsObject;
  }
  const stringifiedObject = stringifyDatastoreContentBasedOnFormat(datastoreAsObject.value, outputFormat, shouldConvert);
  return {
    ok: true,
    value: stringifiedObject,
  };
}


/**
 * Inverse to {@link convertDatastoreContentBasedOnFormat}
 * @returns Stringified {@link datastoreContent}, which was on input in given {@link format}. If {@link shouldConvert}, then just returns the {@link datastoreContent}.
 */
export function stringifyDatastoreContentBasedOnFormat(
  datastoreContent: any,
  format: string | null,      // TODO RadStr: Maybe ExportFormatType instead of string
  shouldConvert: boolean
): string {
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

export function stringifyShareableMetadataInfoFromDatastoreContent(
  metadataContent: string,
  format: string | null,
  resourceDatastoreStripHandler: DatastoreStripHandlerMethod | null,
) {
  const strippedContent = extractShareableMetadata(metadataContent, format, resourceDatastoreStripHandler);
  return stringifyDatastoreContentBasedOnFormat(strippedContent, format, true);
}

/**
 * @param resourceDatastoreStripHandler see {@link convertDatastoreContentBasedOnFormat} to understand this parameter's purpose.
 */
export function extractShareableMetadata(
  metadataContent: string,
  format: string | null,
  resourceDatastoreStripHandler: DatastoreStripHandlerMethod | null,
): ConversionResult<ShareableMetadata> {
  const metadataContentAsJSON = convertDatastoreContentBasedOnFormat(metadataContent, format, true, resourceDatastoreStripHandler);
  if (!metadataContentAsJSON.ok) {
    return metadataContentAsJSON;
  }
  const strippedContent = pickShareableMetadata(metadataContentAsJSON.value);
  return {
    ok: true,
    value: strippedContent,
  };
}
