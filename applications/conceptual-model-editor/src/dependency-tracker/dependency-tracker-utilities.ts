import { languageStringToStringNext } from "../utilities/string";

/**
 * @returns Return label, IRI, or identifier.
 */
export function effectiveLabel(
  languages: string[],
  value: {
    identifier: string,
    iri: string | null,
    label: LanguageString,
  }): string {
  if (value.label === null) {
    return value.iri ?? value.identifier;
  }
  const result = languageStringToStringNext(languages, value.label);
  if (result === "") {
    return value.iri ?? value.identifier;
  }
  return result;
}

type LanguageString = { [key: string]: string };
