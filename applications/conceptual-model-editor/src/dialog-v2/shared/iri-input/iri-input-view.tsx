import { IriInputPresenter } from "./iri-input-presenter";
import { IriInputState } from "./iri-input-state";

export function IriInput(props: {
  state: IriInputState,
  presenter: IriInputPresenter,
  /**
   * When true error validation is turned off and content is read only.
   */
  disabled?: boolean,
}) {
  return (
    <div className={`flex w-full flex-col ${props.disabled ? "opacity-50" : ""}`}>
      {renderSwitch(props)}
      {renderInput(props)}
    </div>
  )
}

const renderSwitch = (props: {
  state: IriInputState,
  presenter: IriInputPresenter,
  disabled?: boolean,
}) => {
  const isRelative = props.state.inputMode === "relative";
  // We also disable when there is no base.
  const disabled = props.disabled || props.state.base === null;
  return (
    <div>
      <button
        className={!isRelative ? "font-semibold" : ""}
        disabled={disabled}
        onClick={() => props.presenter.setInputMode("absolute")}
      >
        Absolute
      </button>
      <span className="mx-2">|</span>
      <button
        className={isRelative ? "font-semibold" : ""}
        disabled={disabled}
        onClick={() => props.presenter.setInputMode("relative")}
      >
        Relative
      </button>
    </div>
  )
}

const renderInput = (props: {
  state: IriInputState,
  presenter: IriInputPresenter,
  disabled?: boolean,
}) => {
  return (
    <div className="flex flex-col md:flex-row">
      {props.state.inputMode === "absolute" ? null : props.state.base}
      <input
        value={props.state.value}
        onChange={(event) => props.presenter.onChange(event.target.value)}
        disabled={props.disabled}
        className="flex-grow"
      />
    </div>
  )
}
