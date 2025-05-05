import {DataPsmClass, DataPsmInclude, DataPsmOr} from "@dataspecer/core/data-psm/model";
import {useResourcesInMemo} from "@dataspecer/federated-observable-store-react/use-resources-in-memo";
import {CoreResource} from "@dataspecer/core/core";
import { SemanticModelClass, SemanticModelEntity, isSemanticModelClass } from "@dataspecer/core-v2/semantic-model/concepts";

export interface InheritanceOrTree {
  dataPsmObjectIri: string;
  hidePropertyIri: string | null;
  children: InheritanceOrTree[];

  isAbstract: boolean;
}

async function getInheritanceOr(dataPsmOrIri: string, getResource: <ResourceType extends CoreResource>(iri: string) => Promise<ResourceType | null>) {
  const or = await getResource<DataPsmOr>(dataPsmOrIri);

  // Handle simple cases
  if (!or || or.dataPsmChoices.length < 1) {
    return false;
  }

  let cache: Record<string, {
    dataPsmClass: DataPsmClass,
    pimClass: SemanticModelClass,
    includeIri: string | null,
    includesDataPsmClassIri: string | null,
  }> = {}

  const toVisit = or.dataPsmChoices.toReversed();
  const toVisitSet = new Set<string>(or.dataPsmChoices);

  let choiceIri: string | undefined = undefined;
  while (choiceIri = toVisit.pop()) {
    const choice = await getResource(choiceIri);
    if (!choice || !DataPsmClass.is(choice)) {
      return false;
    }

    // Get the interpretation
    if (!choice.dataPsmInterpretation) {
      return false;
    }
    const interpretation = await getResource(choice.dataPsmInterpretation) as unknown as SemanticModelEntity;
    if (!interpretation || !isSemanticModelClass(interpretation)) {
      return false;
    }

    // Get the first include
    let firstIncludeIncludesIri: string | null = null;
    if (choice.dataPsmParts.length >= 1) {
      const possibleIncludeIri = choice.dataPsmParts[0];
      const possibleInclude = await getResource<DataPsmInclude>(possibleIncludeIri);
      if (possibleInclude && DataPsmInclude.is(possibleInclude)) {
        firstIncludeIncludesIri = possibleInclude.dataPsmIncludes;
      }
    }

    // Fill cache
    cache[choice.iri as string] = {
      dataPsmClass: choice,
      pimClass: interpretation,
      includeIri: firstIncludeIncludesIri ? choice.dataPsmParts[0] : null,
      includesDataPsmClassIri: firstIncludeIncludesIri,
    }

    // Add element to the queue
    if (firstIncludeIncludesIri && !toVisitSet.has(firstIncludeIncludesIri)) {
      toVisitSet.add(firstIncludeIncludesIri);
      toVisit.push(firstIncludeIncludesIri);
    }
  }

  let rootParent: string | null = null;

  // There should be only one root
  for (const classId of Object.keys(cache)) {
    const visited = new Set<string>();
    let entity: string | null = classId;
    while (cache[entity].includesDataPsmClassIri) {
      if (visited.has(entity)) {
        return false;
      }
      visited.add(entity);
      entity = cache[entity].includesDataPsmClassIri;
    }
    if (rootParent === null) {
      rootParent = entity;
    } else if (rootParent !== entity) {
      return false;
    }
  }

  // Construct the tree
  function getInheritanceOrTree(dataPsmOrIri: string): InheritanceOrTree {
    const children: InheritanceOrTree[] = [];
    for (const choiceObject of Object.values(cache)) {
      if (choiceObject.includesDataPsmClassIri === dataPsmOrIri) {
        children.push(getInheritanceOrTree(choiceObject.dataPsmClass.iri as string));
      }
    }
    return {
      dataPsmObjectIri: dataPsmOrIri,
      children,
      hidePropertyIri: cache[dataPsmOrIri].includeIri,
      isAbstract: !or.dataPsmChoices.includes(dataPsmOrIri),
    };
  }

  const inheritance = getInheritanceOrTree(rootParent as string);

  if (inheritance.children.length === 0) {
    return false;
  }

  return inheritance;
}

/**
 * Hook that decides whether the given OR meets the conditions to be visually shown as inheritance OR.
 * @param dataPsmOrIri
 */
export function useInheritanceOr(dataPsmOrIri: string) {
  return useResourcesInMemo(async getResource => getInheritanceOr(dataPsmOrIri, getResource), [dataPsmOrIri]);
}
