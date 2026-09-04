import {
    StructureModel,
    StructureModelClass,
    StructureModelProperty,
    StructureModelPrimitiveType,
    StructureModelSchemaRoot,
  } from "@dataspecer/generators/structure-model/model";
  import ModelCreator from "./ModelCreatorInterface.ts";

class MaxMinCardinalityModelCreator implements ModelCreator{

   createModel(): StructureModel{
    var model = new StructureModel();

      var primitiveType1 : StructureModelPrimitiveType;
      primitiveType1 = new StructureModelPrimitiveType();
      primitiveType1.dataType = "http://www.w3.org/2001/XMLSchema#string";
      primitiveType1.example = null;
      primitiveType1.regex = null;

      var primitiveType2 : StructureModelPrimitiveType;
      primitiveType2 = new StructureModelPrimitiveType();
      primitiveType2.dataType = "http://www.w3.org/2001/XMLSchema#boolean";

      var property2 : StructureModelProperty;
      property2 = new StructureModelProperty();
      property2.cardinalityMax = 1;
      property2.cardinalityMin = 1;
      property2.cimIri = "https://slovník.gov.cz/datový/události/pojem/registrace";
      property2.dataTypes = [primitiveType2];
      property2.dematerialize = false;
      property2.humanDescription = {["cs"]: "Zda je nutná registrace"};
      property2.humanLabel = {["cs"]: "Registrace"};
      property2.isReverse = false;
      property2.pimIri = "https://slovník.gov.cz/datový/události/pojem/registrace";
      property2.psmIri = "https://slovník.gov.cz/datový/události/pojem/registrace";
      property2.technicalLabel = "registrace";

      var property1 : StructureModelProperty;
      property1 = new StructureModelProperty();
      property1.cardinalityMin = 1;
      property1.cimIri = "https://slovník.gov.cz/datový/události/pojem/dlouhý-popis";
      property1.dataTypes = [primitiveType1];
      property1.dematerialize = false;
      property1.humanDescription = {["cs"]: "Dlouhý popis události"};
      property1.humanLabel = {["cs"]: "Dlouhý popis"};
      property1.isReverse = false;
      property1.pimIri = "https://slovník.gov.cz/datový/události/pojem/dlouhý-popis";
      property1.psmIri = "https://slovník.gov.cz/datový/události/pojem/dlouhý-popis";
      property1.technicalLabel = "dlouhý-popis";

      var class1 : StructureModelClass;
      class1 = new StructureModelClass();
      class1.cimIri = "https://slovník.gov.cz/datový/události/pojem/událost";
      class1.codelistUrl = ["https://slovník.gov.cz/datový/události/pojem/událost"];
      class1.example = null;
      //class1.extends = null;
      class1.humanDescription = {["cs"]: "Popis události"};
      class1.humanLabel = {["cs"]: "Událost"};
      class1.pimIri = "https://slovník.gov.cz/datový/události/pojem/událost";
      class1.properties = [property1, property2];
      class1.psmIri = "https://slovník.gov.cz/datový/události/pojem/událost";
      class1.regex = null;
      class1.specification = null;
      class1.structureSchema = null;
      class1.technicalLabel = "Technický popisek class 1";
      class1.instancesSpecifyTypes = "ALWAYS";

      var root1 : StructureModelSchemaRoot;
      root1 = new StructureModelSchemaRoot();
      root1.classes = [class1];

      model.roots = [root1];

    return model;
  }
}

export default MaxMinCardinalityModelCreator;