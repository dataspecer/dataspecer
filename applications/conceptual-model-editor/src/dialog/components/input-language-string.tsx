import { useCallback, useEffect, useState } from "react";

import type { LanguageString } from "@dataspecer/core-v2/semantic-model/concepts";

import { getAvailableLanguagesForLanguageString } from "../../util/language-utils";

export const InputLanguageString = (props: {
  value: LanguageString,
  defaultLanguage: string,
  inputType: "text" | "textarea",
  disabled?: boolean,
  className?: string,
  autoFocus?: boolean,
  onChange: (setter: (previous: LanguageString) => LanguageString) => void,
}) => {

  // Available languages.
  const languages = getAvailableLanguagesForLanguageString(props.value);

  // Current language.
  const [activeLanguage, setActiveLanguage] = useState(props.defaultLanguage);

  // Select current value from the language string.
  const value = props.value[activeLanguage] ?? "";

  // Callback ref for focusing the input when autoFocus is true
  const handleRef = useCallback((element: HTMLInputElement | HTMLTextAreaElement | null) => {
    if (props.autoFocus && element) {
      element.focus();
    }
  }, [props.autoFocus]);

  // In this hook we make sure that selected language is one of the available ones.
  // For example when user deleted language it will change it to next one.
  useEffect(() => {
    if (languages.includes(activeLanguage)) {
      // Active language is part of the language list.
      return;
    }
    if (languages.length === 0) {
      // There is no value, we keep the active language as
      // so it is used when user types something.
      return;
    }
    setActiveLanguage(languages.at(0)!);
  }, [languages, activeLanguage]);

  const onChange = (event: { target: { value: string } }) => {
    props.onChange((previous) => ({
      ...previous,
      [activeLanguage]: event.target.value,
    }));
  };

  // Add given language.
  const onAddLanguage = (language: string) => {
    props.onChange((previous) => ({
      ...previous,
      [language]: "",
    }));
    // Update current language.
    setActiveLanguage(language);
  };

  // Remove active language.
  const onDeleteLanguage = () => {
    props.onChange((previous) =>
      Object.fromEntries(Object.entries(previous)
        .filter(([language]) => language !== activeLanguage)));
  };

  return (
    <div className={props.className}>
      <ul className="flex flex-row text-base [&>*]:mx-1">
        {languages
          .map((language, index) => (
            <Item
              key={language + index.toString()}
              label={language}
              onClick={() => setActiveLanguage(language)}
              onDelete={onDeleteLanguage}
              selected={language === activeLanguage}
              disabled={props.disabled}
            />
          ))}
        {props.disabled ? null : <AddItem
          defaultValue={props.defaultLanguage}
          onSubmit={onAddLanguage}
        />}
      </ul>
      {props.inputType === "text" ? (
        <input
          ref={handleRef}
          disabled={props.disabled}
          type="text"
          className="w-full"
          value={value}
          onChange={onChange}
        />
      ) : (
        <textarea
          ref={handleRef}
          disabled={props.disabled}
          value={value}
          className="w-full"
          onChange={onChange}
        />
      )}
    </div>
  );
};

function Item(props: {
  label: string,
  selected?: boolean,
  disabled?: boolean,
  onClick: () => void,
  onDelete: () => void,
}) {
  const { label, selected, disabled } = props;
  const sanitizedLabel = label === "" ? "undefined" : label;
  return (
    <li onClick={props.onClick} className={selected ? "font-bold" : ""}>
      {!selected || disabled ? null : (
        <button disabled={disabled} className="text-xs" onClick={props.onDelete}>
          🗑
        </button>
      )}
      &nbsp; {sanitizedLabel}
    </li>
  );
};

/**
 * The input item
 */
function AddItem(props: {
  defaultValue: string,
  disabled?: boolean,
  onSubmit: (value: string) => void,
}
) {
  const [active, setActive] = useState(false);
  const [value, setValue] = useState(props.defaultValue);

  const onActivate = () => {
    setActive(true);
  };

  const onSubmit = () => {
    if (value.trim() === "") {
      // We do not allow an empty string as a language.
      return;
    }
    setActive(false);
    setValue(props.defaultValue);
    props.onSubmit(value);
  };

  const onCancel = () => {
    setActive(false);
  };

  const onKeyUp = (event: React.KeyboardEvent<HTMLInputElement>) => {
    switch (event.key) {
    case "Enter":
      onSubmit();
      event.stopPropagation();
      return;
    case "Escape":
      onCancel();
      event.stopPropagation();
      return;
    default:
      return;
    }
  }

  if (active === false) {
    // It is not active.
    return (
      <li onClick={onActivate} >
        ➕
      </li>
    );
  }

  return (
    <li>
      ➕ &nbsp;
      <input
        disabled={props.disabled}
        autoFocus
        value={value}
        size={4}
        onFocus={(event) => event.target.select()}
        onChange={(event) => setValue(event.target.value)}
        onBlur={onCancel}
        onKeyUp={(event) => onKeyUp(event)}
      />
    </li>
  );
};