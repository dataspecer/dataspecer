import { SelectCardinalityPresenter } from "./select-cardinality-presenter";
import { SelectCardinalityState } from "./select-cardinality-state";

export function SelectCardinality(props: {
  state: SelectCardinalityState,
  presenter: SelectCardinalityPresenter,
  /**
   * When true render in read only mode.
   */
  disabled?: boolean,
}) {
  return (
    <fieldset className="flex flex-grow flex-row">
      <label className="ml-1 mr-3 font-mono">
        <input
          type="radio"
          onChange={() => props.presenter.onChange("0x")}
          checked={props.state.value === "0x"}
          disabled={props.disabled}
          className="mr-1"
        />
        0..*
      </label>
      <label className="ml-1 mr-3 font-mono">
        <input
          type="radio"
          onChange={() => props.presenter.onChange("01")}
          checked={props.state.value === "01"}
          disabled={props.disabled}
          className="mr-1"
        />
        0..1
      </label>
      <label className="ml-1 mr-3 font-mono">
        <input
          type="radio"
          onChange={() => props.presenter.onChange("1x")}
          checked={props.state.value === "1x"}
          disabled={props.disabled}
          className="mr-1"
        />
        1..x
      </label>
      <label className="ml-1 mr-3 font-mono">
        <input
          type="radio"
          onChange={() => props.presenter.onChange("11")}
          checked={props.state.value === "11"}
          disabled={props.disabled}
          className="mr-1"
        />
        1..1
      </label>
    </fieldset>
  )
}
