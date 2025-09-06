import {
  ProfileClass,
  ProfileGeneralization,
  ProfileRelationshipEnd,
  ProfileRelationship,
} from "../profile-model.ts";
import { cardinalitiesIntersection } from "../utilities.ts";
import { ProfileModelMergePolicy } from "./merge-policy.ts";

class DefaultMergePolicy implements ProfileModelMergePolicy {

  mergeClassProfile(left: ProfileClass, right: ProfileClass): ProfileClass {
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
