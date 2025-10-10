/**
 * We have to replace each iri inside the {@link datastoreToSearchInForIris} object, which we copy by the iris which exists in the new resources/packages
 * @returns The iris, which could not be replaced, because the resources, which have them do not exist (we have to create them first and get the created iris).
 *  and the copy of {@link datastoreToSearchInForIris} with replaced every iri we could.
 */
export function createDatastoreWithReplacedIris(datastoreToSearchInForIris: any, irisMap: Record<string, string | null>) {
  const allIrisToCheckFor: string[] = Object.keys(irisMap);
  const missingIrisInNew: string[] = [];
  const datastoreWithReplacedIris: any = {};
  const containedIriToReplace = replaceIrisInDatastoreAndCollectMissingOnes(datastoreToSearchInForIris, allIrisToCheckFor, irisMap, missingIrisInNew, datastoreWithReplacedIris);

  return {
    missingIrisInNew:  Array.from(new Set(missingIrisInNew)),
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
          containedIriToReplace ||= replaceIrisInDatastoreAndCollectMissingOnes(objectToPutIntoArray, allIrisToCheckFor, irisMap, missingIrisInNew, item);
        }
        else {
          containedIriToReplace ||= handleReplacementForNonComposite(key, item, datastoreWithReplacedIris, allIrisToCheckFor, irisMap, missingIrisInNew);
        }
      });
    }
    else if (typeof value === "object" && value !== null) {
      datastoreWithReplacedIris[key] = {};
      containedIriToReplace ||= replaceIrisInDatastoreAndCollectMissingOnes(datastoreWithReplacedIris[key], allIrisToCheckFor, irisMap, missingIrisInNew, value);
    }
    else {
      containedIriToReplace ||= handleReplacementForNonComposite(key, value, datastoreWithReplacedIris, allIrisToCheckFor, irisMap, missingIrisInNew);
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
    return;
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
