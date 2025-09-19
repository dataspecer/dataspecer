import { VisualModel } from "@dataspecer/visual-model";
import { ClassesContextType } from "../../context/classes-context";
import { ModelGraphContextType } from "../../context/model-context";
import {
  type BaseEntityDialogState,
  createEditBaseEntityDialogState,
  createNewBaseEntityDialogState
} from "../base-entity/base-entity-dialog-state";
import {
  type BaseRelationshipDialogState,
  createBaseRelationshipDialogState,
} from "../base-relationship/base-relationship-dialog-state";
import {
  type DataTypeRepresentative,
  isRepresentingAttribute,
  listAttributeRanges,
  listRelationshipDomains,
  representOwlThing,
  representRdfsLiteral,
  representRelationships,
  representUndefinedClass,
  representUndefinedDataType,
  selectDefaultModelForAttribute,
  sortRepresentatives,
} from "../utilities/dialog-utilities";
import { semanticModelMapToCmeSemanticModel } from "../../dataspecer/cme-model/adapter";
import { configuration, createLogger, t } from "../../application";
import { InMemorySemanticModel } from "@dataspecer/core-v2/semantic-model/in-memory";
import {
  type SemanticModelClass,
  type SemanticModelRelationship,
} from "@dataspecer/core-v2/semantic-model/concepts";
import { getDomainAndRange } from "../../util/relationship-utils";
import { InvalidState } from "../../application/error";
import { CmeSemanticModel } from "../../dataspecer/cme-model";

const LOG = createLogger(import.meta.url);

export interface AttributeDialogState extends
  BaseEntityDialogState, BaseRelationshipDialogState<DataTypeRepresentative> { }

export function createNewAttributeDialogState(
  classesContext: ClassesContextType,
  graphContext: ModelGraphContextType,
  visualModel: VisualModel | null,
  language: string,
  defaultModelIdentifier: string | null,
): AttributeDialogState {

  const allModels = semanticModelMapToCmeSemanticModel(
    graphContext.models, visualModel,
    configuration().defaultModelColor,
    identifier => t("model-service.model-label-from-id", identifier));

  const owlThing = representOwlThing();

  const rdfsLiteral = representRdfsLiteral();

  const allDomains = listRelationshipDomains(
    classesContext, graphContext, allModels);
  sortRepresentatives(language, allDomains);

  const allRanges = listAttributeRanges();

  const allSpecializations = listAttributes(
    language, classesContext, graphContext, allModels);

  // EntityState

  const entityState = createNewBaseEntityDialogState(
    language, defaultModelIdentifier, allModels, allSpecializations,
    configuration().relationshipNameToIri);

  // RelationshipState

  const relationshipState = createBaseRelationshipDialogState(
    allModels,
    owlThing.identifier, representUndefinedClass(), null, allDomains,
    rdfsLiteral.identifier, representUndefinedDataType(), null, allRanges);

  return {
    ...entityState,
    ...relationshipState,
  };
}

function listAttributes(
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
  ].filter(isRepresentingAttribute);

  sortRepresentatives(language, result);

  return result;
}

/**
 * @throws InvalidState
 */
export function createEditAttributeDialogState(
  classesContext: ClassesContextType,
  graphContext: ModelGraphContextType,
  visualModel: VisualModel | null,
  language: string,
  model: InMemorySemanticModel,
  entity: SemanticModelRelationship,
): AttributeDialogState {

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

  const rdfsLiteral = representRdfsLiteral();

  const allDomains = listRelationshipDomains(
    classesContext, graphContext, allModels);
  sortRepresentatives(language, allDomains);

  const allRanges = listAttributeRanges();

  const allSpecializations = listAttributes(
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
    range.concept ?? rdfsLiteral.identifier, representUndefinedDataType(),
    range.cardinality, allRanges);

  return {
    ...entityState,
    ...relationshipState,
  };
}

/**
 * Creates a dialog to add an attribute to an existing entity.
 * Same as create new attribute just set the default domain to the entity.
 *
 * @throws InvalidState
 */
export function createAddAttributeDialogState(
  classesContext: ClassesContextType,
  graphContext: ModelGraphContextType,
  visualModel: VisualModel | null,
  language: string,
  entity: SemanticModelClass,
): AttributeDialogState {

  const allModels = semanticModelMapToCmeSemanticModel(
    graphContext.models, visualModel,
    configuration().defaultModelColor,
    identifier => t("model-service.model-label-from-id", identifier));

  const rdfsLiteral = representRdfsLiteral();

  const allDomains = listRelationshipDomains(
    classesContext, graphContext, allModels);
  sortRepresentatives(language, allDomains);

  const allRanges = listAttributeRanges();

  const allSpecializations = listAttributes(
    language, classesContext, graphContext, allModels);

  const defaultModel = selectDefaultModelForAttribute(
    entity.id, [...graphContext.models.values()], allModels);

  // EntityState

  const entityState = createNewBaseEntityDialogState(
    language, defaultModel.identifier, allModels, allSpecializations,
    configuration().relationshipNameToIri);

  // RelationshipState

  const relationshipState = createBaseRelationshipDialogState(
    allModels,
    entity.id, representUndefinedClass(), null, allDomains,
    rdfsLiteral.identifier, representUndefinedDataType(), null, allRanges);

  return {
    ...entityState,
    ...relationshipState,
    model: defaultModel,
  };
}
