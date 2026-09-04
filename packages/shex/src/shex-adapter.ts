import {
  StructureModel,
  StructureModelClass,
  StructureModelComplexType,
  StructureModelProperty,
  StructureModelPrimitiveType,
} from "@dataspecer/generators/structure-model/model";
import { ArtefactGeneratorContext } from "@dataspecer/generators/generator";
import { DataSpecificationArtefact} from "@dataspecer/core/data-specification/model";
import {isUniqueClass, fixTurtleFileWithBaseShex, hasUniquePredicates, anyPredicateHasUniqueType, anyPredicateHasUniquePredicates,
  getAnyPredicateUniquePredicate, getAnyPredicateUniqueType} from "./shex-support.ts";
import { OFN } from "@dataspecer/core/well-known";
import * as Support from "./shex-support.ts";
import { LanguageString } from "@dataspecer/core/core";
import md5 from "md5";

// Tuple type
type QName = [prefix: string | null, localName: string];
type classNameShapeTuple = [classShapeName: string, classObject: StructureModelClass];
type StructureModelClassOrProperty = StructureModelClass | StructureModelProperty;

export class ShexAdapter {

  protected model: StructureModel;
  protected context: ArtefactGeneratorContext;
  protected artefact: DataSpecificationArtefact;
  protected shapes: string[] = []; // Entity beginning with name of the shape and ending with .
  protected sameClass: classNameShapeTuple[] = [];
  protected baseURL: string = "";
  protected uniquePredicateClass = null;
  protected uniquePredicatePredicate  = null;
  protected pathToUniquePredicate = null;
  protected root : StructureModelClass = null;
  protected rootName = null;
  protected rootShapeName = null;

  constructor(
    model: StructureModel,
    context: ArtefactGeneratorContext | null,
    artefact: DataSpecificationArtefact
  ) {
    this.model = model;
    this.context = context;
    this.artefact = artefact;

    this.baseURL = this.artefact.configuration["publicBaseUrl"];
  }

  /**
  * Function accessed from the frontend applications for generating the SHACL artifact.
  */
  public generate = async () => {

    if (this.model.roots.length > 1) {
      console.warn("ShEx generator: Multiple schema roots not supported yet.");
    }

    const rootClasses = this.model.roots[0].classes;
    // Iterate over all classes in root OR
    for (const root of rootClasses) {
      this.rootShapeName = this.getIRIforShape(root);
      this.root = root;
      this.decideHowToTarget(root, root.cimIri);

      this.generateClassConstraints(root);
    }

    var resultString = "";

    for(const part of this.shapes){
      resultString = resultString + part;
    }

    var recordOfDataAndPrefixes = Support.prefixifyFinalOutput(resultString);

    resultString = (await Support.prependPrefixes(recordOfDataAndPrefixes)).toString();
    if(this.baseURL != undefined && this.baseURL != null && this.baseURL != ""){
      resultString = (await fixTurtleFileWithBaseShex(resultString, this.baseURL)).toString();
    }
    return { data: resultString };
  };

    /**
   * Generate class constraints and nodes needed for this description for a StructureModelClass.
   * @param root The class that the constraints are built for.
   * @returns IRI name for the Shape for the supllied class.
   */
  generateClassConstraints(root: StructureModelClass): string {
    var newResult = "";
    var nodeName : string;

    nodeName = this.getIRIforShape(root);
    const classNameIri = nodeName;
    if(this.sameClass.find(tuple => tuple[0] === nodeName) == null){
      // The class has not been Shaped yet -- to get rid of duplicate shape
      newResult = newResult.concat("<" + nodeName + ">");
      newResult = newResult.concat(this.prePropertyStatements(root));
      newResult = newResult.concat("{\n" + this.generateShape(root));
      newResult = newResult.concat(this.generatePropertiesConstraints(root, classNameIri));
      newResult = newResult.concat("\n}\n");

      this.shapes.push(newResult);
      this.sameClass.push([nodeName, root]);
    }
    return nodeName;
  }

