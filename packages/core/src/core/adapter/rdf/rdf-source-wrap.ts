import { RdfNode, RdfObject, RdfSource } from "./rdf-api.ts";
import type { Literal } from "@rdfjs/types";
import {RdfMemorySource} from "../../../io/rdf/rdf-memory-source.ts";

const TYPE = "http://www.w3.org/1999/02/22-rdf-syntax-ns#type";

const HAS_FIRST = "http://www.w3.org/1999/02/22-rdf-syntax-ns#first";

const HAS_REST = "http://www.w3.org/1999/02/22-rdf-syntax-ns#rest";

const RDF_NIL = "http://www.w3.org/1999/02/22-rdf-syntax-ns#nil";

/**
 * Bind resource to particular {@link RdfSource} to make operation easier.
 */
export class RdfSourceWrap {
  readonly iri: string;

  protected readonly source: RdfSource;

  protected constructor(iri: string, source: RdfSource) {
    this.iri = iri;
    this.source = source;
  }

  static forIri(resource: string, source: RdfSource): RdfSourceWrap {
    return new RdfSourceWrap(resource, source);
  }

  async property(predicate: string): Promise<RdfObject[]> {
    return this.source.property(this.iri, predicate);
  }

  async reverseProperty(predicate: string): Promise<RdfNode[]> {
    return this.source.reverseProperty(predicate, this.iri);
  }

  /**
   * Resolve lists with rdf:first, rdf:rest
   */
  async propertyExtended(predicate: string): Promise<RdfObject[]> {
    const values = await this.property(predicate);
    const result = [];
    for (const value of values) {
      if (RdfObject.isNotNode(value)) {
        // As the value is not a node it can not represent a list.
        result.push(value);
        continue;
      }
      const hasFirst = await this.source.property(value.value, HAS_FIRST);
      if (hasFirst.length === 0) {
        // It is an entity.
        result.push(value);
      } else {
        // It is a list.
        await this.loadList(result, value);
      }
    }
    return result;
  }

  protected async loadList(
    collector: RdfObject[],
    node: RdfObject
  ): Promise<void> {
    const hasFirst = await this.source.property(node.value, HAS_FIRST);
    if (hasFirst.length !== 1) {
      throw new Error(
        `Invalid number (${hasFirst.length}) rdf:head for ${node.value}`
      );
    }
    const first = hasFirst[0];
    if (RdfObject.isNode(first)) {
      collector.push(first);
    }
    const hasRest = await this.source.property(node.value, HAS_REST);
    if (hasRest.length !== 1) {
      throw new Error(`Invalid number rdf:rest for ${node.value}`);
    }
    const rest = hasRest[0];
    if (RdfObject.isNode(rest)) {
      if (rest.value === RDF_NIL) {
        return;
      }
      await this.loadList(collector, rest);
    }
  }

  async literal(predicate: string): Promise<Literal | null> {
    const values = await this.property(predicate);
    if (values.length == 0) {
      return null;
    }
    for (const value of values) {
      if (RdfObject.isLiteral(value)) {
        return value;
      }
    }
    return null;
  }

  async literals(predicate: string): Promise<Literal[]> {
    const properties = await this.property(predicate);
    return properties.filter(RdfObject.isLiteral);
  }

  async reverseNode(predicate: string): Promise<string | null> {
    const values = await this.reverseProperty(predicate);
    for (const value of values) {
      return value.value;
    }
    return null;
  }

  async reverseNodes(predicate: string): Promise<string[]> {
    return (await this.reverseProperty(predicate))
      .filter(RdfObject.isNode)
      .map((value) => value.value);
  }

  async node(predicate: string): Promise<string | null> {
    const values = await this.property(predicate);
    for (const value of values) {
      if (RdfObject.isNode(value)) {
        return value.value;
      }
    }
    return null;
  }

  async nodes(predicate: string): Promise<string[]> {
    return (await this.property(predicate))
      .filter(RdfObject.isNode)
      .map((value) => value.value);
  }

