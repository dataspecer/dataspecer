import {
  isControlledVocabularyAssignment,
  ProfileClass,
  ProfileEntityRecord,
  ProfileGeneralization,
  ProfileRelationshipEnd,
  ProfileRelationship,
} from "../profile-model.ts";
import { cardinalitiesIntersection } from "../utilities.ts";
import { ProfileModelMergePolicy } from "./merge-policy.ts";

class DefaultMergePolicy implements ProfileModelMergePolicy {

  mergeClassProfile(
    left: ProfileClass,
    right: ProfileClass,
    assignmentEntities: ProfileEntityRecord,
  ): ProfileClass {
    return {
      id: left.id,
      type: left.type,
      iri: left.iri ?? right.iri,
      name: mergeLanguageString(left.name, right.name),
      nameFromProfiled: left.nameFromProfiled ?? right.nameFromProfiled,
      description: mergeLanguageString(left.description, right.description),
      descriptionFromProfiled:
        left.descriptionFromProfiled ?? right.descriptionFromProfiled,
      usageNote: mergeLanguageString(left.usageNote, right.usageNote),
      usageNoteFromProfiled:
        left.usageNoteFromProfiled ?? right.usageNoteFromProfiled,
      externalDocumentationUrl:
        left.externalDocumentationUrl ?? right.externalDocumentationUrl,
      // Here the order does not matter.
      profiling: [...new Set(...left.profiling, ...right.profiling)],
      tags: [...new Set(...left.tags, ...right.tags)],
      controlledVocabularies: mergeControlledVocabularies(
        left.controlledVocabularies, right.controlledVocabularies, assignmentEntities),
    };
  }

  mergeRelationshipProfile(
    left: ProfileRelationship, right: ProfileRelationship,
  ): ProfileRelationship {
    const endsCount = Math.max(left.ends.length, right.ends.length);
    const ends: ProfileRelationshipEnd[] = [];
    for (let index = 0; index < endsCount; ++index) {
      const leftEnd = left.ends[index];
      const rightEnd = right.ends[index];
      ends.push(mergeRelationshipEndProfile(leftEnd, rightEnd));
    }
    //
    return {
      id: left.id,
      type: left.type,
      ends,
    };
  }

  mergeGeneralizationProfile(
    left: ProfileGeneralization, right: ProfileGeneralization,
  ): ProfileGeneralization {
    return {
      id: left.id,
      type: left.type,
      iri: left.iri ?? right.iri,
      child: left.child,
      parent: left.child
    };
  }

}

type LanguageString = { [key: string]: string };

function mergeLanguageString(
  left: LanguageString | null,
  right: LanguageString | null,
): LanguageString | null {
  if (left === null && right === null) {
    return left;
  } else if (left === null) {
    return right;
  } else if (right === null) {
    return left;
  }
  // Merge
  return {
    ...right,
    ...left,
  };
}

function mergeRelationshipEndProfile(
  left: ProfileRelationshipEnd | undefined,
  right: ProfileRelationshipEnd | undefined,
): ProfileRelationshipEnd {
  if (left === undefined) {
    return right!;
  } else if (right === undefined) {
    return left!;
  }
  // Merge.
  return {
    iri: left.iri ?? right.iri,
    concept: left.concept ?? right.concept,
    name: mergeLanguageString(left.name, right.name),
    nameFromProfiled: left.nameFromProfiled ?? right.nameFromProfiled,
    description: mergeLanguageString(left.description, right.description),
    descriptionFromProfiled:
      left.descriptionFromProfiled ?? right.descriptionFromProfiled,
    usageNote: mergeLanguageString(left.usageNote, right.usageNote),
    usageNoteFromProfiled:
      left.usageNoteFromProfiled ?? right.usageNoteFromProfiled,
    externalDocumentationUrl:
      left.externalDocumentationUrl ?? right.externalDocumentationUrl,
    cardinality: cardinalitiesIntersection(left.cardinality, right.cardinality),
      // Here the order does not matter.
    profiling: [...new Set(...left.profiling, ...right.profiling)],
    tags: [...new Set(...left.tags, ...right.tags)],
  };
}

/**
 * Merges own assignment ids, keeping at most one per vocabulary (left wins).
 */
function mergeControlledVocabularies(
  left: string[] | undefined,
  right: string[] | undefined,
  assignmentEntities: ProfileEntityRecord,
): string[] | undefined {
  if (left === undefined && right === undefined) {
    return undefined;
  }
  const resolveVocabulary = (id: string): string | null => {
    const entity = assignmentEntities[id];
    return isControlledVocabularyAssignment(entity) ? entity.vocabulary : null;
  };
  const result = [...(left ?? [])];
  const usedVocabularies = new Set(
    result.map(resolveVocabulary).filter(vocabulary => vocabulary !== null));
  for (const id of right ?? []) {
    const vocabulary = resolveVocabulary(id);
    if (vocabulary !== null) {
      if (usedVocabularies.has(vocabulary)) {
        console.warn("Dropped a duplicate controlled vocabulary assignment during merge - a class profile can only have one own assignment per vocabulary.",
          { id, vocabulary });
        continue;
      }
      usedVocabularies.add(vocabulary);
    }
    result.push(id);
  }
  return result;
}

/**
 * Default merger policy try to merge where possible.
 * If merge is not possible, keep value from first instance.
 * As a result, this merge is ORDER DEPENDENT.
 *
 * The policy does not check or report merge issues like different
 * IRIs or identifiers in relationships. *
 */
export function createDefaultMergePolicy(): ProfileModelMergePolicy {
  return new DefaultMergePolicy();
}
