import {
  EntityDsIdentifier,
  LanguageString,
} from "../../../dataspecer/entity-model";
import { emptyAsNull } from "../../../utilities/string";

/**
 * Values of a relationship profile, as used by create and update operations.
 */
export interface RelationshipProfileValues {

  profileOf: EntityDsIdentifier[];

  iri: string | null;

  name: LanguageString | null;

  nameSource: EntityDsIdentifier | null;

  description: LanguageString | null;

  descriptionSource: EntityDsIdentifier | null;

  usageNote: LanguageString | null;

  usageNoteSource: EntityDsIdentifier | null;

  domain: EntityDsIdentifier;

  domainCardinality: [number, number | null] | null;

  range: EntityDsIdentifier;

  rangeCardinality: [number, number | null] | null;

  externalDocumentationUrl: string | null;

  /**
   * Stored as a tag.
   */
  mandatoryLevel: string | null;

  order: string | null;

}

/**
 * @returns Ends of the relationship profile, the range end carries
 *  the profile information.
 */
export function createRelationshipProfileEnds(
  value: RelationshipProfileValues,
) {
  const tags: string[] = [];
  if (value.mandatoryLevel !== null) {
    tags.push(value.mandatoryLevel);
  }
  return [{
    profiling: [],
    iri: null,
    name: null,
    nameFromProfiled: null,
    description: null,
    descriptionFromProfiled: null,
    usageNote: null,
    usageNoteFromProfiled: null,
    concept: value.domain,
    cardinality: value.domainCardinality,
    externalDocumentationUrl: null,
    tags: [],
  }, {
    profiling: value.profileOf,
    iri: value.iri,
    name: value.name,
    nameFromProfiled: value.nameSource,
    description: value.description,
    descriptionFromProfiled: value.descriptionSource,
    usageNote: value.usageNote,
    usageNoteFromProfiled: value.usageNoteSource,
    concept: value.range,
    cardinality: value.rangeCardinality,
    externalDocumentationUrl: emptyAsNull(value.externalDocumentationUrl),
    tags,
    order: value.order,
  }];
}