  async nodesExtended(predicate: string): Promise<string[]> {
    return (await this.propertyExtended(predicate))
      .filter(RdfObject.isNode)
      .map((value) => value.value);
  }

  async types(): Promise<string[]> {
    return await this.nodes(TYPE);
  }

  async languageString(predicate: string): Promise<Record<string, string>> {
    const literals = await this.literals(predicate);
    if (literals.length === 0) {
      return null;
    }
    const result = {};
    for (const title of literals) {
      result[title.language ?? ""] = String(title.value);
    }
    return result;
  }
}

export class RdfMemorySourceWrap {
  readonly iri: string;

  protected readonly source: RdfMemorySource;

  protected constructor(iri: string, source: RdfMemorySource) {
    this.iri = iri;
    this.source = source;
  }

  static forIri(resource: string, source: RdfMemorySource): RdfMemorySourceWrap {
    return new RdfMemorySourceWrap(resource, source);
  }

  property(predicate: string): RdfObject[] {
    return this.source.property(this.iri, predicate);
  }

  reverseProperty(predicate: string): RdfNode[] {
    return this.source.reverseProperty(predicate, this.iri);
  }

  /**
   * Resolve lists with rdf:first, rdf:rest
   */
  propertyExtended(predicate: string): RdfObject[] {
    const values = this.property(predicate);
    const result = [];
    for (const value of values) {
      if (RdfObject.isNotNode(value)) {
        // As the value is not a node it can not represent a list.
        result.push(value);
        continue;
      }
      const hasFirst = this.source.property(value.value, HAS_FIRST);
      if (hasFirst.length === 0) {
        // It is an entity.
        result.push(value);
      } else {
        // It is a list.
        this.loadList(result, value);
      }
    }
    return result;
  }

  protected loadList(
      collector: RdfObject[],
      node: RdfObject
  ) {
    const hasFirst = this.source.property(node.value, HAS_FIRST);
    if (hasFirst.length !== 1) {
      throw new Error(
          `Invalid number (${hasFirst.length}) rdf:head for ${node.value}`
      );
    }
    const first = hasFirst[0];
    if (RdfObject.isNode(first)) {
      collector.push(first);
    }
    const hasRest = this.source.property(node.value, HAS_REST);
    if (hasRest.length !== 1) {
      throw new Error(`Invalid number rdf:rest for ${node.value}`);
    }
    const rest = hasRest[0];
    if (RdfObject.isNode(rest)) {
      if (rest.value === RDF_NIL) {
        return;
      }
      this.loadList(collector, rest);
    }
  }

  literal(predicate: string): Literal | null {
    const values = this.property(predicate);
    if (values.length == 0) {
      return null;
    }
    for (const value of values) {
      if (RdfObject.isLiteral(value)) {
        return value;
      }
    }
    return null;
  }

  literals(predicate: string): Literal[] {
    const properties = this.property(predicate);
    return properties.filter(RdfObject.isLiteral);
  }

  reverseNode(predicate: string): string | null {
    const values = this.reverseProperty(predicate);
    for (const value of values) {
      return value.value;
    }
    return null;
  }

  reverseNodes(predicate: string): string[] {
    return (this.reverseProperty(predicate))
        .filter(RdfObject.isNode)
        .map((value) => value.value);
  }

  node(predicate: string): string | null {
    const values = this.property(predicate);
    for (const value of values) {
      if (RdfObject.isNode(value)) {
        return value.value;
      }
    }
    return null;
  }

  nodes(predicate: string): string[] {
    return (this.property(predicate))
        .filter(RdfObject.isNode)
        .map((value) => value.value);
  }

  nodesExtended(predicate: string): string[] {
    return (this.propertyExtended(predicate))
        .filter(RdfObject.isNode)
        .map((value) => value.value);
  }

  types(): string[] {
    return this.nodes(TYPE);
  }

  languageString(predicate: string): Record<string, string> {
    const literals = this.literals(predicate);
    if (literals.length === 0) {
      return null;
    }
    const result = {};
    for (const title of literals) {
      result[title.language ?? ""] = String(title.value);
    }
    return result;
  }
}
