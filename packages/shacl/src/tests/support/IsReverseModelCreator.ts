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

class IsReverseModelCreator implements ModelCreator{

   createModel(): StructureModel{
    var model = new StructureModel();

    var class1 : StructureModelClass;
    class1 = new StructureModelClass();
    class1.cimIri = "https://slovník.gov.cz/generický/umístění/pojem/místo";
    class1.codelistUrl = ["https://example.com/class1/codelistIri"];
    class1.example = null;
    class1.humanDescription = {["cs"]: "Místo popis"};
    class1.humanLabel = {["cs"]: "Místo", ["en"]: "Place"};
    class1.pimIri = "https://example.com/class1/mojePimIriadresa";
    class1.properties = [];
    class1.psmIri = "https://example.com/class1/mojePsmIriadresa";
    class1.regex = null;
    class1.isClosed = false;
    class1.specification = null;
    class1.structureSchema = null;
    class1.technicalLabel = "misto";


    var complexType3 : StructureModelComplexType;
    complexType3 = new StructureModelComplexType();
    complexType3.dataType = class1;

      var property1 : StructureModelProperty;
      property1 = new StructureModelProperty();
      property1.cardinalityMin = 1;
      property1.cimIri = "https://slovník.gov.cz/generický/umístění/pojem/má-adresu";
      property1.dataTypes = [complexType3];
      property1.dematerialize = false;
      property1.humanDescription = {["cs"]: "Text má adresu popis"};
      property1.humanLabel = {["cs"]: "Má adresu"};
      property1.isReverse = true;
      property1.pimIri = "https://slovník.gov.cz/generický/umístění/pojem/má-adresu";
      property1.psmIri = "https://slovník.gov.cz/generický/umístění/pojem/má-adresu";
      property1.technicalLabel = "má_adresu";

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
      class1.isClosed = false;
      class1.instancesSpecifyTypes = "ALWAYS";

      var root1 : StructureModelSchemaRoot;
      root1 = new StructureModelSchemaRoot();
      root1.classes = [class1];

      model.roots = [root1];

    return model;
  }
}

export default IsReverseModelCreator;