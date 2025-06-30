import { ShaclModel, ShaclNodeKind, ShaclNodeShape, ShaclPropertyShape } from "./shacl-model/shacl-model.ts";
import { N3Writer } from "./n3-writer.ts";
import { RDFS, SHACL } from "./vocabulary.ts";

interface ShaclModelToRdfConfiguration {

  /**
   * Prefixes to use when writing RDF output.
   */
  prefixes?: { [prefix: string]: string };

  /**
   * True to do some additional formatting on the output string.
   */
  prettyPrint?: boolean;

}

export async function shaclToRdf(
  model: ShaclModel,
  configuration: ShaclModelToRdfConfiguration,
): Promise<string> {
  const effectiveConfiguration = {
    ...createDefaultConfiguration(),
    ...configuration,
  };
  const prefixes = {
    ...effectiveConfiguration.prefixes,
  };
  const writer = new N3Writer(prefixes);
  (new ShaclModelWriter(writer, model)).writeShaclModel();
  return effectiveConfiguration.prettyPrint ?
    writer.asPrettyString() : writer.asString();
}

function createDefaultConfiguration(): ShaclModelToRdfConfiguration {
  return {
    "prefixes": {
      "rdf": "http://www.w3.org/1999/02/22-rdf-syntax-ns#",
      "rdfs": "http://www.w3.org/2000/01/rdf-schema#",
      "sh": "http://www.w3.org/ns/shacl#",
      "xsd": "http://www.w3.org/2001/XMLSchema#",
    },
    "prettyPrint": true,
  };
}

class ShaclModelWriter {

  private writer: N3Writer;

  private model: ShaclModel;

  constructor(writer: N3Writer, model: ShaclModel) {
    this.writer = writer;
    this.model = model;
  }

  writeShaclModel(): void {
    // We first write member predicates and then the rest.
    for (const member of this.model.members) {
      this.writer.addIri(this.model.iri, RDFS.member, member.iri);
    }
    for (const member of this.model.members) {
      this.writeNodeShape(member);
    }
  }

  writeNodeShape(shape: ShaclNodeShape): void {
    const iri = shape.iri;
    this.writer.addType(iri, SHACL.NodeShape);
    this.writer.addIri(iri, RDFS.seeAlso, shape.seeAlso);
    this.writer.addLiteral(iri, SHACL.closed, shape.closed);
    this.writer.addIri(iri, SHACL.targetClass, shape.targetClass);
    for (const propertyShape of shape.propertyShapes) {
      const propertyIri = this.writePropertyShape(propertyShape);
      this.writer.addIri(iri, SHACL.property, propertyIri);
    }
  }

  writePropertyShape(shape: ShaclPropertyShape): string {
    const iri = shape.iri;

    // rdfs:seeAlso // TODO Where to get this?

    this.writer.addLanguageString(iri, SHACL.name, shape.name);
    this.writer.addLanguageString(iri, SHACL.description, shape.description);

    switch (shape.nodeKind) {
      case ShaclNodeKind.BlankNode:
        this.writer.addIri(iri, SHACL.nodeKind, SHACL.BlankNode);
        break;
      case ShaclNodeKind.BlankNodeOrIRI:
        this.writer.addIri(iri, SHACL.nodeKind, SHACL.BlankNodeOrIRI);
        break;
      case ShaclNodeKind.BlankNodeOrLiteral:
        this.writer.addIri(iri, SHACL.nodeKind, SHACL.BlankNodeOrLiteral);
        break;
      case ShaclNodeKind.IRI:
        this.writer.addIri(iri, SHACL.nodeKind, SHACL.IRI);
        break;
      case ShaclNodeKind.IRIOrLiteral:
        this.writer.addIri(iri, SHACL.nodeKind, SHACL.IRIOrLiteral);
        break;
      case ShaclNodeKind.Literal:
        this.writer.addIri(iri, SHACL.nodeKind, SHACL.Literal);
        break;
      default:
        break;
    }

    this.writer.addIri(iri, SHACL.path, shape.path);
    this.writer.addLiteral(iri, SHACL.maxCount, shape.maxCount);
    this.writer.addIri(iri, SHACL.class, shape.class);
    this.writer.addIri(iri, SHACL.class, shape.datatype);
    return iri;
  }

}
