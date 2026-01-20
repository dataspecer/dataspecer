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
    if (key === "projectIri") {
      datastoreWithReplacedIris[key] = value;
      continue;
    }


    // We have to also replace the keys
    let newKey = key;
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
      datastoreWithReplacedIris[newKey] = {};
      const containedIriToReplaceInRecursion = replaceIrisInDatastoreAndCollectMissingOnes(value, allIrisToCheckFor, irisMap, missingIrisInNew, datastoreWithReplacedIris[newKey]);
      containedIriToReplace ||= containedIriToReplaceInRecursion;
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
}


/**
 * @param originalIri it is named iri but it does not necessary have to be iri it is just to value which can be iri and can be possibly replaced
 */
function getReplacementForNonComposite(
  originalIri: any,
  allIrisToCheckFor: string[],
  irisMap: Record<string, string | null>,
  missingIrisInNew: string[],     // Output to extend
): ReplacementForNonCompositeResult {
  let containedIriToReplace: boolean = false;
  if (typeof originalIri !== "string") {
    return {
      containedIriToReplace: false,
      replacementIri: originalIri,
    };
  }

  let replacementIri: string;
  if (allIrisToCheckFor.includes(originalIri)) {
    containedIriToReplace = true;
    replacementIri = irisMap[originalIri] ?? null;
    if (replacementIri === null) {
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
    containedIriToReplace: containedIriToReplace,
    replacementIri: replacementIri
  };
}
