/**
 * Vocabulary for Linked Data Event Streams and related resources, provided as
 * 'n3' package IRIs so they can be easily used with 'n3'.
 *
 * @see https://semiceu.github.io/LinkedDataEventStreams/releases/1.0.0/index.html
 */
import { DataFactory } from "n3";

const IRI = DataFactory.namedNode;

const LDES_PREFIX = "https://w3id.org/ldes#";

export const LDES = {
  "EventStream": IRI(LDES_PREFIX + "EventStream"),
  "timestampPath": IRI(LDES_PREFIX + "timestampPath"),
  "versionTimestampPath": IRI(LDES_PREFIX + "versionTimestampPath"),
  "sequencePath": IRI(LDES_PREFIX + "sequencePath"),
  "transactionPath": IRI(LDES_PREFIX + "transactionPath"),
  "versionOfPath": IRI(LDES_PREFIX + "versionOfPath"),
  "versionCreateObject": IRI(LDES_PREFIX + "versionCreateObject"),
  "versionUpdateObject": IRI(LDES_PREFIX + "versionUpdateObject"),
  "versionDeleteObject": IRI(LDES_PREFIX + "versionDeleteObject"),
};

const TREE_PREFIX = "https://w3id.org/tree#";

export const TREE = {
  "Collection": IRI(TREE_PREFIX + "Collection"),
  "view": IRI(TREE_PREFIX + "view"),
  "member": IRI(TREE_PREFIX + "member"),
};

const AS_PREFIX = "https://www.w3.org/ns/activitystreams#";

export const AS = {
  "Create": IRI(AS_PREFIX + "Create"),
  "Update": IRI(AS_PREFIX + "Update"),
  "Delete": IRI(AS_PREFIX + "Delete"),
};

const DCT_PREFIX = "http://purl.org/dc/terms/";

export const DCT = {
  "created": IRI(DCT_PREFIX + "created"),
  "issued": IRI(DCT_PREFIX + "issued"),
  "isVersionOf": IRI(DCT_PREFIX + "isVersionOf"),
  "isReplacedBy": IRI(DCT_PREFIX + "isReplacedBy"),
};

const XSD_PREFIX = "http://www.w3.org/2001/XMLSchema#";

export const XSD = {
  "dateTime": IRI(XSD_PREFIX + "dateTime"),
  "integer": IRI(XSD_PREFIX + "integer"),
};

const RDF_PREFIX = "http://www.w3.org/1999/02/22-rdf-syntax-ns#";

export const RDF = {
  "type": IRI(RDF_PREFIX + "type"),
  "Property": IRI(RDF_PREFIX + "Property"),
};

const RDFS_PREFIX = "http://www.w3.org/2000/01/rdf-schema#";

export const RDFS = {
  "label": IRI(RDFS_PREFIX + "label"),
  "comment": IRI(RDFS_PREFIX + "comment"),
  "isDefinedBy": IRI(RDFS_PREFIX + "isDefinedBy"),
  "subClassOf": IRI(RDFS_PREFIX + "subClassOf"),
  "subPropertyOf": IRI(RDFS_PREFIX + "subPropertyOf"),
  "domain": IRI(RDFS_PREFIX + "domain"),
  "range": IRI(RDFS_PREFIX + "range"),
  "Class": IRI(RDFS_PREFIX + "Class"),
};

const OWL_PREFIX = "http://www.w3.org/2002/07/owl#";

export const OWL = {
  "Class": IRI(OWL_PREFIX + "Class"),
  "DatatypeProperty": IRI(OWL_PREFIX + "DatatypeProperty"),
  "ObjectProperty": IRI(OWL_PREFIX + "ObjectProperty"),
};

/**
 * Dataspecer specific properties used as {@link LDES.sequencePath} and
 * {@link LDES.transactionPath} of the published streams.
 */
const DATASPECER_LDES_PREFIX = "https://schemas.dataspecer.com/ldes#";

export const DATASPECER_LDES = {
  "sequence": IRI(DATASPECER_LDES_PREFIX + "sequence"),
  "transaction": IRI(DATASPECER_LDES_PREFIX + "transaction"),
  "publishedModel": IRI(DATASPECER_LDES_PREFIX + "publishedModel"),
  "version": IRI(DATASPECER_LDES_PREFIX + "version"),
  "hasVersion": IRI(DATASPECER_LDES_PREFIX + "hasVersion"),
  "Version": IRI(DATASPECER_LDES_PREFIX + "Version"),
  "versionLabel": IRI(DATASPECER_LDES_PREFIX + "versionLabel"),
};
