import {
  createN3RdfBuilder,
  type N3RdfBuilder,
  createN3Writer,
} from "@dataspecer/rdf-adapter";

import {
  ShaclModel,
  ShaclNodeKind,
  ShaclNodeShape,
  ShaclPropertyShape,
} from "./shacl-model.ts"
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

  const builder = createN3RdfBuilder();
  (new ShaclModelWriter(builder, model)).writeShaclModel();

  const writer = createN3Writer(prefixes);
  writer.addQuads(builder.asQuads());

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

  private builder: N3RdfBuilder;

  private model: ShaclModel;

  constructor(writer: N3RdfBuilder, model: ShaclModel) {
    this.builder = writer;
    this.model = model;
  }

  writeShaclModel(): void {
    // We first write member predicates and then the rest.
    for (const member of this.model.members) {
      this.builder.addIri(this.model.iri, RDFS.member, member.iri);
    }
    for (const member of this.model.members) {
      this.writeNodeShape(member);
    }
  }

  writeNodeShape(shape: ShaclNodeShape): void {
    const iri = shape.iri;
    this.builder.addType(iri, SHACL.NodeShape);
    this.builder.addIri(iri, RDFS.seeAlso, shape.seeAlso);
    this.builder.addLiteral(iri, SHACL.closed, shape.closed);
    this.builder.addIri(iri, SHACL.targetClass, shape.targetClass);
    for (const propertyShape of shape.propertyShapes) {
      const propertyIri = this.writePropertyShape(propertyShape);
      this.builder.addIri(iri, SHACL.property, propertyIri);
    }
  }

  writePropertyShape(shape: ShaclPropertyShape): string {
    const iri = shape.iri;

    this.builder.addType(iri, SHACL.PropertyShape);
    this.builder.addLanguageString(iri, SHACL.name, shape.name);
    this.builder.addLanguageString(iri, SHACL.description, shape.description);

    switch (shape.nodeKind) {
      case ShaclNodeKind.BlankNode:
        this.builder.addIri(iri, SHACL.nodeKind, SHACL.BlankNode);
        break;
      case ShaclNodeKind.BlankNodeOrIRI:
        this.builder.addIri(iri, SHACL.nodeKind, SHACL.BlankNodeOrIRI);
        break;
      case ShaclNodeKind.BlankNodeOrLiteral:
        this.builder.addIri(iri, SHACL.nodeKind, SHACL.BlankNodeOrLiteral);
        break;
      case ShaclNodeKind.IRI:
        this.builder.addIri(iri, SHACL.nodeKind, SHACL.IRI);
        break;
      case ShaclNodeKind.IRIOrLiteral:
        this.builder.addIri(iri, SHACL.nodeKind, SHACL.IRIOrLiteral);
        break;
      case ShaclNodeKind.Literal:
        this.builder.addIri(iri, SHACL.nodeKind, SHACL.Literal);
        break;
      default:
        break;
    }

    this.builder.addIri(iri, SHACL.path, shape.path);
    this.builder.addLiteral(iri, SHACL.maxCount, shape.maxCount);
    this.builder.addLiteral(iri, SHACL.minCount, shape.minCount);
    this.builder.addIri(iri, SHACL.class, shape.class);
    this.builder.addIri(iri, SHACL.class, shape.datatype);
    return iri;
  }

}
