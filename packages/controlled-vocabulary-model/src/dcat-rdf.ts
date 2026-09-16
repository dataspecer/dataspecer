import * as N3 from "n3";
import { DataFactory } from "n3";
import { v4 as uuidv4 } from "uuid";
import { DEFAULT_CONTROLLED_VOCABULARY, type ControlledVocabulary } from "./concepts/controlled-vocabulary.ts";

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
 * Mints a stable IRI for a vocabulary's DCAT dataset record within a given
 * catalog. Used as a fallback when the vocabulary has no `iri` of its own
 * yet (i.e. it has never been exported/imported before).
 */
export function controlledVocabularyDatasetIri(catalogIri: string, vocabularyId: string): string {
  return `${catalogIri}/dataset/${encodeURIComponent(vocabularyId)}`;
}

/**
 * Writes the dcat:Dataset triples (and their dcat:Distribution blank nodes)
 * for a set of vocabularies onto an existing writer - does not write the
 * catalog's own rdf:type triple or finalize the writer, so callers can merge
 * this into a larger document (e.g. dsv.ttl) before serializing.
 */
export function writeControlledVocabularyCatalogQuads(
  writer: N3.Writer,
  catalogIri: string,
  vocabularies: ControlledVocabulary[],
): void {
  for (const vocabulary of vocabularies) {
    const datasetIri = IRI(vocabulary.iri ?? controlledVocabularyDatasetIri(catalogIri, vocabulary.id));
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
}

/**
 * Serializes a project's controlled vocabularies as a standalone DCAT
 * catalog in Turtle. Each vocabulary becomes a dcat:Dataset - metadata entry
 * about the CV. dct:references points to the CV's skos:ConceptScheme.
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
  writeControlledVocabularyCatalogQuads(writer, catalogIri, vocabularies);

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

/**
 * Parses dcat:Dataset records (and their dcat:Distribution blank nodes) out
 * of a set of quads into ControlledVocabulary entities - the mirror image of
 * writeControlledVocabularyCatalogQuads. Each returned vocabulary gets a
 * fresh local id (unrelated to the source project's own) and its `iri` set
 * to the dataset's own subject IRI from the source RDF, so a re-export can
 * reuse it instead of minting a new one.
 */
export function parseControlledVocabularyCatalog(quads: N3.Quad[]): ControlledVocabulary[] {
  const store = new N3.Store(quads);
  const result: ControlledVocabulary[] = [];

  for (const datasetSubject of store.getSubjects(RDF.type, DCAT.Dataset, null)) {
    const title = store.getObjects(datasetSubject, DCT.title, null)[0]?.value ?? "";
    const references = store.getObjects(datasetSubject, DCT.references, null)[0]?.value ?? "";
    const documentation = store.getObjects(datasetSubject, DCAT.landingPage, null)[0]?.value ?? "";
    const pattern = store.getObjects(datasetSubject, SHACL.pattern, null)[0]?.value ?? "";

    const distributionNode = store.getObjects(datasetSubject, DCAT.distribution, null)[0];
    const downloadUrl = distributionNode ? (store.getObjects(distributionNode, DCAT.downloadURL, null)[0]?.value ?? "") : "";
    const accessUrl = distributionNode ? (store.getObjects(distributionNode, DCAT.accessURL, null)[0]?.value ?? "") : "";

    result.push({
      ...DEFAULT_CONTROLLED_VOCABULARY,
      id: uuidv4(),
      iri: datasetSubject.value,
      title,
      references,
      documentation,
      pattern,
      distribution: { downloadUrl, accessUrl },
    });
  }

  return result;
}
