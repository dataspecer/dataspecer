
export type LanguageString = { [language: string]: string };

export interface RdfBuilder<NodeType, PredicateType, NamedNode, Quad> {

  addType(
    subject: string,
    type: NodeType,
  ): this;

  addIris(
    subject: string,
    predicate: PredicateType,
    values: string[],
  ): this;

  addIri(
    subject: string,
    predicate: PredicateType,
    value: NamedNode | string | null,
  ): this;

  addLanguageString(
    subject: string,
    predicate: PredicateType,
    string: LanguageString | null,
  ): void;

  addLiteral(
    subject: string,
    predicate: PredicateType,
    object: boolean | number | null,
  ): void;

  asQuads(): Quad[];

}