  /**
   * Generates the constraints on node type and regex patterns for the Shape Node
   * @param root The class that will have the constraints generated for.
   * @returns String describing the header for the shape of node kind and pattern.
   */
  prePropertyStatements(root: StructureModelClass): string {
    var newResult = "";

    switch(root.instancesHaveIdentity){
      case "ALWAYS": newResult = newResult.concat(" IRI");
      break;
      case "NEVER": newResult = newResult.concat(" BNode");
      break;
      case "OPTIONAL": newResult = newResult.concat(" NonLiteral");
      break;
      default: newResult = newResult.concat(" NonLiteral");
    }
    if(root.regex != null && root.regex != undefined && root.regex != ""){
      newResult = newResult.concat(" /" + root.regex + "/");
    }
    if(root.isClosed){
      newResult = newResult.concat(" CLOSED");
    }
    return newResult;
  }

  /**
   * Generates the constraints for the class type.
   * @param root The class that will have the constrainst generated.
   * @returns Part of shape that describes the class type of the shape.
   */
  generateShape(root: StructureModelClass): string {
    var newResult = "";

    switch(root.instancesSpecifyTypes){
      case "ALWAYS":  newResult = newResult.concat("\ta [<" + root.cimIri + ">]" );
        break;
      case "OPTIONAL":  newResult = newResult.concat("\ta [<" + root.cimIri + ">] ?" );
      break;
      case "NEVER": {newResult = newResult.concat("\ta . {0}" );}
      break;
        default: newResult = newResult.concat("\ta [<" + root.cimIri + ">]" );
    }

    return newResult;
  }

    /**
   * Generate the constraints for the attributes of the class supllied in the parameters.
   * @param root The class to generate constraints on properties for.
   * @param classNameIri The IRI for the shape to attach those properties constraints to.
   * @returns Part of resulting ShExC string.
   */
  generatePropertiesConstraints(root: StructureModelClass, classNameIri: string): string {
    var newResult = "";
    if (root.properties != null && root.properties.length != 0) {
      for (const [i, prop] of root.properties.entries()) {

        const cardinalitymin = prop.cardinalityMin;
        const cardinalitymax = prop.cardinalityMax;
        const cimiri = prop.cimIri;
        const datatypes = prop.dataTypes;
        const isReverse = prop.isReverse;

        for (var dt of datatypes) {


          newResult = newResult.concat(" ;");
          newResult = newResult.concat("\n");

          newResult = newResult.concat("\t");
          if(isReverse){
            newResult = newResult.concat("\u005E");
          }

          newResult = newResult.concat("<" + cimiri + ">");


          if(dt.isAttribute() == true){
            // If the datatype is set, try to match it to xsd datatypes. If unable, use its IRI.
            const dtcasted = <StructureModelPrimitiveType> dt;
            if(dtcasted != null){
              const datatypeFromMap = simpleTypeMapQName[dtcasted.dataType];

              if(datatypeFromMap != undefined){
                  newResult = newResult.concat(" <" + simpleTypeMapIRI[dtcasted.dataType] + ">");
                if((simpleTypeMapIRI[dtcasted.dataType] == "http://www.w3.org/2001/XMLSchema#anyURI") || (simpleTypeMapIRI[dtcasted.dataType] == "http://www.w3.org/2001/XMLSchema#string")){
                  if(dtcasted.regex != null && dtcasted.regex != undefined && dtcasted.regex != ""){
                    newResult = newResult.concat(" /" + dtcasted.regex.toString() + "/" );
                  }
                }
              } else{
                if(dtcasted.dataType != null){
                  newResult = newResult.concat(" <" + dtcasted.dataType + ">" );
                } else{
                  // Arbitrary datatype, datatype is not enforced by user
                  newResult = newResult.concat(" ." );
                }
              }

            }
          } else{
            for (var dt of datatypes) {
              // create new Shape and tie this property to it
              const dtcasted = <StructureModelComplexType> dt;

              if(dtcasted.dataType == this.uniquePredicateClass){
                this.pathToUniquePredicate = cimiri;
              } else if(this.uniquePredicatePredicate != null && (dtcasted.dataType == this.uniquePredicatePredicate.uniquepropclass)){
                this.pathToUniquePredicate = cimiri;
              }
              if(dtcasted.dataType.properties == null || dtcasted.dataType.properties.length == 0){
                // create inner constraint just for the nodeType and Type
                newResult = newResult.concat(this.createInnerShortConstraint(dtcasted.dataType));

              } else{

              // Add datatype for the PopertyNode
              const nameForAnotherClass = this.generateClassConstraints(dtcasted.dataType);
              newResult = newResult.concat(" @<" + nameForAnotherClass + ">");

              }

            }
          }

          if((cardinalitymin == 0) && (cardinalitymax == 1)){
            newResult = newResult.concat(" ?");
          }
          else if((cardinalitymin == 0 || cardinalitymin == null) && (cardinalitymax == null)){
            newResult = newResult.concat(" *");
          }
          else if((cardinalitymin == 1) && (cardinalitymax == null)){
            newResult = newResult.concat(" +");
          }
          else if((cardinalitymin == cardinalitymax) && (cardinalitymax != 0 && cardinalitymax != 1)){
            newResult = newResult.concat(" " + cardinalitymax);
          }
          else if((cardinalitymin != cardinalitymax) && (cardinalitymax != null)){
            newResult = newResult.concat(" {" + cardinalitymin + "," + cardinalitymax + "}");
          }
          else if((cardinalitymin != 0 && cardinalitymin != 1) && (cardinalitymax == null)) {
            newResult = newResult.concat(" {" + cardinalitymin + ",}");
          }

          newResult = newResult.concat(this.generateLanguageString(prop.humanLabel, "label"));
          newResult = newResult.concat(this.generateLanguageString(prop.humanDescription,"comment"));
        }
      }
    }

    // FOR TARGETTING in lower levels
    if(root == this.uniquePredicateClass || (this.uniquePredicatePredicate != null && (root == this.uniquePredicatePredicate.uniquepropclass))){
      newResult = newResult.concat(";\n\t\u005E<" + this.pathToUniquePredicate + ">" + " @<" + this.rootShapeName + ">");
    }

    return newResult;
  }

