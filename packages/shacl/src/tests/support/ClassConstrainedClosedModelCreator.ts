import {
    StructureModel,
    StructureModelClass,
    StructureModelComplexType,
    StructureModelProperty,
    StructureModelPrimitiveType,
    StructureModelSchemaRoot,
  } from "@dataspecer/generators/structure-model/model";
import ModelCreator from "./ModelCreatorInterface.ts";

class ClassConstrainedClosedModelCreator implements ModelCreator{

  createModel(): StructureModel{
    var model = new StructureModel();

      //zipType.regex = "^\d{3}(?:[-\s]\d{2}){1}$";

      var dateType : StructureModelPrimitiveType;
      dateType = new StructureModelPrimitiveType();
      dateType.dataType = "http://www.w3.org/2001/XMLSchema#date";
      dateType.example = null;
      dateType.regex = null;

      var primitiveType8 : StructureModelPrimitiveType;
      primitiveType8 = new StructureModelPrimitiveType();
      primitiveType8.dataType = "http://www.w3.org/2001/XMLSchema#string";
      primitiveType8.example = null;
      primitiveType8.regex = null;

      var datumVzniku : StructureModelProperty;
      datumVzniku = new StructureModelProperty();
      datumVzniku.cardinalityMax = 1;
      datumVzniku.cardinalityMin = 0;
      datumVzniku.cimIri = "https://slovník.gov.cz/legislativní/sbírka/111/2009/pojem/datum-vzniku-území-městského-obvodu-v-hlavním-městě-praze";
      datumVzniku.dataTypes = [dateType];
      datumVzniku.dematerialize = false;
      datumVzniku.humanDescription = {["cs"]: "Datum vzniku území obvodu popis"};
      datumVzniku.humanLabel = {["cs"]: "Datum vzniku území obvodu "};
      datumVzniku.isReverse = false;
      datumVzniku.pimIri = "https://example.com/mojePimIriStat";
      datumVzniku.psmIri = "https://example.com/mojePsmIriStat";
      datumVzniku.technicalLabel = "datum-vzniku-obvodu";

      var class4 : StructureModelClass;
      class4 = new StructureModelClass();
      class4.cimIri = "https://slovník.gov.cz/legislativní/sbírka/111/2009/pojem/území-městského-obvodu-v-hlavním-městě-praze";
      class4.codelistUrl = ["https://example.com/class1/codelistIri"];
      class4.example = null;
      class4.humanDescription = {["cs"]: "Území městského obvodu v hlavním městě Praze popis"};
      class4.humanLabel = {["cs"]: "Území městského obvodu v hlavním městě Praze"};
      class4.pimIri = "https://example.com/class1/mojePimIriadresa";
      class4.properties = [datumVzniku];
      class4.psmIri = "https://example.com/class1/mojePsmIriadresa";
      class4.regex = null;
      class4.isClosed = false;
      class4.specification = null;
      class4.structureSchema = null;
      class4.technicalLabel = "uzemi-mestskeho-obvodu";

      var complexType3 : StructureModelComplexType;
      complexType3 = new StructureModelComplexType();
      complexType3.dataType = class4;

      var property3 : StructureModelProperty;
      property3 = new StructureModelProperty();
      property3.cardinalityMax = 1;
      property3.cardinalityMin = 1;
      property3.cimIri = "https://slovník.gov.cz/legislativní/sbírka/111/2009/pojem/má-přiřazené-území-městského-obvodu-v-hlavním-městě-praze";
      property3.dataTypes = [complexType3];
      property3.dematerialize = false;
      property3.humanDescription = {["cs"]: "Má přiřazené území městského obvodu v hlavním městě Praze popis"};
      property3.humanLabel = {["cs"]: "Má přiřazené území městského obvodu v hlavním městě Praze"};
      property3.isReverse = false;
      property3.pimIri = "https://example.com/mojePimIriadresa";
      property3.psmIri = "https://example.com/mojePsmIriadresa";
      property3.technicalLabel = "ma-prirazene-uzemi";

      var typObjektu : StructureModelProperty;
      typObjektu = new StructureModelProperty();
      typObjektu.cardinalityMax = 2;
      typObjektu.cardinalityMin = 1;
      typObjektu.cimIri = "https://slovník.gov.cz/legislativní/sbírka/111/2009/pojem/typ-stavebního-objektu";
      typObjektu.dataTypes = [primitiveType8];
      typObjektu.dematerialize = false;
      typObjektu.humanDescription = {["cs"]: "Typ stavebního objektu popis"};
      typObjektu.humanLabel = {["cs"]: "Typ stavebního objektu"};
      typObjektu.isReverse = false;
      typObjektu.pimIri = "https://example.com/mojePimIriPSC";
      typObjektu.psmIri = "https://example.com/mojePsmIriPSC";
      typObjektu.technicalLabel = "typ-stavebniho-objektu";

      var typOchrany : StructureModelProperty;
      typOchrany = new StructureModelProperty();
      typOchrany.cardinalityMax = 2;
      typOchrany.cardinalityMin = 1;
      typOchrany.cimIri = "https://slovník.gov.cz/legislativní/sbírka/111/2009/pojem/typ-ochrany-stavebního-objektu";
      typOchrany.dataTypes = [primitiveType8];
      typOchrany.dematerialize = false;
      typOchrany.humanDescription = {["cs"]: "Typ ochrany stavebního objektu popis"};
      typOchrany.humanLabel = {["cs"]: "Typ ochrany stavebního objektu"};
      typOchrany.isReverse = false;
      typOchrany.pimIri = "https://example.com/mojePimIriStat";
      typOchrany.psmIri = "https://example.com/mojePsmIriStat";
      typOchrany.technicalLabel = "typ-ochrany-stavebniho-objektu";

      var class3 : StructureModelClass;
      class3 = new StructureModelClass();
      class3.cimIri = "https://slovník.gov.cz/legislativní/sbírka/111/2009/pojem/stavební-objekt";
      class3.codelistUrl = ["https://example.com/class1/codelistIri"];
      class3.example = null;
      class3.humanDescription = {["cs"]: "Stavební objekt popisek"};
      class3.humanLabel = {["cs"]: "Stavební objekt", ["en"]: "Construction site"};
      class3.pimIri = "https://example.com/class1/mojePimIriadresa";
      class3.properties = [typOchrany, typObjektu];
      class3.psmIri = "https://example.com/class1/mojePsmIriadresa";
      class3.regex = null;
      class3.isClosed = true;
      class3.specification = null;
      class3.structureSchema = null;
      class3.technicalLabel = "stavebni-objekt";

      var complexType2 : StructureModelComplexType;
      complexType2 = new StructureModelComplexType();
      complexType2.dataType = class3;

      var property2 : StructureModelProperty;
      property2 = new StructureModelProperty();
      property2.cardinalityMax = 1;
      property2.cardinalityMin = 1;
      property2.cimIri = "https://slovník.gov.cz/legislativní/sbírka/111/2009/pojem/je-adresou-stavebního-objektu";
      property2.dataTypes = [complexType2];
      property2.dematerialize = false;
      property2.humanDescription = {["cs"]: "Je adresou stavebního objektu popisek"};
      property2.humanLabel = {["cs"]: "Je adresou stavebního objektu"};
      property2.isReverse = false;
      property2.pimIri = "https://example.com/mojePimIriadresa";
      property2.psmIri = "https://example.com/mojePsmIriadresa";
      property2.technicalLabel = "je-adresou-stavebniho-objektu";

      var class1 : StructureModelClass;
      class1 = new StructureModelClass();
      class1.cimIri = "https://slovník.gov.cz/legislativní/sbírka/111/2009/pojem/adresa";
      class1.codelistUrl = ["https://slovník.gov.cz/legislativní/sbírka/111/2009/pojem/adresa"];
      class1.example = null;
      //class1.extends = null;
      class1.humanDescription = {["cs"]: "Adresa popisek"};
      class1.humanLabel = {["cs"]: "Adresa"};
      class1.pimIri = "https://example.com/class1/mojePimIri";
      class1.properties = [property2, property3];
      class1.psmIri = "https://example.com/class1/mojePsmIri";
      class1.regex = null;
      class1.isClosed = true;
      class1.specification = null;
      class1.structureSchema = null;
      class1.technicalLabel = "osoba";
      class1.instancesSpecifyTypes = "ALWAYS";

      var root1 : StructureModelSchemaRoot;
      root1 = new StructureModelSchemaRoot();
      root1.classes = [class1];

      model.roots = [root1];

    return model;
  }
}

export default ClassConstrainedClosedModelCreator;