import {
  StructureModel,
  StructureModelClass,
  StructureModelType,
  StructureModelComplexType,
  StructureModelProperty,
  StructureModelPrimitiveType
} from "@dataspecer/core/structure-model/model";
import { ArtefactGeneratorContext } from "@dataspecer/core/generator";
import {
  DataSpecificationArtefact
} from "@dataspecer/core/data-specification/model";
import {fixPrefixPosition, fixTurtleFileWithBase, isUniqueClass, hasUniquePredicates, getUniquePredicate, anyPredicateHasUniqueType, anyPredicateHasUniquePredicates,
  getAnyPredicateUniquePredicate, getAnyPredicateUniqueType} from "./shacl-support.ts";
import { OFN } from "@dataspecer/core/well-known";
import * as N3 from "n3";
import { LanguageString } from "@dataspecer/core/core";
import md5 from "md5";

// SHACL version REC-shacl-20170720 - doesn't have official version with major.minor.bugfix
/*
Implementation notes
-----
According to the list of validatable properties for SHACL:
NodeShape - generated

Shapes and Constraints
        2.1.2 Focus Nodes - focus nodes are generated as the root classes of the structure
        2.1.3 Targets
            2.1.3.1 Node targets (sh:targetNode) - not used, only for single subject focusing, not for this kind of general data validation
            2.1.3.2 Class-based Targets (sh:targetClass) - base implemented. TODO: need to incorporate prefix generation and iri shortening
            2.1.3.3 Implicit Class Targets - not used atm but COULD be used instead of sh:targetClass
            2.1.3.4 Subjects-of targets (sh:targetSubjectsOf) - not used atm: we know what the subject exactly is and we want to work with that
            2.1.3.5 Objects-of targets (sh:targetObjectsOf) - not used atm: we know what the subject is and we dont need relative finding
        2.1.4 Declaring the Severity of a Shape - all shapes are BY DEFAULT sh:Violation
        2.1.5 Declaring Messages for a Shape - no message generating atm
        2.1.6 Deactivating a Shape - all shapes implicitly ACTIVATED

PropertyShape - not generated separately atm, is included in NodeShape

Core Constraint Components

    4.1 Value Type Constraint Components
        4.1.1 sh:class - TODO The type of all value nodes. The values of sh:class in a shape are IRIs. Note that multiple values for sh:class are
        interpreted as a conjunction, i.e. the values need to be SHACL instances of all of them.
        4.1.2 sh:datatype DONE
        4.1.3 sh:nodeKind DONE
    4.2 Cardinality Constraint Components
        4.2.1 sh:minCount DONE
        4.2.2 sh:maxCount DONE
    4.3 Value Range Constraint Components -- TODO: Is this a thing in dataspecer?
        4.3.1 sh:minExclusive WILL NOT BE IMPLEMENTED
        4.3.2 sh:minInclusive WILL NOT BE IMPLEMENTED
        4.3.3 sh:maxExclusive WILL NOT BE IMPLEMENTED
        4.3.4 sh:maxInclusive WILL NOT BE IMPLEMENTED
    4.4 String-based Constraint Components -- TODO: Which of these are going to be a thing in dataspecer? I have seen only pattern
        4.4.1 sh:minLength WILL NOT BE IMPLEMENTED
        4.4.2 sh:maxLength WILL NOT BE IMPLEMENTED
        4.4.3 sh:pattern - DONE
        4.4.4 sh:languageIn WILL NOT BE IMPLEMENTED
        4.4.5 sh:uniqueLang WILL NOT BE IMPLEMENTED
    4.5 Property Pair Constraint Components -- TODO: Which of these are going to be a thing in dataspecer?
        4.5.1 sh:equals WILL NOT BE IMPLEMENTED
        4.5.2 sh:disjoint WILL NOT BE IMPLEMENTED
        4.5.3 sh:lessThan WILL NOT BE IMPLEMENTED
        4.5.4 sh:lessThanOrEquals WILL NOT BE IMPLEMENTED
    4.6 Logical Constraint Components -- TODO: Which of these are going to be a thing in dataspecer?
        4.6.1 sh:not
        4.6.2 sh:and
        4.6.3 sh:or
        4.6.4 sh:xone
    4.7 Shape-based Constraint Components -- TODO Think about if this is going to be used
        4.7.1 sh:node - This would be useful if there is possible to put nodes inside nodes in dataspecer - is possible DONE
        4.7.2 sh:property DONE
        4.7.3 sh:qualifiedValueShape, sh:qualifiedMinCount, sh:qualifiedMaxCount
    4.8 Other Constraint Components -- TODO: Which of these are going to be a thing in dataspecer?
        4.8.1 sh:closed, sh:ignoredProperties - DONE
        4.8.2 sh:hasValue - Is for checking specific values at the ends of paths = WILL NOT BE IMPLEMENTED
        4.8.3 sh:in - Is for checking specific values belonging to a list of options = WILL NOT BE IMPLEMENTED
DONE použít knihovnu na vytváření .ttl dokumentu.
TODO: typed/untyped instances in SHACL - can't rely on sh:targetClass, needs to use nested shapes.

TODO: zalamování sh:comments?
TODO: informace o celé datové struktuře - popis v rámci RDF tvrzení, které netvoří shape. - po diskuzi nebude implementováno.
TODO: dataspecer z nějakého důvodu modře přebarvuje kusy jmen, které jsou v namespace ofn - ofn:1643145411464-5579-b52f-9602 - myslí si, že je to matematický výraz. Tyto
názvy nebudu používat - místo toho vložit cim.

*/