  /**
   * Returns a short string describing the node kind of the supplied class.
   * @param cls The association that we need node kind description for.
   * @returns String describing the node type of the association.
   */
  createInnerShortConstraint(cls : StructureModelClass): string{
    var newResult = "";

    switch(cls.instancesHaveIdentity){
      case "ALWAYS": newResult = newResult.concat(" IRI");
      break;
      case "NEVER": newResult = newResult.concat(" BNode");
      break;
      case "OPTIONAL": newResult = newResult.concat(" NonLiteral");
      break;
      default: newResult = newResult.concat(" IRI");
    }

    // Code not used as of now the Dataspecer empty asscoiation is taken as a predicate followed by an IRI and no other constraints are demanded from it. Uncomment this section if the empty association should be at least of the correct type.
    /*
    switch(cls.instancesSpecifyTypes){
      case "ALWAYS": newResult = newResult.concat(" { a [<" + cls.cimIri + ">] }");
      break;
      case "OPTIONAL": newResult = newResult.concat(" { a [<" + cls.cimIri + ">] ? }");
      break;
      case "NEVER": newResult = newResult.concat(" .");
        break;
        default: newResult = newResult.concat(" { a [<" + cls.cimIri + ">] }");
    }
    */
    return newResult;
  }

  /**
   * Goes through the supplied language string and allignes properly the tags with the values for the wanted label/description graph nodes.
   * @param languageDescription Language string to be deconstructed.
   * @param attribute Attribute to which append the language values and tags. Either name or description.
   */
generateLanguageString(languageDescription: LanguageString, attribute: string): string {
  var newResult = "";
  const predicate = "http://www.w3.org/2000/01/rdf-schema#" + attribute;
      for (const languageTag in languageDescription) {
        const language = languageDescription[languageTag];
        if(languageDescription != null){
          newResult = newResult.concat("\n\t\t// <" + predicate + ">\t\"" + language + "\"");
          break;
        }
      }
    return newResult;
  }

