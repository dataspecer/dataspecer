import { DirectoryNode } from "../export-import-data-api.ts";
import { FilesystemAbstraction } from "../filesystem/abstractions/filesystem-abstraction.ts";

/**
 * We have to replace each iri inside the {@link datastoreToSearchInForIris} object, which we copy by the iris which exists in the new resources/packages
 * @param shouldRunTestVariant Should be true if we are running tests. This variant contains additional checks that we matched all IRIs that we expected to match
 * @returns The iris, which could not be replaced, because the resources, which have them do not exist (we have to create them first and get the created iris).
 *  and the copy of {@link datastoreToSearchInForIris} with replaced every iri we could.
 */
export function createDatastoreWithReplacedIris(
  datastoreToSearchInForIris: object,
  irisMap: Record<string, string | null>,
  shouldRunTestVariant?: boolean,
) {
  shouldRunTestVariant ??= false;
  // The keys have to be sorted from longest to shortest, since we first want to match longer IRIs, since sometimes the IRIs are subparts of other IRIs:
  //  for example - LONG_IRI = {IRI1}/{IRI2}
  const allIrisToCheckFor: string[] = Object.keys(irisMap).sort((a, b) => b.length - a.length);
  const missingIrisInNew: string[] = [];
  const datastoreWithReplacedIris: object = {};
  const containedIriToReplace = replaceIrisInDatastoreAndCollectMissingOnes(
    datastoreToSearchInForIris, allIrisToCheckFor, irisMap, missingIrisInNew, datastoreWithReplacedIris, shouldRunTestVariant);

  return {
    missingIrisInNew: Array.from(new Set(missingIrisInNew)),
    datastoreWithReplacedIris,
    containedIriToReplace,
  };
}


/**
 * Note that there are even identifiers like this: d19697d9-b1fe-427a-874b-0a537119a6e7-model-metadata-entity. However, those are not top level,
 *  so the question is if we need to replace them or not. However, we will replace them, since some part of code simply may look for id, which has
 *  "-model-metadata-entity" as a suffix. Post-note - we need to replace them, there is a code that looks for derivated IRI.
 * @todo The real question is if there are more such hidden dependencies, that is derivated IRIs. If not, we can simply just look specifically for
 *  "-model-metadata-entity" suffix, if there is more we need to do what we do currently and that is to look for IRIs prefixed/suffixed with special character.
 *  Also note that we do the replacement since it may be part of URL, but we have not found any such case except for the documentation template
 *  Which we skip anyways, since there the IRIs are used for examples and not as an actual path.
 */
