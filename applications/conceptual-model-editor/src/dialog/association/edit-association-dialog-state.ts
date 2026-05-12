import { EntityModel } from "@dataspecer/core-v2";
import { VisualModel } from "@dataspecer/visual-model";
import {
  BaseEntityDialogState,
  createEditBaseEntityDialogState,
  createNewBaseEntityDialogState
} from "../base-entity/base-entity-dialog-state";
import {
  type BaseRelationshipDialogState,
  createBaseRelationshipDialogState,
} from "../base-relationship/base-relationship-dialog-state";
import {
  EntityRepresentative,
  isRepresentingAssociation,
  listRelationshipDomainsFromTracker,
  representOwlThing,
  representRelationshipsFromTracker,
  representUndefinedClass,
  sortRepresentatives,
} from "../utilities/dialog-utilities";
import { DialogSemanticTracker } from "../dialog-semantic-tracker";
import { semanticModelTrackerToCmeSemanticModel } from "../../dataspecer/cme-model/adapter";
import { configuration, createLogger } from "../../application";
import { LabelResolver } from "../../dependency-tracker";
import { InMemorySemanticModel } from "@dataspecer/core-v2/semantic-model/in-memory";
import {
  type SemanticModelRelationship,
} from "@dataspecer/core-v2/semantic-model/concepts";
import { getDomainAndRange } from "../../util/relationship-utils";
import { InvalidState } from "../../application/error";

const LOG = createLogger(import.meta.url);

export interface AssociationDialogState extends
  BaseEntityDialogState,
  BaseRelationshipDialogState<EntityRepresentative> { }

export function createNewAssociationDialogState(
  visualModel: VisualModel | null,
  language: string,
  defaultModelIdentifier: string | null,
  tracker: DialogSemanticTracker,
  labelResolver: LabelResolver,
): AssociationDialogState {

  const allModels = semanticModelTrackerToCmeSemanticModel(
    tracker.semanticModels, visualModel,
    configuration().defaultModelColor,
  );

  const owlThing = representOwlThing();

  const allDomains = listRelationshipDomainsFromTracker(tracker, labelResolver);
  sortRepresentatives(allDomains);

  const allRanges = allDomains;

  const allSpecializations = listAssociationsFromTracker(labelResolver, tracker);

  // EntityState

  const entityState = createNewBaseEntityDialogState(
    language, defaultModelIdentifier, allModels, allSpecializations,
    configuration().relationshipNameToIri);

  // RelationshipState

  const relationshipState = createBaseRelationshipDialogState(
    allModels,
    owlThing.identifier, representUndefinedClass(), null, allDomains,
    owlThing.identifier, representUndefinedClass(), null, allRanges);

  return {
    ...entityState,
    ...relationshipState,
  };
}

function listAssociationsFromTracker(
  labelResolver: LabelResolver,
  tracker: DialogSemanticTracker,
) {
  const owlThing = representOwlThing();

  const result = representRelationshipsFromTracker(
    tracker, owlThing.identifier, owlThing.identifier, labelResolver,
  ).filter(isRepresentingAssociation);

  sortRepresentatives(result);

  return result;
}

/**
 * @throws InvalidState
 */
export function createEditAssociationDialogState(
  visualModel: VisualModel | null,
  language: string,
  model: InMemorySemanticModel,
  entity: SemanticModelRelationship,
  entityModels: Map<string, EntityModel>,
  tracker: DialogSemanticTracker,
  labelResolver: LabelResolver,
): AssociationDialogState {

  const { domain, range } = getDomainAndRange(entity);
  if (domain === null || range === null) {
    LOG.error("Invalid domain or range.", { entity, domain, range });
    throw new InvalidState();
  }

  //

  const allModels = semanticModelTrackerToCmeSemanticModel(
    tracker.semanticModels, visualModel,
    configuration().defaultModelColor);

  const owlThing = representOwlThing();

  const allDomains = listRelationshipDomainsFromTracker(tracker, labelResolver);
  sortRepresentatives(allDomains);

  const allRanges = allDomains;

  const allSpecializations = listAssociationsFromTracker(labelResolver, tracker);

  // EntityState

  const entityState = createEditBaseEntityDialogState(
    language, entityModels, allModels,
    { identifier: entity.id, model: model.getId() },
    range.iri ?? "", range.name, range.description,
    range.externalDocumentationUrl ?? "",
    allSpecializations,
    range.order ?? "");

  // RelationshipState

  const relationshipState = createBaseRelationshipDialogState(
    allModels,
    domain.concept ?? owlThing.identifier, representUndefinedClass(),
    domain.cardinality, allDomains,
    range.concept ?? owlThing.identifier, representUndefinedClass(),
    range.cardinality, allRanges);

  return {
    ...entityState,
    ...relationshipState,
  };
}
