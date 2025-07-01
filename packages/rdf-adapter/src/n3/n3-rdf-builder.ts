import * as N3 from "n3";
import { LanguageString, RdfBuilder } from "../rdf-builder.ts";

const IRI = N3.DataFactory.namedNode;

const Literal = N3.DataFactory.literal;

const RDF_PREFIX = "http://www.w3.org/1999/02/22-rdf-syntax-ns#";

const RDF = {
  "type": IRI(RDF_PREFIX + "type"),
};

const XSD_PREFIX = "http://www.w3.org/2001/XMLSchema#";

const XSD = {
  "boolean": IRI(XSD_PREFIX + "boolean"),
  "integer": IRI(XSD_PREFIX + "integer"),
  "double": IRI(XSD_PREFIX + "double"),
};

export type N3RdfBuilder =
  RdfBuilder<N3.NamedNode, N3.NamedNode, N3.NamedNode, N3.Quad>;

class DefaultN3RdfBuilder implements N3RdfBuilder {

  quads: N3.Quad[] = [];

  addType(subject: string, type: N3.NamedNode) {
    this.quads.push(new N3.Quad(IRI(subject), RDF.type, type));
    return this;
  }

  private addQuad(subject: N3.Term, predicate: N3.Term, object: N3.Term) {
    this.quads.push(new N3.Quad(subject, predicate, object));
  }

  addIris(subject: string, predicate: N3.NamedNode, values: string[]) {
    values.forEach(value => this.addIri(subject, predicate, value));
    return this;
  }

  addIri(
    subject: string,
    predicate: N3.NamedNode,
    value: N3.NamedNode<string> | string | null,
  ) {
    if (value === null) {
      return this;
    }
    if (value === null) {
      return this;
    }
    if (typeof value === 'string') {
      this.addQuad(IRI(subject), predicate, IRI(value));
    } else {
      this.addQuad(IRI(subject), predicate, value);
    }
    return this;
  }

  addLanguageString(
    subject: string,
    predicate: N3.NamedNode,
    string: LanguageString | null,
  ) {
    if (string === null) {
      return;
    }
    for (const [lang, value] of Object.entries(string)) {
      this.addQuad(IRI(subject), predicate, Literal(value, lang));
    }
    return this;
  }

  addLiteral(
    subject: string,
    predicate: N3.NamedNode,
    object: boolean | number | null,
  ) {
    if (object === null) {
      return this;
    }
    if (typeof object === "boolean") {
      this.addQuad(
        IRI(subject), predicate,
        Literal(String(object), XSD.boolean));
    } else if (Number.isInteger(object)) {
      this.addQuad(
        IRI(subject), predicate,
        Literal(String(object), XSD.integer));
    } else if (!isNaN(object)) {
      // It is not an integer but still a number -> double.
      this.addQuad(
        IRI(subject), predicate,
        Literal(String(object), XSD.double));
    } else {
      throw Error("Not implemented!");
    }
    return this;
  }

  asQuads(): N3.Quad[] {
    return this.quads;
  }

}

export function createN3RdfBuilder() {
  return new DefaultN3RdfBuilder();
}
