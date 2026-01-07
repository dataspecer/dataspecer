// @ts-ignore
import { Entity, EntityModel } from "@dataspecer/core-v2";
// @ts-ignore
import { ExtendedSemanticModelClass, ExtendedSemanticModelRelationship, isSemanticModelAttribute, isSemanticModelClass, isSemanticModelGeneralization, isSemanticModelRelationship, SemanticModelGeneralization, SemanticModelRelationship } from "@dataspecer/core-v2/semantic-model/concepts";
import { CoreResourceReader } from "../../core/index.ts";
import { OFN } from "../../well-known/index.ts";
import {
  ConceptualModel,
  ConceptualModelClass,
  ConceptualModelComplexType,
  ConceptualModelPrimitiveType,
  ConceptualModelProperty,
} from "../model/index.ts";

interface WithConceptIris {
  /**
   * List of IRIs of the original entity that were referenced by the profile.
   */
  conceptIris?: string[];
}

class ConceptualModelAdapter {
  private readonly reader: CoreResourceReader;

  private readonly classes: { [iri: string]: ConceptualModelClass } = {};

  constructor(reader: CoreResourceReader) {
    this.reader = reader;
  }

  async load(pimSchemaIri: string): Promise<ConceptualModel | null> {
    const pimSchema = await this.reader.readResource(pimSchemaIri) as unknown as EntityModel;

    const result = new ConceptualModel();
    this.pimSchemaToModel(pimSchema, result);
    for (const entity of Object.keys(pimSchema.getEntities())) {
      await this.loadPimPart(entity);
    }
    for (const entityId of Object.keys(pimSchema.getEntities())) {
      const entity = await this.reader.readResource(entityId) as unknown as Entity;
      if (isSemanticModelGeneralization(entity)) {
        await this.loadGeneralization(entity);
      }
    }
    result.classes = { ...this.classes };
    return result;
  }

  private pimSchemaToModel(schemaData: EntityModel, model: ConceptualModel) {
    model.pimIri = schemaData.getId();
    model.humanLabel = {};
    model.humanDescription = {};
  }

  private async loadPimPart(partIri: string) {
    const part = await this.reader.readResource(partIri) as unknown as Entity;
    // let isKnown = false;
    // if (PimAssociation.is(part)) {
    //   await this.loadPimAssociation(part);
    //   isKnown = true;
    // }
    if (isSemanticModelAttribute(part)) {
      await this.loadPimAttribute(part as ExtendedSemanticModelRelationship);
    } else if (isSemanticModelRelationship(part)) {
      await this.loadPimAssociation(part as ExtendedSemanticModelRelationship);
    } else if (isSemanticModelClass(part)) {
      this.loadPimClass(part as ExtendedSemanticModelClass);
    }
    // if (!isKnown) {
    //   throw new Error(`Unsupported PIM part entity '${partIri}'.`);
    // }
  }

  private async loadPimAssociation(associationData: ExtendedSemanticModelRelationship) {
    // Association can be used in both directions.
    const leftClass = this.getClass(associationData.ends[0].concept);
    const rightClass = this.getClass(associationData.ends[1].concept);

    this.createAssociationEnd(leftClass, rightClass, associationData, 1);
    this.createAssociationEnd(rightClass, leftClass, associationData, 0, true);
  }

  private async loadGeneralization(generalization: SemanticModelGeneralization) {
    const child = this.classes[generalization.child];
    const parent = this.classes[generalization.parent];
    if (child && parent) {
      child.extends.push(parent);
    }
  }

  private createAssociationEnd(
    source: ConceptualModelClass,
    target: ConceptualModelClass,
    association: SemanticModelRelationship,
    associationEnd: number,
    isReverse = false,
  ) {
    const end = association.ends[associationEnd];

    const property = new ConceptualModelProperty();
    property.pimIri = association.id;
    property.iris = this.getConceptIris(end);
    property.cimIri = property.iris[0] ?? null;
    property.humanLabel = end.name ?? association.name;
    property.humanDescription = end.description ?? association.description;
    property.humanUsageNote = (end as any).usageNote ?? (association as any).usageNote ?? null;
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

  private async loadPimAttribute(attributeData: ExtendedSemanticModelRelationship) {
    const end = attributeData.ends[1];

    const model = new ConceptualModelProperty();
    model.pimIri = attributeData.id;
    model.iris = this.getConceptIris(end);
    model.cimIri = model.iris[0] ?? null;
    model.humanLabel = end.name;
    model.humanDescription = end.description;
    model.humanUsageNote = (end as any).usageNote ?? null;
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

  private loadPimClass(classData: ExtendedSemanticModelClass) {
    const model = this.getClass(classData.id);
    model.pimIri = classData.id;
    model.iris = this.getConceptIris(classData);
    model.cimIri = model.iris[0] ?? null;
    model.humanLabel = classData.name;
    model.humanDescription = classData.description;
    model.humanUsageNote = (classData as any).usageNote ?? null;
    model.isCodelist = classData.isCodelist;
    model.codelistUrl = classData.codelistUrl;
    // model.extends = classData.pimExtends.map((iri) => this.getClass(iri));
    model.regex = classData.regex ?? null;
    model.example = classData.example ?? null;
    model.objectExample = classData.objectExample ?? null;
  }
}

export async function coreResourcesToConceptualModel(
  reader: CoreResourceReader,
  pimSchemaIri: string
): Promise<ConceptualModel | null> {
  const adapter = new ConceptualModelAdapter(reader);
  const data = await adapter.load(pimSchemaIri);
  return data;
}
