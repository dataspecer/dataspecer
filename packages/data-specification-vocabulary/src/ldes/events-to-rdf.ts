import * as N3 from "n3";
import { DataFactory } from "n3";

import type { OwlClass, OwlProperty } from "@dataspecer/lightweight-owl";
import { OwlPropertyType } from "@dataspecer/lightweight-owl";
import type { LanguageString } from "../semantic-model/dsv-model.ts";
import { DsvWriter, prettyPrintTurtle } from "../semantic-model/dsv-to-rdf.ts";
import { DSV } from "../semantic-model/vocabulary.ts";
import type { LdesEvent, LdesEventStream } from "./ldes-model.ts";
import { AS, DATASPECER_LDES, DCT, LDES, OWL, RDF, RDFS, TREE, XSD } from "./vocabulary.ts";

const IRI = DataFactory.namedNode;

const Literal = DataFactory.literal;

interface LdesToRdfConfiguration {

  /**
   * Prefixes to use when writing RDF output.
   */
  prefixes?: { [prefix: string]: string };

  /**
   * True to do some additional formatting on the output string.
   */
  prettyPrint?: boolean;

}

export async function ldesToRdf(
  stream: LdesEventStream, configuration: LdesToRdfConfiguration,
): Promise<string> {
  const defaultConfig = createDefaultConfiguration();
  const effectiveConfiguration = {
    ...defaultConfig,
    ...configuration,
    prefixes: {
      ...defaultConfig.prefixes,
      ...(configuration.prefixes || {}),
    },
  };
  const n3Writer = new N3.Writer({ prefixes: effectiveConfiguration.prefixes });
  (new LdesWriter(n3Writer, stream)).writeEventStream();
  // Convert to a string.
  return new Promise((resolve, reject) => n3Writer.end((error, result) => {
    if (error) {
      reject(error);
    } else {
      if (effectiveConfiguration.prettyPrint) {
        resolve(prettyPrintTurtle(result));
      } else {
        resolve(result);
      }
    }
  }));
}

function createDefaultConfiguration(): LdesToRdfConfiguration {
  return {
    "prefixes": {
      "rdf": "http://www.w3.org/1999/02/22-rdf-syntax-ns#",
      "rdfs": "http://www.w3.org/2000/01/rdf-schema#",
      "owl": "http://www.w3.org/2002/07/owl#",
      "dct": "http://purl.org/dc/terms/",
      "xsd": "http://www.w3.org/2001/XMLSchema#",
      "dsv": "https://w3id.org/dsv#",
      "skos": "http://www.w3.org/2004/02/skos/core#",
      "cardinality": "https://w3id.org/dsv/cardinality#",
      "requirement": "https://w3id.org/dsv/requirement-level#",
      "role": "https://w3id.org/dsv/class-role#",
      "ldes": "https://w3id.org/ldes#",
      "tree": "https://w3id.org/tree#",
      "as": "https://www.w3.org/ns/activitystreams#",
      "ds-ldes": "https://schemas.dataspecer.com/ldes#",
    },
    "prettyPrint": true,
  };
}

class LdesWriter {

  private writer: N3.Writer;

  private stream: LdesEventStream;

  private dsvWriter: DsvWriter;

  constructor(writer: N3.Writer, stream: LdesEventStream) {
    this.writer = writer;
    this.stream = stream;
    // The DSV writer is used for term profile snapshots; it only needs the
    // application profile IRI to write dct:isPartOf.
    this.dsvWriter = new DsvWriter(writer, {
      iri: stream.publishedModelIri,
      externalDocumentationUrl: null,
      classProfiles: [],
      datatypePropertyProfiles: [],
      objectPropertyProfiles: [],
    });
  }

  writeEventStream(): void {
    const stream = IRI(this.stream.iri);
    this.writer.addQuad(stream, RDF.type, LDES.EventStream);
    this.writer.addQuad(stream, RDF.type, TREE.Collection);
    this.writer.addQuad(stream, LDES.timestampPath, DCT.issued);
    this.writer.addQuad(stream, LDES.versionTimestampPath, DCT.created);
    this.writer.addQuad(stream, LDES.sequencePath, DATASPECER_LDES.sequence);
    this.writer.addQuad(stream, LDES.transactionPath, DATASPECER_LDES.transaction);
    this.writer.addQuad(stream, LDES.versionOfPath, DCT.isVersionOf);
    this.writer.addQuad(stream, LDES.versionCreateObject, AS.Create);
    this.writer.addQuad(stream, LDES.versionUpdateObject, AS.Update);
    this.writer.addQuad(stream, LDES.versionDeleteObject, AS.Delete);
    // The whole stream is published as a single page.
    this.writer.addQuad(stream, TREE.view, stream);
    this.writer.addQuad(stream, DATASPECER_LDES.publishedModel, IRI(this.stream.publishedModelIri));

    // Term profile snapshots are grouped under the application profile by
    // dct:isPartOf, so consumers (and our reader) need its type.
    if (this.stream.events.some((event) => event.snapshot?.kind === "term-profile")) {
      this.writer.addQuad(IRI(this.stream.publishedModelIri), RDF.type, DSV.ApplicationProfile);
    }

    this.stream.events.forEach(event => this.writeEvent(event));
  }