// Tuple type
type QName = [prefix: string | null, localName: string];
type PrefixDef = [tag: string, iri: string];
type sameTag = [tag: string, number: number];
type classNameShapeTuple = [classShapeName: string, classObject: StructureModelClass];
type StructureModelClassOrProperty = StructureModelClass | StructureModelProperty;
const { DataFactory } = N3;
const { namedNode, literal, defaultGraph, triple } = DataFactory;

export class ShaclAdapter {
  protected model: StructureModel;
  protected context: ArtefactGeneratorContext;
  protected artefact: DataSpecificationArtefact;
  protected knownPrefixes: PrefixDef[] = []; // list of tags and corresponding IRIs
  protected shapes: string[] = []; // Entity beginning with name of the shape and ending with .
  protected debugString: string = "";
  protected sameTags: sameTag[] = [];
  protected sameClass: classNameShapeTuple[] = [];
  protected thisDataStructurePrefix : string = "";
  /**
   * Writer for N3 library for TURTLE output string format
   */
  protected writer = null;
  protected scriptString: string = "";
  protected prefixesString: string = "";
  protected insidesString: string = "";
  protected baseURL: string = "";
  protected uniquePredicateClass = null;
  protected uniquePredicatePredicate  = null;
  protected root : StructureModelClass = null;
  protected rootName = null;
  protected addedXSDPrefix = false;

  constructor(
    model: StructureModel,
    context: ArtefactGeneratorContext | null,
    artefact: DataSpecificationArtefact
  ) {
    this.model = model;
    this.context = context;
    this.artefact = artefact;
    this.baseURL = this.artefact.configuration["publicBaseUrl"];
    // UNCOMMENT WHEN N3.Writer handles baseIRI properly and delete the next line
    //this.writer  =  (this.baseURL != null) ? new N3.Writer({ prefixes: { sh: 'http://www.w3.org/ns/shacl#', rdfs: "http://www.w3.org/2000/01/rdf-schema#"}, baseIRI: this.baseURL  }) : new N3.Writer({ prefixes: { sh: 'http://www.w3.org/ns/shacl#', rdfs: "http://www.w3.org/2000/01/rdf-schema#"}});
      this.writer  =  new N3.Writer({ prefixes: { sh: 'http://www.w3.org/ns/shacl#', rdfs: "http://www.w3.org/2000/01/rdf-schema#"}});
  }

