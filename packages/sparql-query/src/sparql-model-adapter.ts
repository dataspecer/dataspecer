import {
  StructureModelClass,
  StructureModelProperty,
  StructureModel,
} from "@dataspecer/generators/structure-model/model";
import {
  SparqlConstructQuery,
  SparqlElement,
  SparqlNode,
  SparqlOptionalPattern,
  SparqlPattern,
  SparqlQNameNode,
  SparqlQuery,
  SparqlTriple,
  SparqlUnionPattern,
  SparqlUriNode,
  SparqlVariableNode,
} from "./sparql-model.ts";

import {
  DataSpecification,
} from "@dataspecer/core/data-specification/model";

import { namespaceFromIri } from "@dataspecer/xml/conventions";

export const RDF_TYPE_URI = "http://www.w3.org/1999/02/22-rdf-syntax-ns#type";

const rdfType: SparqlUriNode = {
  uri: RDF_TYPE_URI
};

/**
 * Converts a {@link StructureModel} to a {@link SparqlQuery}.
 */
export function structureModelToSparql(
  specifications: { [iri: string]: DataSpecification },
  specification: DataSpecification,
  model: StructureModel
): SparqlQuery {
  const adapter = new SparqlAdapter(specifications, specification, model);
  return adapter.fromRoots(model.roots.flatMap(root => root.classes));
}

/**
 * This class contains functions to process all parts of a {@link StructureModel}
 * and create an instance of {@link SparqlQuery}.
 */
class SparqlAdapter {
  private variableCounter: number;

  private namespaces: Record<string, string>;
  private namespacesIris: Record<string, string>;
  private namespaceCounter: number;

  /**
   * Creates a new instance of the adapter, for a particular structure model.
   * @param specifications A list of all used specifications in the context.
   * @param specification The specification containing the structure model.
   * @param model The structure model.
   */
  constructor(
    specifications: { [iri: string]: DataSpecification },
    specification: DataSpecification,
    model: StructureModel
  ) {
    this.variableCounter = 0;
    this.namespaces = {};
    this.namespacesIris = {};
    this.namespaceCounter = 0;
  }

  /**
   * Produces a SPARQL query from a list of root classes.
   * @param classes A list of classes to use as the roots in the query.
   * @returns An instance of {@link SparqlQuery} looking for the specific roots.
   */
  public fromRoots(classes: StructureModelClass[]): SparqlQuery {
    const patterns: SparqlPattern[] = [];
    for (const cls of classes) {
      const rootSubject = this.newVariable();
      const elements = [];
      this.classToTriples(rootSubject, cls, false, elements);
      patterns.push({
        elements: elements
      });
    }
    const union: SparqlUnionPattern = {
      unionPatterns: patterns
    }
    const pattern: SparqlPattern = {
      elements: [union]
    };
    return {
      prefixes: this.namespaces,
      construct: pattern,
      where: pattern,
    } as SparqlConstructQuery;
  }

  /**
   * Creates a new variable node with a unique name.
   */
  newVariable(): SparqlVariableNode {
    return {
      variableName: `v${this.variableCounter++}`
    };
  }

  /**
   * Creates a URI node and automatically shortens it using a prefix.
   */
  nodeFromIri(iri: string): SparqlNode {
    const parts = namespaceFromIri(iri);
    if (parts == null) {
      // Namespace cannot be extracted.
      return {
        uri: iri
      } as SparqlUriNode;
    }
    const [namespaceIri, localName] = parts;
    if (this.namespacesIris[namespaceIri] != null) {
      // The namespace was already registered; use its prefix.
      return {
        qname: [this.namespacesIris[namespaceIri], localName]
      } as SparqlQNameNode;
    }
    // Register a new namespace.
    const ns = "ns" + (this.namespaceCounter++);
    this.namespaces[ns] = namespaceIri;
    this.namespacesIris[namespaceIri] = ns;
    return {
      qname: [ns, localName]
    } as SparqlQNameNode;
  }

  /**
   * Adds pattern elements to {@link elements} matching a class.
   * @param subject The subject node for the instance of the class.
   * @param classData The class in the structure model.
   * @param optionalType Whether to wrap the rdf:type match in OPTIONAL.
   * @param elements The output array to hold the pattern elements.
   */
  classToTriples(
    subject: SparqlNode,
    classData: StructureModelClass,
    optionalType: boolean,
    elements: SparqlElement[]
  ) {
    const typeTriple: SparqlTriple = {
      subject: subject,
      predicate: rdfType,
      object: this.nodeFromIri(classData.cimIri)
    };
    if (optionalType) {
      elements.push({
        optionalPattern: {
          elements: [typeTriple]
        }
      } as SparqlOptionalPattern);
    } else {
      elements.push(typeTriple);
    }
    for (const property of classData.properties) {
      this.propertyToTriples(subject, property, elements);
    }
  }

  /**
   * Adds pattern elements to {@link elements} matching a property.
   * @param subject The subject node for the instance.
   * @param propertyData The property in the structure model.
   * @param elements The output array to hold the pattern elements.
   */
  propertyToTriples(
    subject: SparqlNode,
    propertyData: StructureModelProperty,
    elements: SparqlElement[]
  ) {
    if (propertyData.cardinalityMin === 0) {
      // Wrap the match in OPTIONAL if cardinality includes 0.
      const optionalElements: SparqlElement[] = [];
      const optional: SparqlOptionalPattern = {
        optionalPattern: {
          elements: optionalElements
        }
      }
      elements.push(optional);
      elements = optionalElements;
    }

    const pred = this.nodeFromIri(propertyData.cimIri);

    /**
     * Add the triple for the property itself.
     */
    function addTriple(list: SparqlElement[], obj: SparqlNode) {
      if (propertyData.isReverse) {
        list.push({
          subject: obj,
          predicate: pred,
          object: subject
        } as SparqlTriple);
      } else {
        list.push({
          subject: subject,
          predicate: pred,
          object: obj
        } as SparqlTriple);
      }
    }

    const dataTypes = propertyData.dataTypes;

    if (dataTypes.length == 0) {
      addTriple(elements, this.newVariable());
    } else {
      const optionalType = dataTypes.length == 1;
      const patterns: SparqlPattern[] = [];

      // Produce the pattern for each type of the property.
      for (const type of dataTypes) {
        const obj = this.newVariable();
        const patternElements: SparqlElement[] = [];
        addTriple(patternElements, obj);
        if (type.isAssociation()) {
          const classData = type.dataType;
          this.classToTriples(obj, classData, optionalType, patternElements);
        }
        patterns.push({
          elements: patternElements
        });
      }

      // Add the union of patterns for each of the class.
      elements.push({
        unionPatterns: patterns
      } as SparqlUnionPattern);
    }
  }
}