  private writeEvent(event: LdesEvent): void {
    const member = IRI(event.memberIri);
    this.writer.addQuad(IRI(this.stream.iri), TREE.member, member);
    switch (event.kind) {
      case "create":
        this.writer.addQuad(member, RDF.type, AS.Create);
        break;
      case "update":
        this.writer.addQuad(member, RDF.type, AS.Update);
        break;
      case "delete":
        this.writer.addQuad(member, RDF.type, AS.Delete);
        break;
    }
    this.writer.addQuad(member, DCT.isVersionOf, IRI(event.iri));
    this.writer.addQuad(member, DCT.created, Literal(event.created, XSD.dateTime));
    this.writer.addQuad(member, DCT.issued, Literal(event.issued, XSD.dateTime));
    this.writer.addQuad(member, DATASPECER_LDES.sequence, Literal(event.sequence));
    this.writer.addQuad(member, DATASPECER_LDES.transaction, Literal(event.transactionId));
    if (event.replacedByIri !== undefined) {
      this.writer.addQuad(member, DCT.isReplacedBy, IRI(event.replacedByIri));
    }
    this.writeSnapshot(event);
  }

  /**
   * Writes the snapshot triples with the member (version) IRI as the subject;
   * the canonical IRI is available via dct:isVersionOf.
   */
  private writeSnapshot(event: LdesEvent): void {
    if (event.snapshot === null) {
      return;
    }
    switch (event.snapshot.kind) {
      case "term-profile":
        this.dsvWriter.writeTermProfile({ ...event.snapshot.termProfile, iri: event.memberIri });
        break;
      case "owl-class":
        this.writeOwlClass({ ...event.snapshot.owlClass, iri: event.memberIri });
        break;
      case "owl-property":
        this.writeOwlProperty({ ...event.snapshot.owlProperty, iri: event.memberIri });
        break;
    }
  }

  private writeOwlClass(owlClass: OwlClass): void {
    const subject = IRI(owlClass.iri);
    this.writer.addQuad(subject, RDF.type, OWL.Class);
    this.writer.addQuad(subject, RDF.type, RDFS.Class);
    this.addLiteral(subject, RDFS.label, owlClass.name);
    this.addLiteral(subject, RDFS.comment, owlClass.description);
    this.writer.addQuad(subject, RDFS.isDefinedBy, IRI(owlClass.isDefinedBy));
    for (const parent of owlClass.subClassOf) {
      this.writer.addQuad(subject, RDFS.subClassOf, IRI(parent));
    }
  }

  private writeOwlProperty(owlProperty: OwlProperty): void {
    const subject = IRI(owlProperty.iri);
    this.writer.addQuad(subject, RDF.type, RDF.Property);
    switch (owlProperty.type) {
      case OwlPropertyType.DatatypeProperty:
        this.writer.addQuad(subject, RDF.type, OWL.DatatypeProperty);
        break;
      case OwlPropertyType.ObjectProperty:
        this.writer.addQuad(subject, RDF.type, OWL.ObjectProperty);
        break;
    }
    this.addLiteral(subject, RDFS.label, owlProperty.name);
    this.addLiteral(subject, RDFS.comment, owlProperty.description);
    this.writer.addQuad(subject, RDFS.isDefinedBy, IRI(owlProperty.isDefinedBy));
    for (const parent of owlProperty.subPropertyOf) {
      this.writer.addQuad(subject, RDFS.subPropertyOf, IRI(parent));
    }
    this.writer.addQuad(subject, RDFS.domain, IRI(owlProperty.domain));
    this.writer.addQuad(subject, RDFS.range, IRI(owlProperty.range));
  }

  private addLiteral(subject: N3.NamedNode, predicate: N3.NamedNode, string: LanguageString): void {
    for (const [lang, value] of Object.entries(string)) {
      this.writer.addQuad(subject, predicate, Literal(value, lang));
    }
  }

}
