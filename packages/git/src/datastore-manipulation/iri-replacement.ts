import { DirectoryNode } from "../export-import-data-api.ts";
import { FilesystemAbstraction } from "../filesystem/abstractions/filesystem-abstraction.ts";

/**
 * We have to replace each iri inside the {@link datastoreToSearchInForIris} object, which we copy by the iris which exists in the new resources/packages
 * @returns The iris, which could not be replaced, because the resources, which have them do not exist (we have to create them first and get the created iris).
 *  and the copy of {@link datastoreToSearchInForIris} with replaced every iri we could.
 */
export function createDatastoreWithReplacedIris(datastoreToSearchInForIris: object, irisMap: Record<string, string | null>) {
  const allIrisToCheckFor: string[] = Object.keys(irisMap);
  const missingIrisInNew: string[] = [];
  const datastoreWithReplacedIris: object = {};
  const containedIriToReplace = replaceIrisInDatastoreAndCollectMissingOnes(datastoreToSearchInForIris, allIrisToCheckFor, irisMap, missingIrisInNew, datastoreWithReplacedIris);

  return {
    missingIrisInNew: Array.from(new Set(missingIrisInNew)),
    datastoreWithReplacedIris,
    containedIriToReplace,
  };
}

// TODO RadStr: the placeholder either has to at least hold the old iri as suffix, otherwise we can not perform the replacing
// export const PLACEHOLDER_REPLACEMENT_IRI = "PLACEHOLDER-IRI-WHICH-WILL-BE-REPLACED-ON-BACKEND-STORE";


function replaceIrisInDatastoreAndCollectMissingOnes(
  originalDatastore: Record<string, any>,
  allIrisToCheckFor: string[],
  irisMap: Record<string, string | null>,
  // Outputs to extend
  missingIrisInNew: string[],
  datastoreWithReplacedIris: Record<string, any>,
): boolean {
  let containedIriToReplace: boolean = false;

  for (const [key, value] of Object.entries(originalDatastore)) {
    if (key === "projectIri") {     // Project IRIs are kept as they are
      datastoreWithReplacedIris[key] = value;
      continue;
    }


    // We have to also replace the keys
    let newKey = key;
    // TODO RadStr PR: Do it through includes?
    if (allIrisToCheckFor.includes(key)) {
      const keyReplacementResult = getReplacementForNonComposite(key, allIrisToCheckFor, irisMap, missingIrisInNew);
      if (keyReplacementResult.containedIriToReplace) {
        newKey = keyReplacementResult.replacementIri;
      }
    }


    // Try replace value or perform recurive calls, based on the type of value
    if (Array.isArray(value)) {
      datastoreWithReplacedIris[newKey] = [];
      value.forEach((item, index) => {
        if (typeof item === "object" && item !== null) {
          const objectToPutIntoArray = {};
          datastoreWithReplacedIris[newKey].push(objectToPutIntoArray);
          // It is actually important to do it separately and not use ||= since if the containedIriToReplace is true, we won't run the recursion.
          const containedIriToReplaceInRecursion = replaceIrisInDatastoreAndCollectMissingOnes(item, allIrisToCheckFor, irisMap, missingIrisInNew, objectToPutIntoArray);
          containedIriToReplace ||= containedIriToReplaceInRecursion;
        }
        else {
          const replacementResult = getReplacementForNonComposite(item, allIrisToCheckFor, irisMap, missingIrisInNew);
          datastoreWithReplacedIris[newKey].push(replacementResult.replacementIri);
          containedIriToReplace ||= replacementResult.containedIriToReplace;
        }
      });
    }
    else if (typeof value === "object" && value !== null) {
      if (Object.entries(value).length === 0) {   // For example date has to be handled like this
        datastoreWithReplacedIris[newKey] = value;
      }
      else {
        datastoreWithReplacedIris[newKey] = {};
        const containedIriToReplaceInRecursion = replaceIrisInDatastoreAndCollectMissingOnes(value, allIrisToCheckFor, irisMap, missingIrisInNew, datastoreWithReplacedIris[newKey]);
        containedIriToReplace ||= containedIriToReplaceInRecursion;
      }
    }
    else {
      const replacementResult = getReplacementForNonComposite(value, allIrisToCheckFor, irisMap, missingIrisInNew);
      datastoreWithReplacedIris[newKey] = replacementResult.replacementIri;
      containedIriToReplace ||= replacementResult.containedIriToReplace;
    }
  }

  return containedIriToReplace;
}

