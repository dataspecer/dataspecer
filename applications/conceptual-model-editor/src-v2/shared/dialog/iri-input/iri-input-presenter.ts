import { IriInputState } from "./iri-input-state";

export function createIriInputPresenter(
  setState: (next: (state: IriInputState)
    => IriInputState) => void,
): IriInputPresenter {
  return {
    onChange(value) {
      setState(state => ({ ...state, value }));
    },
    setInputMode(value) {
      setState(state => {
        if (state.inputMode === value) {
          return state;
        }
        switch (value) {
          case "absolute":
            return {
              ...state,
              inputMode: "absolute",
              value: state.base + state.value,
            };
          case "relative":
            if (state.base === null) {
              // This action is not available.
              console.error(
                "Invalid action ignored!"
                + "Can not change to relative IRI without a base.");
              return state;
            }
            return {
              ...state,
              inputMode: "relative",
              value: state.value.startsWith(state.base) ?
                state.value.substring(state.base.length) :
                state.value,
            };
          default:
            return state;
        }
      });
    },
  }
}

export interface IriInputPresenter {

  onChange: (value: string) => void;

  setInputMode(value: "absolute" | "relative"): void;

}
