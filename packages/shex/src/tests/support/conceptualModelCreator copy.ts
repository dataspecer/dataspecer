import {
    ConceptualModel,
    ConceptualModelClass,
    ConceptualModelType,
    ConceptualModelComplexType,
    ConceptualModelProperty,
    ConceptualModelPrimitiveType,
  } from "@dataspecer/generators/conceptual-model/model";
  import { ArtefactGeneratorContext } from "@dataspecer/generators/generator";
  import { DataSpecificationArtefact } from "@dataspecer/core/data-specification/model";

class ConceptualModelCreator {

   createModel(): ConceptualModel{
    var model = new ConceptualModel();

      var primitiveType1 : ConceptualModelPrimitiveType;
      primitiveType1 = new ConceptualModelPrimitiveType();
      primitiveType1.dataType = "http://www.w3.org/2001/XMLSchema#boolean";
      primitiveType1.example = null;
      primitiveType1.regex = null;

      var property1 : ConceptualModelProperty;
      property1 = new ConceptualModelProperty();
      property1.cardinalityMax = 2;
      property1.cardinalityMin = 0;
      property1.cimIri = "https://example.com/mojeCimIri";
      property1.dataTypes = [primitiveType1];
      property1.humanDescription = {["cs"]: "Popisek 1"};
      property1.humanLabel = {["cs"]: "Label 1"};
      property1.isReverse = false;
      property1.pimIri = "https://example.com/mojePimIri";


      var class1 : ConceptualModelClass;
      class1 = new ConceptualModelClass();
      class1.cimIri = "https://example.com/class1/mojeCimIri";
      class1.codelistUrl = ["https://example.com/class1/codelistIri"];
      class1.example = null;
      //class1.extends = null;
      class1.humanDescription = {["cs"]: "Class 1 Popisek 1"};
      class1.humanLabel = {["cs"]: "Class 1 Label 1"};
      class1.pimIri = "https://example.com/class1/mojePimIri";
      class1.properties = [property1];
      class1.regex = null;


      model.classes = {"https://example.com/class1/mojePimIri": class1};

    return model;
  }
}

export default ConceptualModelCreator;