  /**
   * Function accessed from the frontend applications for generating the SHACL artifact.
   */
  public generate = async () => {

    if (this.model.roots.length > 1) {
      console.warn("SHACL generator: Multiple schema roots not supported yet.");
    }

    const rootClasses = this.model.roots[0].classes;
    // Iterate over all classes in root OR
    for (const root of rootClasses) {
      this.root = root;

      this.generateClassConstraints(root, null);
    }
    var resultString = "";

    this.writer.end((error, result) => resultString = result);

    // Add @base definition to the turtle output as N3 does not support that feature right now
    if(this.baseURL != null && this.baseURL != undefined && this.baseURL != ""){
      resultString = (await fixTurtleFileWithBase(resultString, this.baseURL)).toString();
    }
    // If xsd domain is needed due to used data structures, add it to the prefixes definitions
    if(this.addedXSDPrefix){
      resultString = (await fixPrefixPosition(resultString, "@prefix xsd: <http://www.w3.org/2001/XMLSchema#>.")).toString();
    }

    return { data: resultString };
  };

  /**
   * Generate class constraints and nodes needed for this description for a StructureModelClass.
   * @param root The class that the constraints are built for.
   * @param objectOf cimIRI of a class preceding this class in the data structure. Null if the class is a root class.
   * @returns IRI name for the Shape for the supllied class.
   */
  generateClassConstraints(root: StructureModelClass, objectOf : String): string{
    var nodeName : string;

    nodeName = this.getIRIforShape(root);
    this.rootName = (objectOf == null) ? nodeName : this.rootName;
    const classNameIri = nodeName;
    if(this.sameClass.find(tuple => tuple[0] === nodeName) == null){
      this.generateNodeShapeHead(root, classNameIri, objectOf);
      this.generatePropertiesConstraints(root, classNameIri);

      this.sameClass.push([nodeName, root]);
    }
    return nodeName;
  }

  /**
   * Generate structures of a shape associated to the class and naming.
   * @param root The class that the constraints are built for.
   * @param classNameIri Generated IRI for this shape.
   * @param objectOf cimIRI of preceding class in the data structure. Null if the class is a root class.
   */
  generateNodeShapeHead(root: StructureModelClass, classNameIri: string, objectOf : String) {
    this.writer.addQuad(
      namedNode( classNameIri),
      namedNode('http://www.w3.org/1999/02/22-rdf-syntax-ns#type'),
      namedNode('http://www.w3.org/ns/shacl#NodeShape')
    );
    // FOR TARGETTING in lower level
    if((this.uniquePredicateClass) && root == this.uniquePredicateClass){
      this.writer.addQuad(
        namedNode( classNameIri),
        namedNode('http://www.w3.org/ns/shacl#targetClass'),
        namedNode( root.cimIri)
      );
    }
    if((this.uniquePredicatePredicate) && root == this.uniquePredicatePredicate.uniquepropclass){
      this.writer.addQuad(
        namedNode( classNameIri),
        namedNode('http://www.w3.org/ns/shacl#targetSubjectsOf'),
        namedNode( this.uniquePredicatePredicate.predicate.cimIri)
      );
    }
    switch(root.instancesSpecifyTypes){
      case "ALWAYS": {
          if(objectOf == null){
            this.decideHowToTarget(root, classNameIri);
            this.writer.addQuad(
              namedNode( classNameIri ),
              namedNode('http://www.w3.org/ns/shacl#class'),
              namedNode( root.cimIri )
            );}
          else{
            this.writer.addQuad(
              namedNode( classNameIri ),
              namedNode('http://www.w3.org/ns/shacl#class'),
              namedNode( root.cimIri )
            );
          } }
        break;
      case "NEVER": { if(objectOf == null){this.decideHowToTarget(root, classNameIri);}
        this.writer.addQuad(
          namedNode(classNameIri),
          namedNode('http://www.w3.org/ns/shacl#not'),
          this.writer.blank([{
            predicate: namedNode('http://www.w3.org/1999/02/22-rdf-syntax-ns#type'),
            object:    namedNode('http://www.w3.org/ns/shacl#PropertyShape'),
          },{
            predicate: namedNode('http://www.w3.org/ns/shacl#path'),
            object:    namedNode('http://www.w3.org/1999/02/22-rdf-syntax-ns#type'),
          },{
            predicate: namedNode('http://www.w3.org/ns/shacl#minCount'),
            object:    literal(1),
          }])
      )}
      case "OPTIONAL": if(objectOf == null){this.decideHowToTarget(root, classNameIri);}
        default: {
        }
    }

    if(root.regex != null && root.regex != undefined && root.regex != ""){
      this.writer.addQuad(
        namedNode( classNameIri ),
        namedNode('http://www.w3.org/ns/shacl#pattern'),
        literal( root.regex )
      );
    }

    if(root.isClosed){
      const trueStatement = true;
      this.writer.addQuad(
          namedNode( classNameIri ),
          namedNode('http://www.w3.org/ns/shacl#closed'),
          // @ts-ignore, todo fix this, added type definitions for n3
          literal(trueStatement)
        );
        if(!(root.instancesSpecifyTypes == "NEVER")){
          this.writer.addQuad(
            namedNode( classNameIri ),
            namedNode('http://www.w3.org/ns/shacl#ignoredProperties'),
            this.writer.list([
              namedNode('http://www.w3.org/1999/02/22-rdf-syntax-ns#type'),
            ])
          );
        }
    }

    var nodeType = "";
    switch(root.instancesHaveIdentity){
      case "ALWAYS": {nodeType = 'http://www.w3.org/ns/shacl#IRI';}
      break;
      case "NEVER": {nodeType = 'http://www.w3.org/ns/shacl#BlankNode';}
      break;
      case "OPTIONAL": {nodeType = 'http://www.w3.org/ns/shacl#BlankNodeOrIRI';}
      break;
      default: {nodeType = 'http://www.w3.org/ns/shacl#BlankNodeOrIRI';}
    }
    this.writer.addQuad(
      namedNode( classNameIri ),
      namedNode('http://www.w3.org/ns/shacl#nodeKind'),
      namedNode( nodeType )
    );

    this.generateLanguageString(root.humanDescription,classNameIri, "description");
    this.generateLanguageString(root.humanLabel,classNameIri, "name");
  }