function replaceIrisInDatastoreAndCollectMissingOnes(
  originalDatastore: Record<string, any>,
  allIrisToCheckFor: string[],
  irisMap: Record<string, string | null>,
  // Outputs to extend
  missingIrisInNew: string[],
  datastoreWithReplacedIris: Record<string, any>,
  shouldRunTestVariant: boolean,
): boolean {
  let containedIriToReplace: boolean = false;

  for (const [key, value] of Object.entries(originalDatastore)) {
    if (key === "projectIri") {     // Project IRIs are kept as they are
      datastoreWithReplacedIris[key] = value;
      continue;
    }
    else if (key === "https://schemas.dataspecer.com/documentation-generator-config/") {
      // We skip the replacement in documentation template
      datastoreWithReplacedIris[key] = value;
      continue;
    }


    // We have to also replace the keys
    let newKey = key;
    // Trying to replace the key. {} is just for scoping of variables
    {
      const keyReplacementResult = getReplacementForNonComposite(
        key, allIrisToCheckFor, irisMap, missingIrisInNew, shouldRunTestVariant);
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
          const containedIriToReplaceInRecursion = replaceIrisInDatastoreAndCollectMissingOnes(
            item, allIrisToCheckFor, irisMap, missingIrisInNew, objectToPutIntoArray, shouldRunTestVariant);
          containedIriToReplace ||= containedIriToReplaceInRecursion;
        }
        else {
          const replacementResult = getReplacementForNonComposite(item, allIrisToCheckFor, irisMap, missingIrisInNew, shouldRunTestVariant);
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
        const containedIriToReplaceInRecursion = replaceIrisInDatastoreAndCollectMissingOnes(
          value, allIrisToCheckFor, irisMap, missingIrisInNew, datastoreWithReplacedIris[newKey], shouldRunTestVariant);
        containedIriToReplace ||= containedIriToReplaceInRecursion;
      }
    }
    else {
      const replacementResult = getReplacementForNonComposite(value, allIrisToCheckFor, irisMap, missingIrisInNew, shouldRunTestVariant);
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
 * @todo TODO RadStr PR: Actually does not work if we have a string that contains more IRIs or the the iri is in the middle of value
 *        ... to be more exact we replace only in cases where it matches the whole {@link originalIri} or
 *              it is at the start/end of the string some special characters around it (for example #)
 *        That being said there seem not be such cases, so I am 99% sure that it is correct
 * @param originalIri it is named iri but it does not necessary have to be iri it is just to value which can be iri and can be possibly replaced
 */
function getReplacementForNonComposite(
  originalIri: any,
  allIrisToCheckFor: string[],
  irisMap: Record<string, string | null>,
  missingIrisInNew: string[],     // Output to extend
  shouldRunTestVariant: boolean,
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


  if (shouldRunTestVariant) {
    const exactMatch = iriIndex(allIrisToCheckFor, originalIri).position >= 0;
    const notExactMatches: { iri: string, position: number }[] = [];
    for (const iriToCheckFor of allIrisToCheckFor) {
      const indexOf = originalIri.indexOf(iriToCheckFor);
      if (indexOf >= 0) {
        if ((indexOf - 1 >= 0 && originalIri.charAt(indexOf + 1) === "/" || indexOf + iriToCheckFor.length < originalIri.length && originalIri.charAt(indexOf + iriToCheckFor.length) === "/")) {
          // This is very special case, when there is a referenced model (for example for visual model), that does not exist in Dataspecer.
          continue;
        }
        else if (notExactMatches.length === 0) {
          notExactMatches.push({iri: iriToCheckFor, position: originalIri.indexOf(iriToCheckFor)});
        }
        else if (notExactMatches.length > 0 && !notExactMatches[0].iri.includes(iriToCheckFor)) {
          notExactMatches.push({iri: iriToCheckFor, position: originalIri.indexOf(iriToCheckFor)});
        }
        if (notExactMatches.length > 1) {
        }
      }
    }

    const notExactMatchButStillMatch = notExactMatches.length > 0;
    if (exactMatch !== notExactMatchButStillMatch || notExactMatches.length > 1) {
      console.error({exactMatch, notExactMatchButStillMatch, originalIri, allIrisToCheckFor});
      throw new Error("Not exact match");
    }
  }

  let replacementIri: string;
  // TODO RadStr PR: Does not work for {my-iri2}#some-other-part{my-iri2}. However, it works for each example where is exactly one iri at the start/end (which should all of them hopefully).
  const { iri, position } = iriIndex(allIrisToCheckFor, originalIri)
  if (position >= 0) {
    containedIriToReplace = true;
    if ((irisMap[iri] ?? null) !== null) {
      replacementIri = originalIri.replace(iri, irisMap[iri]);
    }
    else {
      isReplacementMissing = true;
      missingIrisInNew.push(originalIri);
      // TODO RadStr: ... not really TODO but we want to mark this fact since it is important:
      //                   Using the old iri is fine, we just have to make sure to replace it (or look into missingIris) if it happens
      //                   Alternatively we could replace it with {originalIri}-some-constant-suffix, since we need the originalIri, without it we cannot replace it
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

function iriIndex(iris: string[], text: string): { iri: string, position: number } {
  for (const iri of iris) {
    const position = text.indexOf(iri);
    if (position >= 0) {
      // We do this, because some of the IRIs (the short ones) are pretty dangerous, since they could be part of other IRIs
      // ... by other we mean non-model IRIs. The model IRIs are fine, since we go from longer to shorter ones.
      let isMismatch = true;
      if (text === iri) {
        isMismatch = false;
      }
      else {
        if (position === 0) {
          const charAtTheEnd = text.charAt(iri.length);
          if (isCharValidSurrounding(charAtTheEnd)) {   // It is some sort of location or part of some extended iri
            isMismatch = false;
          }
        }
        else {
          if (position === text.length - iri.length) {      // It is at the end
            // Same as above, but we check for the character before
            const charBefore = text.charAt(position - 1);
            if (isCharValidSurrounding(charBefore)) {
              isMismatch = false;
            }
          }
        }
      }
      if (isMismatch) {
        continue;
      }
      return {
        iri,
        position,
      };
    }
  }
  return {
    iri: text,
    position: -1,
  };
}

function isCharValidSurrounding(char: string) {
  // Note that we do not look for /, since then we could do partial replacement of IRI (the one with /)
  return char === "#" || char === "?" || char === "-" || char === "_" || char === "&";
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



















////////////////////////////////////////////////////////
////////////////////////////////////////////////////////
////////////////////////////////////////////////////////
////////////////////////////////////////////////////////
////////////////////////////////////////////////////////
////////////////////////////////////////////////////////
////////////////////////////////////////////////////////
////////////////////////////////////////////////////////
////////////////////////////////////////////////////////
////////////////////////////////////////////////////////
////////////////////////////////////////////////////////
////////////////////////////////////////////////////////
////////////////////////////////////////////////////////
////////////////////////////////////////////////////////
////////////////////////////////////////////////////////
////////////////////////////////////////////////////////
////////////////////////////////////////////////////////
////////////////////////////////////////////////////////
////////////////////////////////////////////////////////
////////////////////////////////////////////////////////
////////////////////////////////////////////////////////
////////////////////////////////////////////////////////
////////////////////////////////////////////////////////
////////////////////////////////////////////////////////
////////////////////////////////////////////////////////
////////////////////////////////////////////////////////
////////////////////////////////////////////////////////
////////////////////////////////////////////////////////
////////////////////////////////////////////////////////
////////////////////////////////////////////////////////
////////////////////////////////////////////////////////
// // TODO RadStr PR: More brutal variant, where we can replace multiple iris within one string, but we did not finish implementation, because
// //                 1) It is not so easy
// //                 2) It might be wasted effort, since I do not know what sort of real data can it break on.
// //                 3) The look of IRIs needs to be specified first, before that there is no reason to implement this, only after that we can be sure
// //                       what is the correct solution and if it is not wasted effort. The simple variant is with 99% certainity enough, this is overkill/useless.





// import { DirectoryNode } from "../export-import-data-api.ts";
// import { FilesystemAbstraction } from "../filesystem/abstractions/filesystem-abstraction.ts";

// /**
//  * We have to replace each iri inside the {@link datastoreToSearchInForIris} object, which we copy by the iris which exists in the new resources/packages
//  * @returns The iris, which could not be replaced, because the resources, which have them do not exist (we have to create them first and get the created iris).
//  *  and the copy of {@link datastoreToSearchInForIris} with replaced every iri we could.
//  */
// export function createDatastoreWithReplacedIris(datastoreToSearchInForIris: object, irisMap: Record<string, string | null>) {
//   const allIrisToCheckFor: string[] = Object.keys(irisMap).sort((a: string, b: string) => b.length - a.length);   // First match the longer iris
//   const missingIrisInNew: string[] = [];
//   const datastoreWithReplacedIris: object = {};
//   const containedIriToReplace = replaceIrisInDatastoreAndCollectMissingOnes(datastoreToSearchInForIris, allIrisToCheckFor, irisMap, missingIrisInNew, datastoreWithReplacedIris);

//   return {
//     missingIrisInNew: Array.from(new Set(missingIrisInNew)),
//     datastoreWithReplacedIris,
//     containedIriToReplace,
//   };
// }

// // TODO RadStr: the placeholder either has to at least hold the old iri as suffix, otherwise we can not perform the replacing
// // export const PLACEHOLDER_REPLACEMENT_IRI = "PLACEHOLDER-IRI-WHICH-WILL-BE-REPLACED-ON-BACKEND-STORE";


// /**
//  * Note that there are even identifiers like this: d19697d9-b1fe-427a-874b-0a537119a6e7-model-metadata-entity. However, those are not top level,
//  *  so the question is if we need to replace them or not. However, we will replace them, since some part of code simply may look for id, which has
//  *  "-model-metadata-entity" as a suffix
//  */
// function replaceIrisInDatastoreAndCollectMissingOnes(
//   originalDatastore: Record<string, any>,
//   allIrisToCheckFor: string[],
//   irisMap: Record<string, string | null>,
//   // Outputs to extend
//   missingIrisInNew: string[],
//   datastoreWithReplacedIris: Record<string, any>,
// ): boolean {
//   let containedIriToReplace: boolean = false;

//   for (const [key, value] of Object.entries(originalDatastore)) {
//     if (key === "projectIri") {     // Project IRIs are kept as they are
//       datastoreWithReplacedIris[key] = value;
//       continue;
//     }


//     // We have to also replace the keys
//     let newKey = key;
//     // TODO RadStr PR: Do it through includes?
//     if (allIrisToCheckFor.includes(key)) {
//       const keyReplacementResult = getReplacementForNonComposite(key, allIrisToCheckFor, irisMap, missingIrisInNew);
//       if (keyReplacementResult.containedIriToReplace) {
//         newKey = keyReplacementResult.replacementIri;
//       }
//     }

//     const exactMatch = allIrisToCheckFor.includes(key);
//     let notExactMatchButStillMatch: boolean = false;
//     for (const iriToCheckFor of allIrisToCheckFor) {
//       if (key.indexOf(iriToCheckFor) >= 0) {
//         notExactMatchButStillMatch = true;
//         break;
//       }
//     }

//     if (exactMatch !== notExactMatchButStillMatch) {
//       console.error({exactMatch, notExactMatchButStillMatch, key, allIrisToCheckFor});
//       throw new Error("Not exact match");
//     }


//     // Try replace value or perform recurive calls, based on the type of value
//     if (Array.isArray(value)) {
//       datastoreWithReplacedIris[newKey] = [];
//       value.forEach((item, index) => {
//         if (typeof item === "object" && item !== null) {
//           const objectToPutIntoArray = {};
//           datastoreWithReplacedIris[newKey].push(objectToPutIntoArray);
//           // It is actually important to do it separately and not use ||= since if the containedIriToReplace is true, we won't run the recursion.
//           const containedIriToReplaceInRecursion = replaceIrisInDatastoreAndCollectMissingOnes(item, allIrisToCheckFor, irisMap, missingIrisInNew, objectToPutIntoArray);
//           containedIriToReplace ||= containedIriToReplaceInRecursion;
//         }
//         else {
//           const replacementResult = getReplacementForNonComposite(item, allIrisToCheckFor, irisMap, missingIrisInNew);
//           if (replacementResult === null) {
//             datastoreWithReplacedIris[newKey].push(item);
//           }
//           else {
//             datastoreWithReplacedIris[newKey].push(replacementResult.replacementIri);
//           }

//           for (const item of Object.values(replacementResult)) {
//             containedIriToReplace ||= item.containedIriToReplace;
//           }
//         }
//       });
//     }
//     else if (typeof value === "object" && value !== null) {
//       if (Object.entries(value).length === 0) {   // For example date has to be handled like this
//         datastoreWithReplacedIris[newKey] = value;
//       }
//       else {
//         datastoreWithReplacedIris[newKey] = {};
//         const containedIriToReplaceInRecursion = replaceIrisInDatastoreAndCollectMissingOnes(value, allIrisToCheckFor, irisMap, missingIrisInNew, datastoreWithReplacedIris[newKey]);
//         containedIriToReplace ||= containedIriToReplaceInRecursion;
//       }
//     }
//     else {
//       const replacementResult = getReplacementForNonComposite(value, allIrisToCheckFor, irisMap, missingIrisInNew);
//       if (replacementResult === null) {
//         datastoreWithReplacedIris[newKey] = value;
//       }
//       else {
//         xdd
//         replaceWithFoundReplacements(replacementResult)
//         datastoreWithReplacedIris[newKey] = replacementResult.replacementIri;
//       }
//       for (const item of Object.values(replacementResult)) {
//         containedIriToReplace ||= item.containedIriToReplace;
//       }
//     }
//   }

//   return containedIriToReplace;
// }


// type ReplacementsForFoundMatches = Record<string, ReplacementForNonCompositeResult>;

// type ReplacementForNonCompositeResult = {
//   containedIriToReplace: boolean;
//   /**
//    * If no change then it is equal to the input.
//    */
//   replacementIri: string | null;

//   indices: number[];
// }


// /**
//  * @todo TODO RadStr PR: Actually does not work if we have a string that contains more IRIs or the string contains IRI + something else - then we lose the something else after replacement
//  * @param originalIri it is named iri but it does not necessary have to be iri it is just to value which can be iri and can be possibly replaced
//  * @returns null if the {@link originalIri} did not match any of the {@link allIrisToCheckFor} or it is an object. In both cases we keep the value.
//  */
// function getReplacementForNonComposite(
//   originalIri: any,
//   allIrisToCheckFor: string[],
//   irisMap: Record<string, string | null>,
//   missingIrisInNew: string[],     // Output to extend
// ): ReplacementsForFoundMatches | null {
//   const result: ReplacementsForFoundMatches = {};

//   let isReplacementMissing: boolean = false;
//   let containedIriToReplace: boolean = false;
//   if (typeof originalIri !== "string") {
//     return null;
//   }

//   const exactMatch = allIrisToCheckFor.includes(originalIri);
//   let notExactMatchButStillMatch: boolean = false;
//   for (const iriToCheckFor of allIrisToCheckFor) {
//     if (originalIri.indexOf(iriToCheckFor) >= 0) {
//       notExactMatchButStillMatch = true;
//       break;
//     }
//   }

//   if (exactMatch !== notExactMatchButStillMatch) {
//     console.error({exactMatch, notExactMatchButStillMatch, originalIri, allIrisToCheckFor});
//     throw new Error("Not exact match");
//   }

//   let replacementIri: string;
//   // TODO RadStr PR: Again includes? Or look for substrings? like {my-iri}#some-other-part or even {my-iri2}#some-other-part{my-iri2}
//   const matchingResult = findMatches(originalIri, allIrisToCheckFor);
//   if (matchingResult.conflicts.length > 0) {
//     for (const conflict of matchingResult.conflicts) {
//       console.error({conflict});
//     }
//     throw new Error("Found conflict when replacing iris");
//   }

//   if (matchingResult.foundMatches.occupiedIndices.length > 0) {
//     for (const [iriToCheckFor, startIndices] of Object.entries(matchingResult.foundMatches.matchMap)) {
//       let replacementIri = irisMap[originalIri] ?? null;
//       let containedIriToReplace = true;
//       if (replacementIri === null) {
//         missingIrisInNew.push(originalIri);
//         containedIriToReplace = false;
//       }
//       result[iriToCheckFor] = {
//         replacementIri,
//         indices: startIndices,
//         containedIriToReplace,
//       }
//     }
//     // replacementIri = irisMap[originalIri] ?? null;
//     // if (replacementIri === null) {
//     //   isReplacementMissing = true;
//     //   missingIrisInNew.push(originalIri);
//     //   // replacementIri = PLACEHOLDER_REPLACEMENT_IRI;    // TODO RadStr: the placeholder either has to at least hold the old iri as suffix, otherwise we can not perform the replacing
//     //   // TODO RadStr: Using the old iri is fine, we just have to make sure to replace it if it happens
//     //   replacementIri = originalIri;
//     // }
//   }
//   else {
//     return null;
//   }

//   return result;
// }


// type OccupiedIndex = {
//   startIndex: number;
//   matchedIri: string;
// }

// type FoundMatches = {
//   matchMap: Record<string, number[]>;
//   occupiedIndices: OccupiedIndex[];
// }

// type MatchingResult = {
//   foundMatches: FoundMatches;
//   conflicts: {
//     first: OccupiedIndex;
//     second: OccupiedIndex;
//   }[]
// }


// function findMatches(textToReplace: string, iris: string[]): MatchingResult {
//   const matchingResult: MatchingResult = {
//     foundMatches: {
//       matchMap: {},
//       occupiedIndices: []
//     },
//     conflicts: [],
//   };

//   const matchMap: Record<string, number[]> = {};
//   for (const iri of iris) {
//     let startIndex = 0;
//     while (true) {
//       const index = textToReplace.indexOf(iri, startIndex);
//       if (index === -1) {
//         break;
//       }

//       for (const occupied of matchingResult.foundMatches.occupiedIndices) {
//         if (intervalsIntersect(occupied.startIndex, occupied.matchedIri, startIndex, iri)) {
//           matchingResult.conflicts.push({
//             first: {
//               matchedIri: occupied.matchedIri,
//               startIndex: occupied.startIndex
//             },
//             second: {
//               matchedIri: iri,
//               startIndex: startIndex,
//             },
//           });

//           break;
//         }
//       }

//       if (matchMap[iri] === undefined) {
//         matchMap[iri] = [startIndex];
//       }
//       else {
//         matchMap[iri].push(startIndex);
//       }
//       matchingResult.foundMatches.occupiedIndices.push({
//         matchedIri: iri,
//         startIndex,
//       });

//       startIndex = index + iri.length; // move forward to find next occurrence
//     }
//   }

//   return matchingResult;
// }

// /**
//  * Based on ChatGPT
//  */
// function intervalsIntersect(iriStartIndex1: number, iri1: string, iriStartIndex2: number, iri2: string) {
//   const iriEndIndex1 = iriStartIndex1 + iri1.length;
//   const iriEndIndex2 = iriStartIndex2 + iri2.length;
//   return Math.max(iriStartIndex1, iriStartIndex2) <= Math.min(iriEndIndex1, iriEndIndex2);
// }

// function replaceWithFoundReplacements(replacements: ReplacementsForFoundMatches) {
//   throw new Error("not implemented")
// }

