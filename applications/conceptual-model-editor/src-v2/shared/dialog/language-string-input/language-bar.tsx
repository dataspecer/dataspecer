import { useState } from "react";
import { LanguageStringInputState } from "./language-string-input-state";

export function LanguageBar(props: {
  state: LanguageStringInputState,
  onSelect: (language: string) => void,
  onAddLanguage: (language: string) => void,
  onRemoveLanguage: (language: string) => void,
  disabled?: boolean,
}) {
  const { state } = props;
  return (
    <ul className="flex text-base [&>*]:mx-1 h-[2em]">
      {state.values.map((value, index) => (
        <LanguageItem
          key={value.language}
          value={value.language}
          onSelect={props.onSelect}
          onRemoveLanguage={props.onRemoveLanguage}
          selected={state.active === index}
          disabled={props.disabled}
        />
      ))}
      {props.disabled ? null : <NewLanguageItem
        value={state.defaultLanguage}
        onAddLanguage={props.onAddLanguage}
      />}
    </ul>
  )
}

function LanguageItem(props: {
  value: string,
  selected: boolean,
  onSelect: (language: string) => void,
  onRemoveLanguage: (language: string) => void,
  disabled?: boolean,
}) {
  const label = props.value === "" ? "\"\"" : props.value;
  return (
    <li
      className={props.selected ? "font-bold" : ""}
      onClick={() => props.onSelect(props.value)}
    >
      {props.selected && !props.disabled ? (
        <button onClick={(event) => {
          props.onRemoveLanguage(props.value)
          event.stopPropagation();
        }}>🗑</button>
      ) : null}
      {label}
    </li>
  )
}

function NewLanguageItem(props: {
  value: string,
  onAddLanguage: (language: string) => void,
}) {
  const [active, setActive] = useState(false);
  const [value, setValue] = useState(props.value);

  const onKeyUp = (event: React.KeyboardEvent<HTMLInputElement>) => {
    switch (event.key) {
      case "Enter":
        onSubmit();
        event.stopPropagation();
        return;
      case "Escape":
        setActive(false);
        event.stopPropagation();
        return;
      default:
        return;
    }
  };

  const onSubmit = () => {
    if (value.trim() === "") {
      return;
    }
    setActive(false);
    setValue(props.value);
    props.onAddLanguage(value);
  };

  if (active) {
    return (
      <li>
        ➕ &nbsp;
        <input
          autoFocus
          value={value}
          size={4}
          onFocus={(event) => event.target.select()}
          onChange={(event) => setValue(event.target.value)}
          onBlur={() => setActive(false)}
          onKeyUp={(event) => onKeyUp(event)}
        />
      </li>
    )
  } else {
    return (
      <li onClick={() => setActive(true)} >
        ➕
      </li>
    );
  }

}