  /**
   * Goes through the supplied language string and allignes properly the tags with the values for the wanted label/description graph nodes.
   * @param languageDescription Language string to be deconstructed.
   * @param classNameIri Shape node to attach the results of this addition to.
   * @param attribute Attribute to which append the language values and tags. Either name or description.
   */
  generateLanguageString(languageDescription: LanguageString, classNameIri: string, attribute: string): void {
    const predicate = "http://www.w3.org/ns/shacl#" + attribute;
    if(classNameIri != null){
      for (const languageTag in languageDescription) {
        const language = languageDescription[languageTag];
        if(languageDescription != null){
          this.writer.addQuad(
            namedNode( classNameIri ),
            namedNode(predicate),
            literal(language , languageTag )
          );

        }
      }
    }
  }

  /**
   * Generate the constraints for the attributes of the class supllied in the parameters.
   * @param root The class to generate constraints on properties for.
   * @param classNameIri The IRI for the shape to attach those properties constraints to.
   */
  generatePropertiesConstraints(root: StructureModelClass, classNameIri: string) {
    if (root.properties != null && root.properties.length != 0) {
      for (const [i, prop] of root.properties.entries()) {

        const cardinalitymin = prop.cardinalityMin;
        const cardinalitymax = prop.cardinalityMax;
        const cimiri = prop.cimIri;
        const humanLabel = prop.humanLabel;
        const humandesc = prop.humanDescription;
        const isReverse = prop.isReverse;

        //Create PropertyNode to connect to
        const nodeIRI = this.getIRIforShape(prop);

        this.writer.addQuad(
          namedNode( nodeIRI ),
          namedNode('http://www.w3.org/1999/02/22-rdf-syntax-ns#type'),
          namedNode('http://www.w3.org/ns/shacl#PropertyShape')
        );

        this.generateLanguageString(humandesc, nodeIRI, "description");
        this.generateLanguageString(humanLabel, nodeIRI, "name");

          if(cardinalitymin != 0 && cardinalitymin != null){
            this.writer.addQuad(
              namedNode( nodeIRI ),
              namedNode('http://www.w3.org/ns/shacl#minCount'),
              literal(cardinalitymin)
            );
          }

          if(cardinalitymax != 0 && cardinalitymax != null) {
            this.writer.addQuad(
              namedNode( nodeIRI ),
              namedNode('http://www.w3.org/ns/shacl#maxCount'),
              literal(cardinalitymax)
            );
          }

          if(isReverse){
            this.writer.addQuad(
              namedNode( nodeIRI ),
              namedNode('http://www.w3.org/ns/shacl#path'),
              this.writer.blank([{
                predicate: namedNode('http://www.w3.org/ns/shacl#inversePath'),
                object:    namedNode( cimiri )}
              ])
            );
          } else{
            this.writer.addQuad(
              namedNode( nodeIRI ),
              namedNode('http://www.w3.org/ns/shacl#path'),
              namedNode( cimiri )
            );
          }

          // Add datatype for the PopertyNode
          this.getObjectForPropType(prop.dataTypes, nodeIRI, cimiri);

          // Add property to the parent class
          this.writer.addQuad(
            namedNode(classNameIri.toString()),
            namedNode('http://www.w3.org/ns/shacl#property'),
            namedNode( nodeIRI.toString() ));
      }
    }

    // FOR TARGETTING in lower levels
    if(root == this.uniquePredicateClass || root == this.uniquePredicatePredicate){
      this.writer.addQuad(
        namedNode( classNameIri.toString() ),
        namedNode('http://www.w3.org/ns/shacl#property'),
        this.writer.blank([{
          predicate: namedNode('http://www.w3.org/ns/shacl#path'),
          object: this.writer.blank([{
            predicate: namedNode('http://www.w3.org/ns/shacl#inversePath'),
            object:    namedNode( this.root.cimIri )
        }])}, {
          predicate: namedNode('http://www.w3.org/ns/shacl#node'),
          object: namedNode( this.rootName ),
        }
      ])
      );
    }
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
    // UNCOMMENT WHEN N3 library supports @base and delete the next line
    // generatedIRI = (this.baseURL != null) ? this.baseURL +  md5String + technicalName + "Shape" : md5String + technicalName + "Shape";
    generatedIRI = md5String + technicalName + "Shape";
    return generatedIRI;
  }

