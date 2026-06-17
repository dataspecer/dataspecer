import {
  ExtendedSemanticModelClass,
  ExtendedSemanticModelRelationship,
  isSemanticModelAttribute,
  isSemanticModelClass,
  isSemanticModelGeneralization,
  isSemanticModelRelationship,
  SemanticModelGeneralization,
  SemanticModelRelationship,
  // @ts-ignore cyclic dependency
} from "@dataspecer/core-v2/semantic-model/concepts";
import { OFN } from "../../well-known/index.ts";
import { ConceptualModel, ConceptualModelClass, ConceptualModelComplexType, ConceptualModelPrimitiveType, ConceptualModelProperty } from "../model/index.ts";
import { Entity, EntityArray } from "../../entity-model/entity.ts";
import { ModelIdentifier } from "../../model/model.ts";

interface WithConceptIris {
  /**
   * List of IRIs of the original entity that were referenced by the profile.
   */
  conceptIris?: string[];
}

class ConceptualModelAdapter {
  private model: EntityArray | null = null;
  private modelId: ModelIdentifier | null = null;

  private readonly classes: { [iri: string]: ConceptualModelClass } = {};

  load(model: EntityArray, modelId: ModelIdentifier): ConceptualModel | null {
    this.model = model;
    this.modelId = modelId;

    const result = new ConceptualModel();
    result.pimIri = this.modelId;
    result.humanLabel = {};
    result.humanDescription = {};
    for (const entity of this.model) {
      this.loadSemanticEntity(entity);
    }
    for (const entity of this.model) {
      if (isSemanticModelGeneralization(entity)) {
        this.loadGeneralization(entity);
      }
    }
    result.classes = { ...this.classes };
    return result;
  }

  private loadSemanticEntity(entity: Entity) {
    // todo: there should be no distinction between association and attribute
    if (isSemanticModelAttribute(entity)) {
      this.loadAttribute(entity as ExtendedSemanticModelRelationship);
    } else if (isSemanticModelRelationship(entity)) {
      this.loadRelationship(entity as ExtendedSemanticModelRelationship);
    } else if (isSemanticModelClass(entity)) {
      this.loadClass(entity as ExtendedSemanticModelClass);
    }
  }

  private loadRelationship(associationData: ExtendedSemanticModelRelationship) {
    // Association can be used in both directions.
    const leftClass = this.getClass(associationData.ends[0].concept);
    const rightClass = this.getClass(associationData.ends[1].concept);

    this.createAssociationEnd(leftClass, rightClass, associationData, 1);
    this.createAssociationEnd(rightClass, leftClass, associationData, 0, true);
  }

  /**
   * Needs to be loaded after all classes have been loaded.
   */
  private loadGeneralization(generalization: SemanticModelGeneralization) {
    const child = this.classes[generalization.child];
    const parent = this.classes[generalization.parent];
    if (child && parent) {
      child.extends.push(parent);
    }
  }

  private createAssociationEnd(source: ConceptualModelClass, target: ConceptualModelClass, association: SemanticModelRelationship, associationEnd: number, isReverse = false) {
    const end = association.ends[associationEnd];

    const property = new ConceptualModelProperty();
    property.pimIri = association.id;
    property.iris = this.getConceptIris(end);
    property.cimIri = property.iris[0] ?? null;
    property.humanLabel = end.name ?? association.name;
    property.humanDescription = end.description ?? association.description;
    property.usageNote = (end as any).usageNote ?? (association as any).usageNote ?? null;
    property.cardinalityMin = end.cardinality?.[0] ?? null;
    property.cardinalityMax = end.cardinality?.[1] ?? null;
    property.isReverse = isReverse;

    const type = new ConceptualModelComplexType();
    type.pimClassIri = target.pimIri;
    property.dataTypes.push(type);

    source.properties.push(property);
  }

  private getClass(pimClassIri: string): ConceptualModelClass {
    const result = this.classes[pimClassIri];
    if (result) {
      return result;
    }
    {
      const newClass = new ConceptualModelClass();
      newClass.pimIri = pimClassIri;
      this.classes[pimClassIri] = newClass;
      return newClass;
    }
  }

  /**
   * todo: typings
   */
  private getConceptIris(entity: any): string[] {
    return (entity as WithConceptIris).conceptIris.filter((iri) => iri !== null && iri !== "");
  }

  private loadAttribute(attributeData: ExtendedSemanticModelRelationship) {
    const end = attributeData.ends[1];

    const model = new ConceptualModelProperty();
    model.pimIri = attributeData.id;
    model.iris = this.getConceptIris(end);
    model.cimIri = model.iris[0] ?? null;
    model.humanLabel = end.name;
    model.humanDescription = end.description;
    model.usageNote = (end as any).usageNote ?? null;
    model.cardinalityMin = end.cardinality?.[0];
    model.cardinalityMax = end.cardinality?.[1];

    //if (attributeData.pimDatatype !== null) {
    const type = new ConceptualModelPrimitiveType();
    type.dataType = end.concept ?? OFN.string; // If no datatype is known for PIM attribute, use string
    type.languageStringRequiredLanguages = end.languageStringRequiredLanguages ?? [];
    type.regex = end.regex;
    type.example = end.example;
    model.dataTypes.push(type);
    //}

    const owner = this.getClass(attributeData.ends[0].concept);
    owner.properties.push(model);
  }

  private loadClass(classData: ExtendedSemanticModelClass) {
    const model = this.getClass(classData.id);
    model.pimIri = classData.id;
    model.iris = this.getConceptIris(classData);
    model.cimIri = model.iris[0] ?? null;
    model.humanLabel = classData.name;
    model.humanDescription = classData.description;
    model.usageNote = (classData as any).usageNote ?? null;
    model.isCodelist = classData.isCodelist;
    model.codelistUrl = classData.codelistUrl;
    // model.extends = classData.pimExtends.map((iri) => this.getClass(iri));
    model.regex = classData.regex ?? null;
    model.example = classData.example ?? null;
    model.objectExample = classData.objectExample ?? null;
  }
}

/**
 * Converts a semantic model represented by entities to a conceptual model.
 *
 * To use it, you probably want to pass an aggregated result = aggregated
 * semantic model, not a single semantic model from a package. It accepts
 * regular semantic entities, such as classes, properties, and relationships.
 *
 * @param model Aggregated semantic model.
 */
export function semanticModelToConceptualModel(model: EntityArray, modelId: ModelIdentifier): ConceptualModel | null {
  const adapter = new ConceptualModelAdapter();
  const data = adapter.load(model, modelId);
  return data;
}
