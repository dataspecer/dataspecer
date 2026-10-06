import {
    StructureModel,
    StructureModelClass,
    StructureModelComplexType,
    StructureModelProperty,
    StructureModelPrimitiveType,
    StructureModelSchemaRoot,
  } from "@dataspecer/generators/structure-model/model";
  import ModelCreator from "./ModelCreatorInterface.ts";

class NestedClosedModelCreator implements ModelCreator{

  createModel(): StructureModel{
    var model = new StructureModel();

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
      datumVzniku.cardinalityMin = 1;
      datumVzniku.cimIri = "https://slovník.gov.cz/legislativní/sbírka/111/2009/pojem/datum-vzniku-obce";
      datumVzniku.dataTypes = [dateType];
      datumVzniku.dematerialize = false;
      datumVzniku.humanDescription = {["cs"]: "Stát - země, ve které se objekt nachází"};
      datumVzniku.humanLabel = {["cs"]: "Stát"};
      datumVzniku.isReverse = false;
      datumVzniku.pimIri = "https://example.com/mojePimIriStat";
      datumVzniku.psmIri = "https://example.com/mojePsmIriStat";
      datumVzniku.technicalLabel = "stat-popisek";

      var class2 : StructureModelClass;
      class2 = new StructureModelClass();
      class2.cimIri = "https://slovník.gov.cz/legislativní/sbírka/111/2009/pojem/území-obce";
      class2.codelistUrl = ["https://example.com/class1/codelistIri"];
      class2.example = null;
      class2.humanDescription = {["cs"]: "Adresa bydliště dané osoby"};
      class2.humanLabel = {["cs"]: "Adresa", ["pl"]: "Adres"};
      class2.pimIri = "https://example.com/class1/mojePimIriadresa";
      class2.properties = [datumVzniku];
      class2.psmIri = "https://example.com/class1/mojePsmIriadresa";
      class2.regex = null;
      class2.specification = null;
      class2.structureSchema = null;
      class2.technicalLabel = "uzemi-obce";

      var uzemiObce : StructureModelComplexType;
      uzemiObce = new StructureModelComplexType();
      uzemiObce.dataType = class2;

      var maPrirazene : StructureModelProperty;
      maPrirazene = new StructureModelProperty();
      maPrirazene.cardinalityMin = 0;
      maPrirazene.cimIri = "https://slovník.gov.cz/legislativní/sbírka/111/2009/pojem/má-přiřazené-území-obce";
      maPrirazene.dataTypes = [uzemiObce];
      maPrirazene.dematerialize = false;
      maPrirazene.humanDescription = {["cs"]: "Adresa bydliště dané osoby"};
      maPrirazene.humanLabel = {["cs"]: "Adresa"};
      maPrirazene.isReverse = false;
      maPrirazene.pimIri = "https://example.com/mojePimIriadresa";
      maPrirazene.psmIri = "https://example.com/mojePsmIriadresa";
      maPrirazene.technicalLabel = "ma-prirazene-uzemi-obce";

      var cp : StructureModelProperty;
      cp = new StructureModelProperty();
      cp.cardinalityMax = 1;
      cp.cardinalityMin = 1;
      cp.cimIri = "https://slovník.gov.cz/legislativní/sbírka/111/2009/pojem/číslo-popisné-nebo-evidenční";
      cp.dataTypes = [primitiveType8];
      cp.dematerialize = false;
      cp.humanDescription = {["cs"]: "Datum narození dané osoby"};
      cp.humanLabel = {["cs"]: "Dodatek čísla orientačního"};
      cp.isReverse = false;
      cp.pimIri = "https://slovník.gov.cz/legislativní/sbírka/326/2000/pojem/dodatek-čísla-orientačního";
      cp.psmIri = "https://slovník.gov.cz/legislativní/sbírka/326/2000/pojem/dodatek-čísla-orientačního";
      cp.technicalLabel = "cislo-popisne-nebo-evidencni";

      var class5 : StructureModelClass;
      class5 = new StructureModelClass();
      class5.cimIri = "https://slovník.gov.cz/legislativní/sbírka/111/2009/pojem/identifikační-údaje-stavebního-objektu";
      class5.codelistUrl = ["https://slovník.gov.cz/legislativní/sbírka/111/2009/pojem/číslo-orientační"];
      class5.example = null;
      class5.humanDescription = {["cs"]: "Číslo orientační"};
      class5.humanLabel = {["cs"]: "Datum narození a úmrtí", ["en"]: "Date of birth and death"};
      class5.pimIri = "https://slovník.gov.cz/legislativní/sbírka/111/2009/pojem/číslo-orientační";
      class5.properties = [cp];
      class5.psmIri = "https://slovník.gov.cz/legislativní/sbírka/111/2009/pojem/číslo-orientační";
      class5.isClosed = true;
      class5.specification = null;
      class5.structureSchema = null;
      class5.technicalLabel = "id-udaje-stavebniho-objektu";

      var class4 : StructureModelClass;
      class4 = new StructureModelClass();
      class4.cimIri = "https://slovník.gov.cz/legislativní/sbírka/111/2009/pojem/číslo-orientační";
      class4.codelistUrl = ["https://slovník.gov.cz/legislativní/sbírka/111/2009/pojem/číslo-orientační"];
      class4.example = null;
      class4.humanDescription = {["cs"]: "Číslo orientační"};
      class4.humanLabel = {["cs"]: "Datum narození a úmrtí", ["en"]: "Date of birth and death"};
      class4.pimIri = "https://slovník.gov.cz/legislativní/sbírka/111/2009/pojem/číslo-orientační";
      class4.properties = [cp];
      class4.psmIri = "https://slovník.gov.cz/legislativní/sbírka/111/2009/pojem/číslo-orientační";
      class4.isClosed = true;
      class4.specification = null;
      class4.structureSchema = null;
      class4.technicalLabel = "cislo-orientacni";

      var complexType3 : StructureModelComplexType;
      complexType3 = new StructureModelComplexType();
      complexType3.dataType = class4;

      var complexType4 : StructureModelComplexType;
      complexType4 = new StructureModelComplexType();
      complexType4.dataType = class5;

      var maKodAdresnihoMista : StructureModelProperty;
      maKodAdresnihoMista = new StructureModelProperty();
      maKodAdresnihoMista.cardinalityMax = 1;
      maKodAdresnihoMista.cardinalityMin = 1;
      maKodAdresnihoMista.cimIri = "https://slovník.gov.cz/generický/adresy/pojem/má-kód-adresního-místa";
      maKodAdresnihoMista.dataTypes = [primitiveType8];
      maKodAdresnihoMista.dematerialize = false;
      maKodAdresnihoMista.humanDescription = {["cs"]: "Datum narození a úmrtí dané osoby"};
      maKodAdresnihoMista.humanLabel = {["cs"]: "Datum narození a úmrtí"};
      maKodAdresnihoMista.isReverse = false;
      maKodAdresnihoMista.pimIri = "https://example.com/mojePimIriadresa";
      maKodAdresnihoMista.psmIri = "https://example.com/mojePsmIriadresa";
      maKodAdresnihoMista.technicalLabel = "narozeni-a-umrti-popisek";

      var maIdentifikacniUdaje : StructureModelProperty;
      maIdentifikacniUdaje = new StructureModelProperty();
      maIdentifikacniUdaje.cardinalityMin = 0;
      maIdentifikacniUdaje.cimIri = "https://slovník.gov.cz/legislativní/sbírka/111/2009/pojem/má-identifikační-údaje-stavebního-objektu";
      maIdentifikacniUdaje.dataTypes = [complexType4];
      maIdentifikacniUdaje.dematerialize = false;
      maIdentifikacniUdaje.humanDescription = {["cs"]: "Má identifikační údaje popis"};
      maIdentifikacniUdaje.humanLabel = {["cs"]: "Má identifikační údaje"};
      maIdentifikacniUdaje.isReverse = false;
      maIdentifikacniUdaje.pimIri = "https://example.com/mojePimIriPSC";
      maIdentifikacniUdaje.psmIri = "https://example.com/mojePsmIriPSC";
      maIdentifikacniUdaje.technicalLabel = "ma-identifikacni-udaje";

      var typOchrany : StructureModelProperty;
      typOchrany = new StructureModelProperty();
      typOchrany.cardinalityMin = 0;
      typOchrany.cimIri = "https://slovník.gov.cz/legislativní/sbírka/111/2009/pojem/typ-ochrany-stavebního-objektu";
      typOchrany.dataTypes = [primitiveType8];
      typOchrany.dematerialize = false;
      typOchrany.humanDescription = {["cs"]: "Typ ochrany popisek"};
      typOchrany.humanLabel = {["cs"]: "Typ ochrany stavebního objektu"};
      typOchrany.isReverse = false;
      typOchrany.pimIri = "https://example.com/mojePimIriStat";
      typOchrany.psmIri = "https://example.com/mojePsmIriStat";
      typOchrany.technicalLabel = "typ-ochrany";

      var class3 : StructureModelClass;
      class3 = new StructureModelClass();
      class3.cimIri = "https://slovník.gov.cz/legislativní/sbírka/111/2009/pojem/stavební-objekt";
      class3.codelistUrl = ["https://slovník.gov.cz/legislativní/sbírka/111/2009/pojem/stavební-objekt"];
      class3.example = null;
      class3.humanDescription = {["cs"]: "Stavební objekt popis"};
      class3.humanLabel = {["cs"]: "Stavební objekt"};
      class3.pimIri = "https://example.com/class1/mojePimIriadresa";
      class3.properties = [typOchrany, maIdentifikacniUdaje];
      class3.psmIri = "https://example.com/class1/mojePsmIriadresa";
      class3.regex = null;
      class3.isClosed = true;
      class3.specification = null;
      class3.structureSchema = null;
      class3.technicalLabel = "stavebni-objekt";

      var complexType2 : StructureModelComplexType;
      complexType2 = new StructureModelComplexType();
      complexType2.dataType = class3;

      var jeAdresou : StructureModelProperty;
      jeAdresou = new StructureModelProperty();
      jeAdresou.cardinalityMax = 1;
      jeAdresou.cardinalityMin = 1;
      jeAdresou.cimIri = "https://slovník.gov.cz/legislativní/sbírka/111/2009/pojem/je-adresou-stavebního-objektu";
      jeAdresou.dataTypes = [complexType2];
      jeAdresou.dematerialize = false;
      jeAdresou.humanDescription = {["cs"]: "Je adresou stavebního objektu popis"};
      jeAdresou.humanLabel = {["cs"]: "Je adresou stavebního objektu"};
      jeAdresou.isReverse = false;
      jeAdresou.pimIri = "https://example.com/mojePimIriadresa";
      jeAdresou.psmIri = "https://example.com/mojePsmIriadresa";
      jeAdresou.technicalLabel = "je-adresou-stavebniho-objektu";

      var maKodAdresnihoMista : StructureModelProperty;
      maKodAdresnihoMista = new StructureModelProperty();
      maKodAdresnihoMista.cardinalityMax = 1;
      maKodAdresnihoMista.cardinalityMin = 1;
      maKodAdresnihoMista.cimIri = "https://slovník.gov.cz/generický/adresy/pojem/má-kód-adresního-místa";
      maKodAdresnihoMista.dataTypes = [primitiveType8];
      maKodAdresnihoMista.dematerialize = false;
      maKodAdresnihoMista.humanDescription = {["cs"]: "Má kód adresního místa popis"};
      maKodAdresnihoMista.humanLabel = {["cs"]: "Má kód adresního místa"};
      maKodAdresnihoMista.isReverse = false;
      maKodAdresnihoMista.pimIri = "https://example.com/mojePimIriadresa";
      maKodAdresnihoMista.psmIri = "https://example.com/mojePsmIriadresa";
      maKodAdresnihoMista.technicalLabel = "ma-kod-adresniho-mista";

      var class1 : StructureModelClass;
      class1 = new StructureModelClass();
      class1.cimIri = "https://slovník.gov.cz/legislativní/sbírka/111/2009/pojem/adresa";
      class1.codelistUrl = ["https://slovník.gov.cz/legislativní/sbírka/111/2009/pojem/adresa"];
      class1.example = null;
      //class1.extends = null;
      class1.humanDescription = {["cs"]: "Adresa popis"};
      class1.humanLabel = {["cs"]: "Adresa"};
      class1.pimIri = "https://slovník.gov.cz/legislativní/sbírka/111/2009/pojem/adresa";
      class1.properties = [maPrirazene, jeAdresou, maKodAdresnihoMista];
      class1.psmIri = "https://slovník.gov.cz/legislativní/sbírka/111/2009/pojem/adresa";
      class1.regex = null;
      class1.specification = null;
      class1.structureSchema = null;
      class1.technicalLabel = "adresa";
      class1.instancesSpecifyTypes = "ALWAYS";

      var root1 : StructureModelSchemaRoot;
      root1 = new StructureModelSchemaRoot();
      root1.classes = [class1];

      model.roots = [root1];

    return model;
  }
}

export default NestedClosedModelCreator;