  /**
   * Generate the constraints for the type of property of the Propery class supplied
   * @param datatypes The type of the Property that will have constraints generated.
   * @param propertyNodeIRI The node name IRI
   * @param objectOf The cim IRI of the class this Poperty is a child of.
   */
  protected getObjectForPropType(datatypes: StructureModelType[], propertyNodeIRI: string, objectOf : string): void {
    // setting other properties according to the type of datatype
    for (var dt of datatypes) {
      if(dt.isAssociation() == true){
        // create new NodeShape and tie this property to it if its not just an empty class
        const dtcasted = <StructureModelComplexType> dt;

        var nodeType = "";
          switch(dtcasted.dataType.instancesHaveIdentity){
            case "ALWAYS": {nodeType = 'http://www.w3.org/ns/shacl#IRI';}
            break;
            case "NEVER": {nodeType = 'http://www.w3.org/ns/shacl#BlankNode';}
            break;
            case "OPTIONAL": {nodeType = 'http://www.w3.org/ns/shacl#BlankNodeOrIRI';}
            break;
            default: {nodeType = 'http://www.w3.org/ns/shacl#BlankNodeOrIRI';}
          }
          this.writer.addQuad(
            namedNode( propertyNodeIRI ),
            namedNode('http://www.w3.org/ns/shacl#nodeKind'),
            namedNode( nodeType )
          );
          if(dtcasted.dataType.regex != null && dtcasted.dataType.regex != undefined && dtcasted.dataType.regex != ""){
            this.writer.addQuad(
              namedNode( propertyNodeIRI ),
              namedNode('http://www.w3.org/ns/shacl#pattern'),
              literal(dtcasted.dataType.regex.toString()));
          }
        if(dtcasted.dataType.properties === undefined || dtcasted.dataType.properties.length == 0){
        } else{
          const nameForAnotherClass = this.generateClassConstraints(dtcasted.dataType, objectOf);

          this.writer.addQuad(
            namedNode( propertyNodeIRI ),
            namedNode('http://www.w3.org/ns/shacl#node'),
            namedNode( nameForAnotherClass ));
        }

      } else if(dt.isAttribute() == true){
        // If the datatype is set, try to match it to xsd datatypes. If unable, use its IRI.
        const dtcasted = <StructureModelPrimitiveType> dt;
        if(dtcasted != null){
          const datatypeFromMap = simpleTypeMapQName[dtcasted.dataType];
          var datatypeString = "";
          //console.log("Datatype from map consideration: " + dtcasted.dataType);
          if(datatypeFromMap != undefined){
            //console.log("adding prefix to prefixes");
            if(!this.addedXSDPrefix){
              this.writer.addPrefix("xsd","http://www.w3.org/2001/XMLSchema#");
              this.addedXSDPrefix = true;
            }
            datatypeString = `${datatypeFromMap[0]}:${datatypeFromMap[1]}`;
            if(this.knownPrefixes.find(tuple => tuple[0] === "xsd") == null){
              this.knownPrefixes.push(["xsd","http://www.w3.org/2001/XMLSchema#"]);
            }
            this.writer.addQuad(
              namedNode( propertyNodeIRI ),
              namedNode('http://www.w3.org/ns/shacl#datatype'),
              namedNode( simpleTypeMapIRI[dtcasted.dataType] ));
            if(simpleTypeMapIRI[dtcasted.dataType] == "http://www.w3.org/2001/XMLSchema#anyURI"){
              if(dtcasted.regex != null && dtcasted.regex != undefined && dtcasted.regex != ""){
                this.writer.addQuad(
                  namedNode( propertyNodeIRI ),
                  namedNode('http://www.w3.org/ns/shacl#pattern'),
                  literal(dtcasted.regex.toString()));
              }
            }
          } else{
            if(dtcasted.dataType != null){
              if(dtcasted.dataType.includes("http://www.w3.org/2001/XMLSchema#") && !this.addedXSDPrefix){
                //console.log("adding prefix to prefixes")
                this.writer.addPrefix("xsd","http://www.w3.org/2001/XMLSchema#");
                this.addedXSDPrefix = true;
              }
              this.writer.addQuad(
                namedNode( propertyNodeIRI ),
                namedNode('http://www.w3.org/ns/shacl#datatype'),
                namedNode( dtcasted.dataType ));
            }
            if(dtcasted.regex != null && dtcasted.regex != undefined && dtcasted.regex != ""){
              this.writer.addQuad(
                namedNode( propertyNodeIRI ),
                namedNode('http://www.w3.org/ns/shacl#pattern'),
                literal(dtcasted.regex.toString()));
            }
          }
        }
      } else{
        throw new Error("Datatype must be one of the 3 basic types.");
      }
    }
  }

/**
 * Decides how the Shape is going to target the data that need to be supplied for SHACL validator.
 * @param cls Class object of the root class of the data structure.
 * @param classNameIri IRI for the shape of the root class.
 */
  protected decideHowToTarget(cls : StructureModelClass, classNameIri : string): void {

    if(cls.instancesSpecifyTypes == "ALWAYS" && (isUniqueClass(cls))){
      // USE CASE #1
      this.writer.addQuad(
        namedNode( classNameIri),
        namedNode('http://www.w3.org/ns/shacl#targetClass'),
        namedNode( cls.cimIri)
      );
    } else if(hasUniquePredicates(cls)){
      // USE CASE #2
      const cimOfUniquePredicate = getUniquePredicate(cls);
      this.writer.addQuad(
        namedNode( classNameIri),
        namedNode('http://www.w3.org/ns/shacl#targetSubjectsOf'),
        namedNode( cimOfUniquePredicate.toString())
      );
    } else if(anyPredicateHasUniqueType(cls, this.root.cimIri)){
      // USE CASE #3
      this.uniquePredicateClass = getAnyPredicateUniqueType(cls, this.root.cimIri);
    } else if(anyPredicateHasUniquePredicates(cls)){
      // USE CASE #4
      this.uniquePredicatePredicate = getAnyPredicateUniquePredicate(cls);
    } else{
      // CANNOT TARGET THE SHAPE, fail to generate the artifact
      throw new Error('Unable to target the Data structure defined with SHACL shape. Either define at least one unique type of class with instance typing mandatory or define at least one unique attribute going from the root or its associations with cardinality bigger than 0.');
      // TODO Use a mechanism that dataspecer provides in case an artifact cant be generated
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