
export interface IriInputState {

  /**
   * Absolute URL to edit.
   */
  value: string;

  /**
   * Base IRI used for relative input.
   * When null only absolute IRI can be entered.
   */
  base: string | null;

  /**
   * Input mode.
   */
  inputMode: "absolute" | "relative";

}

export function createIriInputState(
  base: string | null,
  iri: string,
): IriInputState {
  if (base === null) {
    return {
      base,
      inputMode: "absolute",
      value: iri,
    }
  }
  const prefixed = iri.startsWith(base);
  if (prefixed) {
    return {
      base,
      inputMode: "relative",
      value: iri.substring(base.length),
    }
  } else {
    return {
      base,
      inputMode: "absolute",
      value: iri,
    }
  }
}

export function iriInputStateAsIri(state: IriInputState): string {
  switch(state.inputMode) {
    case "absolute":
      return state.value;
    case "relative":
      return state.base + state.value;
  }
}
