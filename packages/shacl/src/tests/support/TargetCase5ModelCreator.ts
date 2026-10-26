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

class TargetCase5ModelCreator implements ModelCreator{

createModel(): StructureModel{
  var model = new StructureModel();

    var primitiveType8 : StructureModelPrimitiveType;
    primitiveType8 = new StructureModelPrimitiveType();
    primitiveType8.dataType = "http://www.w3.org/2001/XMLSchema#string";
    primitiveType8.example = null;
    primitiveType8.regex = null;

    var nazev : StructureModelProperty;
    nazev = new StructureModelProperty();
    nazev.cardinalityMin = 1;
    nazev.cimIri = "https://slovník.gov.cz/generický/adresy/pojem/prvek-rúian";
    nazev.dataTypes = [primitiveType8];
    nazev.dematerialize = false;
    nazev.humanDescription = {["cs"]: "Prvek ruián úredikát z druhé úrovně", ["en"]: "Street of the address"};
    nazev.humanLabel = {["cs"]: "Prvek ruián predikát z druhé úrovně", ["en"]: "Street"};
    nazev.isReverse = false;
    nazev.pimIri = "https://example.com/mojePimIriUlice";
    nazev.psmIri = "https://example.com/mojePsmIriUlice";
    nazev.technicalLabel = "ulice-popisek";

    var datumVzniku : StructureModelProperty;
    datumVzniku = new StructureModelProperty();
    datumVzniku.cardinalityMin = 1;
    datumVzniku.cimIri = "https://slovník.gov.cz/legislativní/sbírka/111/2009/pojem/má-přiřazené-území-městského-obvodu-v-hlavním-městě-praze";
    datumVzniku.dataTypes = [primitiveType8];
    datumVzniku.dematerialize = false;
    datumVzniku.humanDescription = {["cs"]: "má-přiřazené-území-městského-obvodu predikát z druhé úrovně"};
    datumVzniku.humanLabel = {["cs"]: "má-přiřazené-území-městského-obvodu predikát z druhé úrovně"};
    datumVzniku.isReverse = false;
    datumVzniku.pimIri = "https://example.com/mojePimIriCisloPopisne";
    datumVzniku.psmIri = "https://example.com/mojePsmIriCisloPopisne";
    datumVzniku.technicalLabel = "cislo-popisne-popisek";

    var class2 : StructureModelClass;
    class2 = new StructureModelClass();
    class2.cimIri = "https://slovník.gov.cz/legislativní/sbírka/111/2009/pojem/adresa";
    class2.codelistUrl = ["https://example.com/class1/codelistIri"];
    class2.example = null;
    class2.humanDescription = {["cs"]: "Popis prvku obsaženého v rúian druhá úroveň"};
    class2.humanLabel = {["cs"]: "Prvek obsažený v rúian druhá úroveň", ["pl"]: "Część"};
    class2.pimIri = "https://example.com/class1/mojePimIriadresa";
    class2.properties = [];
    class2.psmIri = "https://example.com/class1/mojePsmIriadresa";
    class2.regex = null;
    class2.specification = null;
    class2.structureSchema = null;
    class2.technicalLabel = "prvek-obsazeny-v-ruian";
    class2.instancesSpecifyTypes = "OPTIONAL";

    var uzemiMO : StructureModelClass;
    uzemiMO = new StructureModelClass();
    uzemiMO.cimIri = "https://slovník.gov.cz/legislativní/sbírka/111/2009/pojem/území-městského-obvodu-v-hlavním-městě-praze";
    uzemiMO.codelistUrl = ["https://example.com/class1/codelistIri"];
    uzemiMO.example = null;
    uzemiMO.humanDescription = {["cs"]: "Popis prvku obsaženého v rúian třetí úroveň"};
    uzemiMO.humanLabel = {["cs"]: "Prvek obsažený v rúian třetí úroveň", ["pl"]: "Część"};
    uzemiMO.pimIri = "https://example.com/class1/mojePimIriadresa";
    uzemiMO.properties = [];
    uzemiMO.psmIri = "https://example.com/class1/mojePsmIriadresa";
    uzemiMO.regex = null;
    uzemiMO.specification = null;
    uzemiMO.structureSchema = null;
    uzemiMO.technicalLabel = "uzemi-mo";
    uzemiMO.instancesSpecifyTypes = "OPTIONAL";

    var complexType3 : StructureModelComplexType;
    complexType3 = new StructureModelComplexType();
    complexType3.dataType = uzemiMO;

    var dalsiUzemiMestskehoObvodu : StructureModelProperty;
    dalsiUzemiMestskehoObvodu = new StructureModelProperty();
    dalsiUzemiMestskehoObvodu.cardinalityMin = 1;
    dalsiUzemiMestskehoObvodu.cimIri = "https://slovník.gov.cz/generický/adresy/pojem/prvek-rúian";
    dalsiUzemiMestskehoObvodu.dataTypes = [complexType3];
    dalsiUzemiMestskehoObvodu.dematerialize = false;
    dalsiUzemiMestskehoObvodu.humanDescription = {["cs"]: "Popis unikatni predikat predikát z druhé úrovně"};
    dalsiUzemiMestskehoObvodu.humanLabel = {["cs"]: "Prvek unikatni predikát z druhé úrovně"};
    dalsiUzemiMestskehoObvodu.isReverse = false;
    dalsiUzemiMestskehoObvodu.pimIri = "https://example.com/mojePimIriadresa";
    dalsiUzemiMestskehoObvodu.psmIri = "https://example.com/mojePsmIriadresa";
    dalsiUzemiMestskehoObvodu.technicalLabel = "unikatni-predikat";

    var classLink : StructureModelClass;
    classLink = new StructureModelClass();
    classLink.cimIri = "https://slovník.gov.cz/legislativní/sbírka/111/2009/pojem/území-městského-obvodu-v-hlavním-městě-praze";
    classLink.codelistUrl = ["https://example.com/class1/codelistIri"];
    classLink.example = null;
    classLink.humanDescription = {["cs"]: "Popis území městského obvodu popis druhá úroveň"};
    classLink.humanLabel = {["cs"]: "Území městského obvodu jméno druhá úroveň"};
    classLink.pimIri = "https://example.com/class1/mojePimIriadresa";
    classLink.properties = [nazev, datumVzniku, dalsiUzemiMestskehoObvodu];
    classLink.psmIri = "https://example.com/class1/mojePsmIriadresa";
    classLink.regex = null;
    classLink.specification = null;
    classLink.structureSchema = null;
    classLink.technicalLabel = "uzemi-mestskeho-obvodu";
    classLink.instancesSpecifyTypes = "ALWAYS";



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
    property1.humanDescription = {["cs"]: "Popis prvku rúian predikát z první úrovně"};
    property1.humanLabel = {["cs"]: "Prvek rúian predikát z první úrovně"};
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
    propertyLink.humanDescription = {["cs"]: "Link na entitu má přiřazené území predikát z první úrovně"};
    propertyLink.humanLabel = {["cs"]: "Má přiřazené území predikát z první úrovně"};
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
    class1.humanDescription = {["cs"]: "Adresa popisek první úroveň"};
    class1.humanLabel = {["cs"]: "Adresa jméno první úroveň"};
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

export default TargetCase5ModelCreator;