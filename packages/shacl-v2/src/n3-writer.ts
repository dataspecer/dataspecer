import * as N3 from "n3";
import { DataFactory } from "n3";

const IRI = DataFactory.namedNode;

const Literal = DataFactory.literal;

type LanguageString = { [language: string]: string };

const RDF_PREFIX = "http://www.w3.org/1999/02/22-rdf-syntax-ns#";

export const RDF = {
  "type": IRI(RDF_PREFIX + "type"),
};

const XSD_PREFIX = "http://www.w3.org/2001/XMLSchema#";

export const XSD = {
  "boolean": IRI(XSD_PREFIX + "boolean"),
  "integer": IRI(XSD_PREFIX + "integer"),
  "double": IRI(XSD_PREFIX + "double"),
}

export class N3Writer {

  /**
   * Expose access to underling writer.
   */
  writer: N3.Writer;

  constructor(prefixes: { [prefix: string]: string }) {
    this.writer = new N3.Writer({ prefixes });
  }

  addType(subject: string, type: N3.NamedNode) {
    this.writer.addQuad(IRI(subject), RDF.type, type);
  }

  addIris(subject: string, predicate: N3.NamedNode, values: string[]) {
    values.forEach(value => this.addIri(subject, predicate, value));
  }

  addIri(
    subject: string,
    predicate: N3.NamedNode,
    value: N3.NamedNode<string> | string | null,
  ) {
    if (value === null) {
      return;
    }
    if (value === null) {
      return;
    }
    if (typeof value === 'string') {
      this.writer.addQuad(IRI(subject), predicate, IRI(value));
    } else {
      this.writer.addQuad(IRI(subject), predicate, value);
    }
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
      this.writer.addQuad(IRI(subject), predicate, Literal(value, lang));
    }
  }

  addLiteral(
    subject: string,
    predicate: N3.NamedNode,
    object: boolean | number | null,
  ) {
    if (object === null) {
      return;
    }
    if (typeof object === "boolean") {
      this.writer.addQuad(
        IRI(subject), predicate,
        Literal(String(object), XSD.boolean));
    } else if (Number.isInteger(object)) {
      this.writer.addQuad(
        IRI(subject), predicate,
        Literal(String(object), XSD.integer));
    } else if (!isNaN(object)) {
      // It is not an integer but still a number -> double.
      this.writer.addQuad(
        IRI(subject), predicate,
        Literal(String(object), XSD.double));
    } else {
      throw Error("Not implemented!");
    }
  }

  asString(): Promise<string> {
    return new Promise((resolve, reject) => this.writer.end((error, result) => {
      if (error) {
        reject(error);
      } else {
        resolve(result);
      }
    }));
  }

  asPrettyString(): Promise<string> {
    return this.asString().then(value => prettyPrintTurtle(value));
  }

}

/**
 * Add an empty line before each resource section.
 */
function prettyPrintTurtle(turtle: string): string {
  const lines = turtle.split(/\r?\n|\r|\n/g);
  const linesNext = [];
  for (const line of lines) {
    linesNext.push(line);
    if (line.startsWith("@prefix")) {
      continue;
    }
    if (line.endsWith(".")) {
      linesNext.push("");
    }
  }
  return linesNext.join("\n");
}
