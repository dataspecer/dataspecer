import {t} from "../../application";

export const InputIri = (props: {
  iriPrefix: string,
  isRelative: boolean,
  setIsRelative: (value: boolean) => void,
  value: string,
  onChange: (value: string) => void,
  disabled?: boolean,
}) => {
  const validation = validateUrl(props.value);
  return (
    <div className={`flex w-full flex-col ${props.disabled ? "opacity-50" : ""}`}>
      {/* Switch. */}
      <div>
        <button
          className={!props.isRelative ? "font-semibold" : ""}
          disabled={props.disabled}
          onClick={() => props.setIsRelative(false)}
        >
          Absolute
        </button>
        <span className="mx-2">|</span>
        <button
          className={props.isRelative ? "font-semibold" : ""}
          disabled={props.disabled}
          onClick={() => props.setIsRelative(true)}
        >
          Relative
        </button>
      </div>
      {/* Text input. */}
      <div className="flex flex-col md:flex-row">
        {props.isRelative ? <div className="text-nowrap">{props.iriPrefix}</div> : null}
        <input
          value={props.value}
          onChange={(event) => props.onChange(event.target.value)}
          disabled={props.disabled}
          className="flex-grow"
        />
      </div>
      {validation === null ? null :
        <div>
          <p className="text-red-500">{validation}</p>
        </div>
      }
    </div>
  )
};

const validateUrl = (value: string) : null | string => {
  if (value.includes(" ")) {
    return t("input-iri.validate.space");
  }
  return null;
}
