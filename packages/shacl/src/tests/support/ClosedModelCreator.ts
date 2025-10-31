import {
    StructureModel,
    StructureModelClass,
    StructureModelType,
    StructureModelComplexType,
    StructureModelProperty,
    StructureModelPrimitiveType,
    StructureModelSchemaRoot,
  } from "@dataspecer/core/structure-model/model";
  import { ArtefactGeneratorContext } from "@dataspecer/core/generator";
  import { DataSpecificationArtefact } from "@dataspecer/core/data-specification/model";
  import ModelCreator from "./ModelCreatorInterface.ts";

class ClosedModelCreator implements ModelCreator{

   createModel(): StructureModel{
    var model = new StructureModel();

      var primitiveType1 : StructureModelPrimitiveType;
      primitiveType1 = new StructureModelPrimitiveType();
      primitiveType1.dataType = "http://www.w3.org/2001/XMLSchema#string";
      primitiveType1.example = null;
      primitiveType1.regex = null;

      var property1 : StructureModelProperty;
      property1 = new StructureModelProperty();
      property1.cardinalityMin = 0;
      property1.cimIri = "https://slovník.gov.cz/generický/adresy/pojem/text-adresy";
      property1.dataTypes = [primitiveType1];
      property1.dematerialize = false;
      property1.humanDescription = {["cs"]: "Text adresy popis"};
      property1.humanLabel = {["cs"]: "Text adresy"};
      property1.isReverse = false;
      property1.pimIri = "https://slovník.gov.cz/generický/adresy/pojem/text-adresy";
      property1.psmIri = "https://slovník.gov.cz/generický/adresy/pojem/text-adresy";
      property1.technicalLabel = "text-adresy";

      var primitiveType2 : StructureModelPrimitiveType;
      primitiveType2 = new StructureModelPrimitiveType();
      primitiveType2.dataType = "http://www.w3.org/2001/XMLSchema#decimal";
      primitiveType2.example = null;
      primitiveType2.regex = null;

      var property2 : StructureModelProperty;
      property2 = new StructureModelProperty();
      property2.cardinalityMin = 0;
      property2.cimIri = "https://slovník.gov.cz/generický/adresy/pojem/má-kód-adresního-místa";
      property2.dataTypes = [primitiveType1];
      property2.dematerialize = false;
      property2.humanDescription = {["cs"]: "Kod adresniho mista"};
      property2.humanLabel = {["cs"]: "Kod adresniho mista"};
      property2.isReverse = false;
      property2.pimIri = "https://slovník.gov.cz/generický/adresy/pojem/má-kód-adresního-místa";
      property2.psmIri = "https://slovník.gov.cz/generický/adresy/pojem/má-kód-adresního-místa";
      property2.technicalLabel = "text-adresy";


      var class1 : StructureModelClass;
      class1 = new StructureModelClass();
      class1.cimIri = "https://slovník.gov.cz/legislativní/sbírka/111/2009/pojem/adresa";
      class1.codelistUrl = ["https://slovník.gov.cz/legislativní/sbírka/111/2009/pojem/adresa"];
      class1.example = null;
      //class1.extends = null;
      class1.humanDescription = {["cs"]: "Adresa popis"};
      class1.humanLabel = {["cs"]: "Adresa"};
      class1.pimIri = "https://slovník.gov.cz/legislativní/sbírka/111/2009/pojem/adresa";
      class1.properties = [property1];
      class1.psmIri = "https://slovník.gov.cz/legislativní/sbírka/111/2009/pojem/adresa";
      class1.regex = null;
      class1.specification = null;
      class1.structureSchema = null;
      class1.technicalLabel = "Technický popisek class 1";
      class1.isClosed = true;
      class1.instancesSpecifyTypes = "ALWAYS";

      var root1 : StructureModelSchemaRoot;
      root1 = new StructureModelSchemaRoot();
      root1.classes = [class1];

      model.roots = [root1];

    return model;
  }
}

export default ClosedModelCreator;