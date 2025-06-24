import { t } from "../../application";

/**
 * IRI input component for absolute IRI only.
 */
export const InputAbsoluteIri = (props: {
  value: string,
  onChange: (value: string) => void,
  disabled?: boolean,
}) => {
  const validation = validateUrl(props.value);
  return (
    <div className={`flex w-full flex-col ${props.disabled ? "opacity-50" : ""}`}>
      {renderInput(props)}
      {renderErrorMessage(validation)}
    </div>
  )
};

const validateUrl = (value: string): null | string => {
  if (value.includes(" ")) {
    return t("input-iri.validate.space");
  }
  return null;
}

const renderInput = (props: {
  value: string,
  onChange: (value: string) => void,
  disabled?: boolean,
}) => {
  return (
    <div className="flex flex-col md:flex-row">
      <input
        value={props.value}
        onChange={(event) => props.onChange(event.target.value)}
        disabled={props.disabled}
        className="flex-grow"
      />
    </div>
  )
}

const renderErrorMessage = (message: null | string) => {
  if (message === null) {
    return null;
  }
  return (
    <div>
      <p className="text-red-500">{message}</p>
    </div>
  )
};

/**
 * IRI input component with support for relative and absolute IRI.
 */
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
      {renderSwitch(props)}
      {renderInput(props)}
      {renderErrorMessage(validation)}
    </div>
  )
};

const renderSwitch = (props: {
  isRelative: boolean,
  setIsRelative: (value: boolean) => void,
  disabled?: boolean,
}) => {
  return (
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
  )
}
