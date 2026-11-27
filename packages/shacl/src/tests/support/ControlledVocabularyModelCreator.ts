import {
  StructureModel,
  StructureModelClass,
  StructureModelComplexType,
  StructureModelPrimitiveType,
  StructureModelProperty,
  StructureModelSchemaRoot,
  StructureModelType,
} from "@dataspecer/generators/structure-model/model";
import type { ConceptualModelControlledVocabularyAssignment } from "@dataspecer/generators/conceptual-model/model";
import { OFN } from "@dataspecer/core/well-known";
import ModelCreator from "./ModelCreatorInterface.ts";

export interface ControlledVocabularyModelOptions {
  qualifier: ConceptualModelControlledVocabularyAssignment["qualifier"];
  /**
   * "iri" is the type of a class without properties, "class" is an association to a class with a property.
   */
  valueKind: "iri" | "class";
  requireRecommended?: boolean;
  restrictToRecommended?: boolean;
  identity?: "ALWAYS" | "NEVER";
  /**
   * Give the property a second type.
   */
  multipleTypes?: boolean;
}

/**
 * A dataset with a license property whose values come from a SKOS-based controlled vocabulary.
 */
class ControlledVocabularyModelCreator implements ModelCreator {

  constructor(private readonly options: ControlledVocabularyModelOptions) {}

  createModel(): StructureModel {
    const license = createProperty("license");
    license.dataTypes = [this.createValueType("License")];
    if (this.options.multipleTypes) {
      license.dataTypes.push(this.createValueType("Statement"));
    }

    const dataset = createClass("Dataset");
    dataset.instancesSpecifyTypes = "ALWAYS";
    dataset.properties = [license];

    const root = new StructureModelSchemaRoot();
    root.classes = [dataset];

    const model = new StructureModel();
    model.psmIri = "https://example.org/psm";
    model.roots = [root];
    return model;
  }

  private createValueType(name: string): StructureModelType {
    const vocabularies: ConceptualModelControlledVocabularyAssignment[] = [{
      id: "https://example.org/assignment",
      qualifier: this.options.qualifier,
      vocabulary: {
        id: "https://example.org/vocabulary",
        iri: "https://example.org/vocabulary",
        title: { en: "Licenses" },
        pattern: "^https://example.org/licenses/",
        references: "https://example.org/scheme",
        conformsToSkos: true,
      },
    }];

    if (this.options.valueKind === "iri") {
      const type = new StructureModelPrimitiveType();
      type.dataType = OFN.url;
      type.controlledVocabularies = vocabularies;
      type.requireRecommendedControlledVocabularyValue = this.options.requireRecommended ?? false;
      type.restrictToRecommendedControlledVocabulary = this.options.restrictToRecommended ?? false;
      return type;
    }

    const title = createProperty("title");
    const stringType = new StructureModelPrimitiveType();
    stringType.dataType = OFN.string;
    title.dataTypes = [stringType];

    const valueClass = createClass(name);
    valueClass.instancesHaveIdentity = this.options.identity ?? "ALWAYS";
    valueClass.properties = [title];
    valueClass.controlledVocabularies = vocabularies;
    valueClass.requireRecommendedControlledVocabularyValue = this.options.requireRecommended ?? false;
    valueClass.restrictToRecommendedControlledVocabulary = this.options.restrictToRecommended ?? false;

    const type = new StructureModelComplexType();
    type.dataType = valueClass;
    return type;
  }
}

function createClass(name: string): StructureModelClass {
  const result = new StructureModelClass();
  result.cimIri = `https://example.org/${name}`;
  result.pimIri = `https://example.org/pim/${name}`;
  result.psmIri = `https://example.org/psm/${name}`;
  result.technicalLabel = name;
  result.instancesSpecifyTypes = "OPTIONAL";
  return result;
}

function createProperty(name: string): StructureModelProperty {
  const result = new StructureModelProperty();
  result.cimIri = `https://example.org/${name}`;
  result.pimIri = `https://example.org/pim/${name}`;
  result.psmIri = `https://example.org/psm/${name}`;
  result.technicalLabel = name;
  result.cardinalityMin = 0;
  return result;
}

export default ControlledVocabularyModelCreator;
