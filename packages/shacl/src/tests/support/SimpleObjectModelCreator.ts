import {
    StructureModel,
    StructureModelClass,
    StructureModelComplexType,
    StructureModelProperty,
    StructureModelPrimitiveType,
    StructureModelSchemaRoot,
  } from "@dataspecer/generators/structure-model/model";
  import { ArtefactGeneratorContext } from "@dataspecer/generators/generator";
  import { DataSpecificationArtefact } from "@dataspecer/core/data-specification/model";
  import ModelCreator from "./ModelCreatorInterface.ts";

class SimpleObjectModelCreator implements ModelCreator{

  createModel(): StructureModel{
    var model = new StructureModel();

      var zipType : StructureModelPrimitiveType;
      zipType = new StructureModelPrimitiveType();
      zipType.dataType = "http://www.w3.org/2001/XMLSchema#integer";
      zipType.example = null;
      zipType.regex = "^\d{3}(?:[-\s]\d{2}){1}$";

      var primitiveType1 : StructureModelPrimitiveType;
      primitiveType1 = new StructureModelPrimitiveType();
      primitiveType1.dataType = "http://www.w3.org/2001/XMLSchema#integer";
      primitiveType1.example = null;
      primitiveType1.regex = null;

      var primitiveType8 : StructureModelPrimitiveType;
      primitiveType8 = new StructureModelPrimitiveType();
      primitiveType8.dataType = "http://www.w3.org/2001/XMLSchema#string";
      primitiveType8.example = null;
      primitiveType8.regex = null;

      var nazev : StructureModelProperty;
      nazev = new StructureModelProperty();
      nazev.cardinalityMin = 1;
      nazev.cimIri = "https://slovník.gov.cz/legislativní/sbírka/111/2009/pojem/název-městského-obvodu-v-hlavním-městě-praze";
      nazev.dataTypes = [primitiveType8];
      nazev.dematerialize = false;
      nazev.humanDescription = {["cs"]: "Ulice bydliště", ["en"]: "Street of the address"};
      nazev.humanLabel = {["cs"]: "ulice", ["en"]: "Street"};
      nazev.isReverse = false;
      nazev.pimIri = "https://example.com/mojePimIriUlice";
      nazev.psmIri = "https://example.com/mojePsmIriUlice";
      nazev.technicalLabel = "ulice-popisek";

      var datumVzniku : StructureModelProperty;
      datumVzniku = new StructureModelProperty();
      datumVzniku.cardinalityMin = 1;
      datumVzniku.cimIri = "https://slovník.gov.cz/legislativní/sbírka/111/2009/pojem/datum-vzniku-území-městského-obvodu-v-hlavním-městě-praze";
      datumVzniku.dataTypes = [primitiveType8];
      datumVzniku.dematerialize = false;
      datumVzniku.humanDescription = {["cs"]: "Číslo popisné dané budovy"};
      datumVzniku.humanLabel = {["cs"]: "Číslo popisné"};
      datumVzniku.isReverse = false;
      datumVzniku.pimIri = "https://example.com/mojePimIriCisloPopisne";
      datumVzniku.psmIri = "https://example.com/mojePsmIriCisloPopisne";
      datumVzniku.technicalLabel = "cislo-popisne-popisek";

      var city : StructureModelProperty;
      city = new StructureModelProperty();
      city.cardinalityMax = 1;
      city.cardinalityMin = 1;
      city.cimIri = "https://example.com/Mesto";
      city.dataTypes = [primitiveType8];
      city.dematerialize = false;
      city.humanDescription = {["cs"]: "Město, ve kterém se nachází budova"};
      city.humanLabel = {["cs"]: "Město"};
      city.isReverse = false;
      city.pimIri = "https://example.com/mojePimIriMesto";
      city.psmIri = "https://example.com/mojePsmIriMesto";
      city.technicalLabel = "mesto-popisek";

      var zipcode : StructureModelProperty;
      zipcode = new StructureModelProperty();
      zipcode.cardinalityMax = 1;
      zipcode.cardinalityMin = 1;
      zipcode.cimIri = "https://example.com/PSC";
      zipcode.dataTypes = [zipType];
      zipcode.dematerialize = false;
      zipcode.humanDescription = {["cs"]: "Poštovní směrovací číslo"};
      zipcode.humanLabel = {["cs"]: "PSČ"};
      zipcode.isReverse = false;
      zipcode.pimIri = "https://example.com/mojePimIriPSC";
      zipcode.psmIri = "https://example.com/mojePsmIriPSC";
      zipcode.technicalLabel = "psc-popisek";

      var country : StructureModelProperty;
      country = new StructureModelProperty();
      country.cardinalityMax = 1;
      country.cardinalityMin = 1;
      country.cimIri = "https://example.com/Stat";
      country.dataTypes = [primitiveType8];
      country.dematerialize = false;
      country.humanDescription = {["cs"]: "Stát - země, ve které se objekt nachází"};
      country.humanLabel = {["cs"]: "Stát"};
      country.isReverse = false;
      country.pimIri = "https://example.com/mojePimIriStat";
      country.psmIri = "https://example.com/mojePsmIriStat";
      country.technicalLabel = "stat-popisek";

      var class2 : StructureModelClass;
      class2 = new StructureModelClass();
      class2.cimIri = "https://slovník.gov.cz/legislativní/sbírka/111/2009/pojem/prvek-obsažený-v-rúian";
      class2.codelistUrl = ["https://example.com/class1/codelistIri"];
      class2.example = null;
      class2.humanDescription = {["cs"]: "Popis prvku obsaženého v rúian"};
      class2.humanLabel = {["cs"]: "Prvek obsažený v rúian", ["pl"]: "Część"};
      class2.pimIri = "https://example.com/class1/mojePimIriadresa";
      class2.properties = [];
      class2.psmIri = "https://example.com/class1/mojePsmIriadresa";
      class2.regex = null;
      class2.specification = null;
      class2.structureSchema = null;
      class2.technicalLabel = "prvek-obsazeny-v-ruian";
      class2.instancesSpecifyTypes = "OPTIONAL";

      var classLink : StructureModelClass;
      classLink = new StructureModelClass();
      classLink.cimIri = "https://slovník.gov.cz/legislativní/sbírka/111/2009/pojem/území-městského-obvodu-v-hlavním-městě-praze";
      classLink.codelistUrl = ["https://example.com/class1/codelistIri"];
      classLink.example = null;
      classLink.humanDescription = {["cs"]: "Popis území městského obvodu"};
      classLink.humanLabel = {["cs"]: "Území městského obvodu"};
      classLink.pimIri = "https://example.com/class1/mojePimIriadresa";
      classLink.properties = [nazev, datumVzniku];
      classLink.psmIri = "https://example.com/class1/mojePsmIriadresa";
      classLink.regex = null;
      classLink.specification = null;
      classLink.structureSchema = null;
      classLink.technicalLabel = "uzemi-mestskeho-obvodu";
      classLink.instancesSpecifyTypes = "NEVER"

      var complexType1 : StructureModelComplexType;
      complexType1 = new StructureModelComplexType();
      complexType1.dataType = class2;

      var complexType2 : StructureModelComplexType;
      complexType2 = new StructureModelComplexType();
      complexType2.dataType = classLink;

      var property1 : StructureModelProperty;
      property1 = new StructureModelProperty();
      property1.cardinalityMin = 1;
      property1.cimIri = "https://slovník.gov.cz/generický/adresy/pojem/prvek-rúian";
      property1.dataTypes = [complexType1];
      property1.dematerialize = false;
      property1.humanDescription = {["cs"]: "Popis prvku rúian"};
      property1.humanLabel = {["cs"]: "Prvek rúian"};
      property1.isReverse = false;
      property1.pimIri = "https://example.com/mojePimIriadresa";
      property1.psmIri = "https://example.com/mojePsmIriadresa";
      property1.technicalLabel = "prvek-ruian";

      var propertyLink : StructureModelProperty;
      propertyLink = new StructureModelProperty();
      propertyLink.cardinalityMin = 1;
      propertyLink.cimIri = "https://slovník.gov.cz/legislativní/sbírka/111/2009/pojem/má-přiřazené-území-městského-obvodu-v-hlavním-městě-praze";
      propertyLink.dataTypes = [complexType2];
      propertyLink.dematerialize = false;
      propertyLink.humanDescription = {["cs"]: "Link na entitu má přiřazené území"};
      propertyLink.humanLabel = {["cs"]: "Má přiřazené území"};
      propertyLink.isReverse = false;
      propertyLink.pimIri = "https://example.com/mojePimIriadresa";
      propertyLink.psmIri = "https://example.com/mojePsmIriadresa";
      propertyLink.technicalLabel = "ma-prirazene-uzemi";

      var class1 : StructureModelClass;
      class1 = new StructureModelClass();
      class1.cimIri = "https://slovník.gov.cz/legislativní/sbírka/111/2009/pojem/adresa";
      class1.codelistUrl = ["https://example.com/class1/codelistIri"];
      class1.example = null;
      //class1.extends = null;
      class1.humanDescription = {["cs"]: "Adresa popisek"};
      class1.humanLabel = {["cs"]: "Adresa"};
      class1.pimIri = "https://example.com/class1/mojePimIri";
      class1.properties = [property1, propertyLink];
      class1.psmIri = "https://example.com/class1/mojePsmIri";
      class1.regex = null;
      class1.specification = null;
      class1.structureSchema = null;
      class1.technicalLabel = "adresa";
      class1.instancesSpecifyTypes = "ALWAYS";

      var root1 : StructureModelSchemaRoot;
      root1 = new StructureModelSchemaRoot();
      root1.classes = [class1];

      model.roots = [root1];
      model.psmIri = "https://example.com/class1/mojePsmIri";


    return model;
  }
}

export default SimpleObjectModelCreator;