import { VisualModel } from "@dataspecer/visual-model";
import { ClassesContextType } from "../../context/classes-context";
import { ModelGraphContextType } from "../../context/model-context";
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
  listRelationshipDomains,
  representOwlThing,
  representRelationships,
  representUndefinedClass,
  sortRepresentatives,
} from "../utilities/dialog-utilities";
import { semanticModelMapToCmeSemanticModel } from "../../dataspecer/cme-model/adapter";
import { configuration, createLogger, t } from "../../application";
import { InMemorySemanticModel } from "@dataspecer/core-v2/semantic-model/in-memory";
import {
  type SemanticModelRelationship,
} from "@dataspecer/core-v2/semantic-model/concepts";
import { getDomainAndRange } from "../../util/relationship-utils";
import { InvalidState } from "../../application/error";
import { CmeSemanticModel } from "../../dataspecer/cme-model";

const LOG = createLogger(import.meta.url);

export interface AssociationDialogState extends
  BaseEntityDialogState,
  BaseRelationshipDialogState<EntityRepresentative> { }

export function createNewAssociationDialogState(
  classesContext: ClassesContextType,
  graphContext: ModelGraphContextType,
  visualModel: VisualModel | null,
  language: string,
  defaultModelIdentifier: string | null,
): AssociationDialogState {

  const allModels = semanticModelMapToCmeSemanticModel(
    graphContext.models, visualModel,
    configuration().defaultModelColor,
    identifier => t("model-service.model-label-from-id", identifier),
  );

  const owlThing = representOwlThing();

  const allDomains = listRelationshipDomains(
    classesContext, graphContext, allModels);
  sortRepresentatives(language, allDomains);

  const allRanges = allDomains;

  const allSpecializations = listAssociations(
    language, classesContext, graphContext, allModels);

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

function listAssociations(
  language: string,
  classesContext: ClassesContextType,
  graphContext: ModelGraphContextType,
  vocabularies: CmeSemanticModel[],
) {
  const models = [...graphContext.models.values()];

  const owlThing = representOwlThing();

  const result = [
    ...representRelationships(models, vocabularies,
      classesContext.relationships,
      owlThing.identifier, owlThing.identifier),
  ].filter(isRepresentingAssociation);

  sortRepresentatives(language, result);

  return result;
}

/**
 * @throws InvalidState
 */
export function createEditAssociationDialogState(
  classesContext: ClassesContextType,
  graphContext: ModelGraphContextType,
  visualModel: VisualModel | null,
  language: string,
  model: InMemorySemanticModel,
  entity: SemanticModelRelationship,
): AssociationDialogState {

  const { domain, range } = getDomainAndRange(entity);
  if (domain === null || range === null) {
    LOG.error("Invalid domain or range.", { entity, domain, range });
    throw new InvalidState();
  }

  //

  const allModels = semanticModelMapToCmeSemanticModel(
    graphContext.models, visualModel,
    configuration().defaultModelColor,
    identifier => t("model-service.model-label-from-id", identifier));

  const owlThing = representOwlThing();

  const allDomains = listRelationshipDomains(
    classesContext, graphContext, allModels);
  sortRepresentatives(language, allDomains);

  const allRanges = allDomains;

  const allSpecializations = listAssociations(
    language, classesContext, graphContext, allModels);

  // EntityState

  const entityState = createEditBaseEntityDialogState(
    language, graphContext.models, allModels,
    { identifier: entity.id, model: model.getId() },
    range.iri ?? "", range.name, range.description,
    range.externalDocumentationUrl ?? "",
    allSpecializations);

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
