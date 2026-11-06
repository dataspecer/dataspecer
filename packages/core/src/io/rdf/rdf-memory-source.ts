import { RdfSource, RdfQuad, RdfObject, RdfTermType, RdfNode } from "./rdf-api.ts";
import { DataFactory } from "n3";
import type { BlankNode } from "@rdfjs/types";

/**
 * Can be used as a base class for sources that load chunk of data
 * into the memory.
 */
export class RdfMemorySource implements RdfSource {
  protected quads: RdfQuad[] = [];

  property(iri: string, predicate: string): RdfObject[] {
    return this.quads
      .filter((quad) => quad.subject.value === iri && quad.predicate.value === predicate)
      .map((quad) => quad.object);
  }

  reverseProperty(predicate: string, iri: string): RdfNode[] {
    return this.quads
      .filter((quad) => quad.object.value === iri)
      .filter((quad) => RdfObject.isNode(quad.object))
      .filter((quad) => quad.predicate.value === predicate)
      .map((quad) => quad.subject);
  }

  getQuads(): RdfQuad[] {
    return this.quads;
  }

  /**
   * Two blank nodes from two document might be the same after
   * the document is parsed, but they are not. A solution is to prefix
   * the blank nodes identifiers with URL.
   */
  protected static prefixBlankNodes(
    quads: RdfQuad[],
    prefix: string
  ): RdfQuad[] {
    const sanitizeTerm = <T extends RdfNode | RdfObject>(term: T): T | BlankNode =>
      term.termType === RdfTermType.BlankNode
        ? DataFactory.blankNode(`${term.value}:${prefix}`)
        : term;

    const sanitizeQuad = (quad: RdfQuad): RdfQuad => DataFactory.quad(
      quad.subject.termType === RdfTermType.Quad
        ? sanitizeQuad(quad.subject)
        : sanitizeTerm(quad.subject),
      quad.predicate,
      quad.object.termType === RdfTermType.Quad
        ? sanitizeQuad(quad.object)
        : sanitizeTerm(quad.object),
      sanitizeTerm(quad.graph),
    );

    return quads.map(sanitizeQuad);
  }
}
