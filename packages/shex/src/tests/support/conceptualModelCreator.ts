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

    var zipType : ConceptualModelPrimitiveType;
    zipType = new ConceptualModelPrimitiveType();
    zipType.dataType = "http://www.w3.org/2001/XMLSchema#integer";
    zipType.example = null;
    zipType.regex = "^\d{3}(?:[-\s]\d{2}){1}$";

    var primitiveType1 : ConceptualModelPrimitiveType;
    primitiveType1 = new ConceptualModelPrimitiveType();
    primitiveType1.dataType = "http://www.w3.org/2001/XMLSchema#integer";
    primitiveType1.example = null;
    primitiveType1.regex = null;

    var primitiveType8 : ConceptualModelPrimitiveType;
    primitiveType8 = new ConceptualModelPrimitiveType();
    primitiveType8.dataType = "http://www.w3.org/2001/XMLSchema#string";
    primitiveType8.example = null;
    primitiveType8.regex = null;

    var street : ConceptualModelProperty;
    street = new ConceptualModelProperty();
    street.cardinalityMax = 1;
    street.cimIri = "https://example.com/Ulice";
    street.dataTypes = [primitiveType8];
    street.humanDescription = {["cs"]: "Ulice bydliště"};
    street.humanLabel = {["cs"]: "ulice"};
    street.isReverse = false;
    street.pimIri = "https://example.com/mojePimIriUlice";

    var bn : ConceptualModelProperty;
    bn = new ConceptualModelProperty();
    bn.cardinalityMax = 1;
    bn.cardinalityMin = 1;
    bn.cimIri = "https://example.com/CisloPopisne";
    bn.dataTypes = [primitiveType1];
    bn.humanDescription = {["cs"]: "Číslo popisné dané budovy"};
    bn.humanLabel = {["cs"]: "Číslo popisné"};
    bn.isReverse = false;
    bn.pimIri = "https://example.com/mojePimIriCisloPopisne";

    var city : ConceptualModelProperty;
    city = new ConceptualModelProperty();
    city.cardinalityMax = 1;
    city.cardinalityMin = 1;
    city.cimIri = "https://example.com/Mesto";
    city.dataTypes = [primitiveType8];
    city.humanDescription = {["cs"]: "Město, ve kterém se nachází budova"};
    city.humanLabel = {["cs"]: "Město"};
    city.isReverse = false;
    city.pimIri = "https://example.com/mojePimIriMesto";

    var zipcode : ConceptualModelProperty;
    zipcode = new ConceptualModelProperty();
    zipcode.cardinalityMax = 1;
    zipcode.cardinalityMin = 1;
    zipcode.cimIri = "https://example.com/PSC";
    zipcode.dataTypes = [zipType];
    zipcode.humanDescription = {["cs"]: "Poštovní směrovací číslo"};
    zipcode.humanLabel = {["cs"]: "PSČ"};
    zipcode.isReverse = false;
    zipcode.pimIri = "https://example.com/mojePimIriPSC";

    var country : ConceptualModelProperty;
    country = new ConceptualModelProperty();
    country.cardinalityMax = 1;
    country.cardinalityMin = 1;
    country.cimIri = "https://example.com/Stat";
    country.dataTypes = [primitiveType8];
    country.humanDescription = {["cs"]: "Stát - země, ve které se objekt nachází"};
    country.humanLabel = {["cs"]: "Stát"};
    country.isReverse = false;
    country.pimIri = "https://example.com/mojePimIriStat";

    var class2 : ConceptualModelClass;
    class2 = new ConceptualModelClass();
    class2.cimIri = "https://example.com/class2/adresa";
    class2.codelistUrl = ["https://example.com/class1/codelistIri"];
    class2.example = null;
    class2.humanDescription = {["cs"]: "Adresa bydliště dané osoby"};
    class2.humanLabel = {["cs"]: "Adresa", ["pl"]: "Adres"};
    class2.pimIri = "https://example.com/class1/mojePimIriadresa";
    class2.properties = [street, bn, city, zipcode, country];
    class2.regex = null;

    var complexType1 : ConceptualModelComplexType;
    complexType1 = new ConceptualModelComplexType();
    complexType1.pimClassIri = "https://example.com/class1/mojePimIriadresa";

    var property1 : ConceptualModelProperty;
    property1 = new ConceptualModelProperty();
    property1.cardinalityMax = 1;
    property1.cardinalityMin = 1;
    property1.cimIri = "https://example.com/Adresa";
    property1.dataTypes = [complexType1];
    property1.humanDescription = {["cs"]: "Adresa bydliště dané osoby"};
    property1.humanLabel = {["cs"]: "Adresa"};
    property1.isReverse = false;
    property1.pimIri = "https://example.com/mojePimIriadresa";

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

      model.classes = {"https://example.com/class1/mojePimIri": class1, "https://example.com/class1/mojePimIriadresa": class2};

    return model;
  }
}

export default ConceptualModelCreator;