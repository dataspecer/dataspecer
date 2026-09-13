import * as N3 from "n3";
import { DataFactory } from "n3";
import type { ControlledVocabulary } from "./concepts/controlled-vocabulary.ts";

const IRI = DataFactory.namedNode;
const Literal = DataFactory.literal;

const RDF_PREFIX = "http://www.w3.org/1999/02/22-rdf-syntax-ns#";
const RDF = {
  "type": IRI(RDF_PREFIX + "type"),
};

const DCT_PREFIX = "http://purl.org/dc/terms/";
const DCT = {
  "title": IRI(DCT_PREFIX + "title"),
  "references": IRI(DCT_PREFIX + "references"),
};

const DCAT_PREFIX = "http://www.w3.org/ns/dcat#";
const DCAT = {
  "Catalog": IRI(DCAT_PREFIX + "Catalog"),
  "Dataset": IRI(DCAT_PREFIX + "Dataset"),
  "Distribution": IRI(DCAT_PREFIX + "Distribution"),
  "dataset": IRI(DCAT_PREFIX + "dataset"),
  "distribution": IRI(DCAT_PREFIX + "distribution"),
  "downloadURL": IRI(DCAT_PREFIX + "downloadURL"),
  "accessURL": IRI(DCAT_PREFIX + "accessURL"),
  "landingPage": IRI(DCAT_PREFIX + "landingPage"),
};

const SHACL_PREFIX = "http://www.w3.org/ns/shacl#";
const SHACL = {
  "pattern": IRI(SHACL_PREFIX + "pattern"),
};

/**
 * Serializes a project's controlled vocabularies as a DCAT catalog in Turtle.
 * Each vocabulary becomes a dcat:Dataset - metadata entry about the CV
 * dct:references points to the CV skos:ConceptScheme
 */
export function controlledVocabulariesToDcatCatalog(
  catalogIri: string,
  vocabularies: ControlledVocabulary[],
): Promise<string> {
  const writer = new N3.Writer({
    prefixes: {
      rdf: RDF_PREFIX,
      dct: DCT_PREFIX,
      dcat: DCAT_PREFIX,
      sh: SHACL_PREFIX,
    },
  });

  writer.addQuad(IRI(catalogIri), RDF.type, DCAT.Catalog);

  for (const vocabulary of vocabularies) {
    const datasetIri = IRI(`${catalogIri}/dataset/${encodeURIComponent(vocabulary.id)}`);
    writer.addQuad(IRI(catalogIri), DCAT.dataset, datasetIri);
    writer.addQuad(datasetIri, RDF.type, DCAT.Dataset);

    if (vocabulary.title) {
      writer.addQuad(datasetIri, DCT.title, Literal(vocabulary.title));
    }
    if (vocabulary.references) {
      // Links this metadata record to the vocabulary (skos:ConceptScheme)
      // it describes - the same IRI a dsv:ControlledVocabularyAssignment's dsv:controlledVocabulary
      writer.addQuad(datasetIri, DCT.references, IRI(vocabulary.references));
    }
    if (vocabulary.pattern) {
      writer.addQuad(datasetIri, SHACL.pattern, Literal(vocabulary.pattern));
    }
    if (vocabulary.documentation) {
      writer.addQuad(datasetIri, DCAT.landingPage, IRI(vocabulary.documentation));
    }

    const distributionQuads: N3.BlankTriple[] = [{ predicate: RDF.type, object: DCAT.Distribution }];
    if (vocabulary.distribution.downloadUrl) {
      distributionQuads.push({ predicate: DCAT.downloadURL, object: IRI(vocabulary.distribution.downloadUrl) });
    }
    if (vocabulary.distribution.accessUrl) {
      distributionQuads.push({ predicate: DCAT.accessURL, object: IRI(vocabulary.distribution.accessUrl) });
    }
    writer.addQuad(datasetIri, DCAT.distribution, writer.blank(distributionQuads));
  }

  return new Promise((resolve, reject) => {
    writer.end((error, result) => {
      if (error) {
        reject(error);
      } else {
        resolve(result);
      }
    });
  });
}
