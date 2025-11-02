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

    if (Array.isArray(value)) {
      datastoreWithReplacedIris[key] = [];
      value.forEach((item, index) => {
        if (typeof item === "object" && item !== null) {
          const objectToPutIntoArray = {};
          datastoreWithReplacedIris[key].push(objectToPutIntoArray);
          // It is actually important to do it separately and not use ||= since if the containedIriToReplace is true, we won't run the recursion.
          const containedIriToReplaceInRecursion = replaceIrisInDatastoreAndCollectMissingOnes(item, allIrisToCheckFor, irisMap, missingIrisInNew, objectToPutIntoArray);
          containedIriToReplace ||= containedIriToReplaceInRecursion;
        }
        else {
          const isIriReplacement = handleReplacementForNonComposite(key, item, datastoreWithReplacedIris, allIrisToCheckFor, irisMap, missingIrisInNew);
          containedIriToReplace ||= isIriReplacement;
        }
      });
    }
    else if (typeof value === "object" && value !== null) {
      datastoreWithReplacedIris[key] = {};
      const containedIriToReplaceInRecursion = replaceIrisInDatastoreAndCollectMissingOnes(value, allIrisToCheckFor, irisMap, missingIrisInNew, datastoreWithReplacedIris[key]);
      containedIriToReplace ||= containedIriToReplaceInRecursion;
    }
    else {
      const isIriReplacement = handleReplacementForNonComposite(key, value, datastoreWithReplacedIris, allIrisToCheckFor, irisMap, missingIrisInNew);
      containedIriToReplace ||= isIriReplacement;
    }
  }

  return containedIriToReplace;
}

function handleReplacementForNonComposite(
  key: string,
  possibleIri: any,
  datastore: Record<string, any>,
  allIrisToCheckFor: string[],
  irisMap: Record<string, string | null>,
  // Outputs to extend
  missingIrisInNew: string[],
): boolean {
  let containedIriToReplace: boolean = false;
  if (typeof possibleIri !== "string") {
    datastore[key] = possibleIri;
    return false;
  }

  if (allIrisToCheckFor.includes(possibleIri)) {
    containedIriToReplace = true;
    const replacement = irisMap[possibleIri] ?? null;
    if (replacement === null) {
      missingIrisInNew.push(possibleIri);
      datastore[key] = "PLACEHOLDER-IRI-WHICH-WILL-BE-REPLACED-ON-BACKEND-STORE";
    }
    else {
      datastore[key] = replacement;
    }
  }
  else {
    datastore[key] = possibleIri;
  }

  return containedIriToReplace;
}
