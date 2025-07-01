/**
 * This file contains internal vocabulary for use in data-specification-vocabulary
 * package. The vocabulary is provided as 'n3' package IRI so they can be
 * easily used with 'n3'.
 */
import { DataFactory } from "n3";

const IRI = DataFactory.namedNode;

const RDF_PREFIX = "http://www.w3.org/1999/02/22-rdf-syntax-ns#";

export const RDF = {
  "type": IRI(RDF_PREFIX + "type"),
  "Property": IRI(RDF_PREFIX + "Property"),
};

const RDFS_PREFIX = "http://www.w3.org/2000/01/rdf-schema#";

export const RDFS = {
  "Class": IRI(RDFS_PREFIX + "Class"),
  "isDefinedBy": IRI(RDFS_PREFIX + "isDefinedBy"),
  "label": IRI(RDFS_PREFIX + "label"),
  "domain": IRI(RDFS_PREFIX + "domain"),
  "range": IRI(RDFS_PREFIX + "range"),
  "member": IRI(RDFS_PREFIX + "member"),
  "seeAlso": IRI(RDFS_PREFIX + "seeAlso"),
};

const SHACL_PREFIX = "http://www.w3.org/ns/shacl#";

export const SHACL = {
  "NodeShape": IRI(SHACL_PREFIX + "NodeShape"),
  "closed": IRI(SHACL_PREFIX + "closed"),
  "targetClass": IRI(SHACL_PREFIX + "targetClass"),
  "property": IRI(SHACL_PREFIX + "property"),
  "description": IRI(SHACL_PREFIX + "description"),
  "name": IRI(SHACL_PREFIX + "name"),
  "nodeKind": IRI(SHACL_PREFIX + "nodeKind"),
  "path": IRI(SHACL_PREFIX + "path"),
  "maxCount": IRI(SHACL_PREFIX + "maxCount"),
  "minCount": IRI(SHACL_PREFIX + "minCount"),
  "class": IRI(SHACL_PREFIX + "class"),
  "datatype": IRI(SHACL_PREFIX + "datatype"),
  "IRI": IRI(SHACL_PREFIX + "IRI"),
  "BlankNode": IRI(SHACL_PREFIX + "BlankNode"),
  "Literal": IRI(SHACL_PREFIX + "Literal"),
  "BlankNodeOrIRI": IRI(SHACL_PREFIX + "BlankNodeOrIRI"),
  "BlankNodeOrLiteral": IRI(SHACL_PREFIX + "BlankNodeOrLiteral"),
  "IRIOrLiteral": IRI(SHACL_PREFIX + "IRIOrLiteral"),
  "PropertyShape": IRI(SHACL_PREFIX + "PropertyShape"),
};
