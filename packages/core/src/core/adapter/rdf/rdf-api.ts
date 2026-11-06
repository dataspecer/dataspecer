import type { BlankNode, Literal, NamedNode, Quad, Term } from "@rdfjs/types";
import { DataFactory } from "n3";

export enum RdfTermType {
  BlankNode = "BlankNode",
  NamedNode = "NamedNode",
  Literal = "Literal",
  DefaultGraph = "DefaultGraph",
  Variable = "Variable",
  Quad = "Quad",
}

export type RdfQuad = Quad;
export type RdfNode = Quad["subject"] | Quad["graph"];
export type RdfObject = Quad["object"];
export type RdfLiteral = Literal;

export const RdfNode = {
  DEFAULT_GRAPH: "",
  namedNode: DataFactory.namedNode,
  defaultGraph: DataFactory.defaultGraph,
} as const;

export const RdfObject = {
  isNotNode(object: Term): boolean {
    return !RdfObject.isNode(object);
  },

  isNode(object: Term): object is NamedNode | BlankNode {
    return (
      object.termType === RdfTermType.NamedNode ||
      object.termType === RdfTermType.BlankNode
    );
  },

  isLiteral(object: Term): object is Literal {
    return object.termType === RdfTermType.Literal;
  },
};

/**
 * This interface should be implemented by sources of RDF data.
 */
export interface RdfSource {
  property(iri: string, predicate: string): Promise<RdfObject[]> | RdfObject[];

  reverseProperty(predicate: string, iri: string): Promise<RdfNode[]> | RdfNode[];
}

/**
 * This interface should be implemented by RDF sinks, which can write
 * RDF data.
 */
export interface RdfSink {
  write(quads: RdfQuad): Promise<void>;
}
