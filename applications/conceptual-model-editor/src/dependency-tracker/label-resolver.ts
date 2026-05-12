import { languageStringToStringNext } from "../utilities/string";

export function createLabelResolver(
  prefixes: {[iri: string]: string},
  languages: string[],
): LabelResolver {
  return new DefaultLabelResolver(prefixes, languages);
}

export interface LabelResolver {

  /**
   * @returns Label to use for given entity.
   */
  resolveLabel(entity: LabelResolverEntity): string;

}

interface LabelResolverEntity {
  identifier: string,
  iri: string | null,
  label: LanguageString,
}

type LanguageString = { [key: string]: string };

class DefaultLabelResolver implements LabelResolver {

  readonly prefixes: {[iri: string]: string};

  readonly languages: string[];

  constructor(prefixes: {[iri: string]: string}, languages: string[]) {
    this.prefixes = prefixes;
    this.languages = languages;
  }

  resolveLabel(entity: LabelResolverEntity): string {
    if (entity.label === null) {
      return this.resolveIri(entity.iri) ?? entity.identifier;
    }
    const result = languageStringToStringNext(this.languages, entity.label);
    if (result === "") {
      return this.resolveIri(entity.iri) ?? entity.identifier;
    }
    return result;
  }

  resolveIri(iri: string | null) : string | null {
    if (iri === null) {
      return null;
    }
    for (const [prefix, name] of Object.entries(this.prefixes)) {
      if (iri.startsWith(prefix)) {
        return name + ":" + iri.substring(prefix.length);
      }
    }
    return iri;
  }

}