  /**
   * Takes Technical name of an entity and deletes all blank characters that do not belong to an IRI.
   * @param root The class or Property to edit the technical label for.
   * @returns Technical name of the supplied entity strapped of blank characters.
   */
  protected irify(root: StructureModelClassOrProperty) : string{
    var irifiedString : string;
    if(root.technicalLabel != null){
      irifiedString = root.technicalLabel.replaceAll(/\s/g,"");
    } else{
      irifiedString = "";
    }
    return irifiedString;
  }

    /**
   * Generate an IRI for the shape of supplied class.
   * @param root Class or Property to generate the Shape name for
   * @returns IRI of a SHACL Shape
   */
  protected getIRIforShape(root: StructureModelClassOrProperty): string{
    var generatedIRI : string;
    var md5String = md5(root.psmIri);
    const technicalName = this.irify(root);
    const nodeOrProperty = "ShExShape";
    generatedIRI =  md5String + technicalName + nodeOrProperty ;
    return generatedIRI;
  }

  /**
 * Decides how the Shape is going to target the data that need to be supplied for SHACL validator.
 * @param cls Class object of the root class of the data structure.
 * @param classNameIri IRI for the shape of the root class.
 */
  protected decideHowToTarget(cls : StructureModelClass, classNameIri : string): void {
    if((cls.instancesSpecifyTypes == "ALWAYS" && (isUniqueClass(cls))) || hasUniquePredicates(cls)){
      // USE CASE #1 & #2 nothing needs to be done
    }  else if(anyPredicateHasUniqueType(cls, this.root.cimIri)){
      // USE CASE #3
      this.uniquePredicateClass = getAnyPredicateUniqueType(cls, this.root.cimIri);
    } else if(anyPredicateHasUniquePredicates(cls)){
      // USE CASE #4
      this.uniquePredicatePredicate = getAnyPredicateUniquePredicate(cls);
    } else{
      // CANNOT TARGET THE SHAPE, fail to generate the artifact
      throw new Error('Unable to create ShEx shape due to possible SHACL incompatibility. Either define at least one unique type of class with instance typing mandatory or define at least one unique attribute going from the root or its associations with cardinality bigger than 0.');
    }
  }
}

// Types for specification in sh:datatype
const simpleTypeMapQName: Record<string, QName> = {
  [OFN.boolean]: ["xsd", "boolean"],
  [OFN.date]: ["xsd", "date"],
  [OFN.time]: ["xsd", "time"],
  [OFN.dateTime]: ["xsd", "dateTimeStamp"],
  [OFN.integer]: ["xsd", "integer"],
  [OFN.decimal]: ["xsd", "decimal"],
  [OFN.url]: ["xsd", "anyURI"],
  [OFN.string]: ["xsd", "string"],
  [OFN.text]: ["rdf", "langString"],
};

// Types for specification in sh:datatype
const simpleTypeMapIRI: Record<string, string> = {
  [OFN.boolean]: "http://www.w3.org/2001/XMLSchema#boolean",
  [OFN.date]: "http://www.w3.org/2001/XMLSchema#date",
  [OFN.time]: "http://www.w3.org/2001/XMLSchema#time",
  [OFN.dateTime]: "http://www.w3.org/2001/XMLSchema#dateTimeStamp",
  [OFN.integer]: "http://www.w3.org/2001/XMLSchema#integer",
  [OFN.decimal]: "http://www.w3.org/2001/XMLSchema#decimal",
  [OFN.url]: "http://www.w3.org/2001/XMLSchema#anyURI",
  [OFN.string]: "http://www.w3.org/2001/XMLSchema#string",
  [OFN.text]: "http://www.w3.org/1999/02/22-rdf-syntax-ns#langString",
};