type ReplacementForNonCompositeResult = {
  containedIriToReplace: boolean;
  /**
   * If no change then it is equal to the input.
   */
  replacementIri: string;

  isReplacementMissing: boolean;
}


/**
 * @todo TODO RadStr PR: Actually does not work if we have a string that contains more IRIs or the string contains IRI + something else - then we lose the something else after replacement
 * @param originalIri it is named iri but it does not necessary have to be iri it is just to value which can be iri and can be possibly replaced
 */
function getReplacementForNonComposite(
  originalIri: any,
  allIrisToCheckFor: string[],
  irisMap: Record<string, string | null>,
  missingIrisInNew: string[],     // Output to extend
): ReplacementForNonCompositeResult {
  let isReplacementMissing: boolean = false;
  let containedIriToReplace: boolean = false;
  if (typeof originalIri !== "string") {
    return {
      containedIriToReplace: false,
      replacementIri: originalIri,
      isReplacementMissing: false,
    };
  }

  let replacementIri: string;
  // TODO RadStr PR: Again includes? Or look for substrings? like {my-iri}#some-other-part or even {my-iri2}#some-other-part{my-iri2}
  if (allIrisToCheckFor.includes(originalIri)) {
    containedIriToReplace = true;
    replacementIri = irisMap[originalIri] ?? null;
    if (replacementIri === null) {
      isReplacementMissing = true;
      missingIrisInNew.push(originalIri);
      // replacementIri = PLACEHOLDER_REPLACEMENT_IRI;    // TODO RadStr: the placeholder either has to at least hold the old iri as suffix, otherwise we can not perform the replacing
      // TODO RadStr: Using the old iri is fine, we just have to make sure to replace it if it happens
      replacementIri = originalIri;
    }
  }
  else {
    replacementIri = originalIri;
  }

  return {
    containedIriToReplace,
    replacementIri,
    isReplacementMissing,
  };
}

/**
 * The use case is that the {@link filesystemWithIrisToKeep} is the filesystem to which we are committing and want to keep its IRIs.
 *  {@link theReplacingFilesystem} is the filesystem that will "replace" the {@link filesystemWithIrisToKeep}.
 * @param filesystemWithIrisToKeep A -> B
 * @param theReplacingFilesystem B -> C
 * @returns A -> C
 */
export function createTransitiveMapFromFilesystems(filesystemWithIrisToKeep: FilesystemAbstraction, theReplacingFilesystem: FilesystemAbstraction): Record<string, string> {
  const left = createIriMapping(theReplacingFilesystem, "iri", "projectIri");
  const right = createIriMapping(filesystemWithIrisToKeep, "projectIri", "iri");
  return createTransitiveMap(left, right);
}

export type IriType = "iri" | "projectIri";

export function createIriMapping(
  filesystem: FilesystemAbstraction,
  fromIri: IriType,
  toIri: IriType
): Record<string, string> {
  const mapping: Record<string, string> = {};
  createIriMappingInternal(filesystem.getRoot(), fromIri, toIri, mapping);
  return mapping;
}

export function createIriMappingInternal(
  directoryNode: DirectoryNode,
  fromIri: IriType,
  toIri: IriType,
  mapping: Record<string, string>
): void {
  mapping[directoryNode.metadata[fromIri]] = directoryNode.metadata[toIri];
  for (const childNode of Object.values(directoryNode.content)) {
    mapping[childNode.metadata[fromIri]] = childNode.metadata[toIri];
    if (childNode.type === "directory") {
      createIriMappingInternal(childNode, fromIri, toIri, mapping);
    }
  }
}

/**
 * @param leftMap A -> B
 * @param rightMap B -> C
 * @returns A -> C
 */
function createTransitiveMap(leftMap: Record<string, string>, rightMap: Record<string, string>): Record<string, string> {
  const transitiveMap: Record<string, string> = {};
  for (const [a, b] of Object.entries(leftMap)) {
    if (a === "fake-root") {
      continue;
    }
    transitiveMap[a] = rightMap[b];
  }
  return transitiveMap;
}
