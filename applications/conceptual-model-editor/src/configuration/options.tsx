import { DiagramOptions, EntityColor, LabelVisual, ProfileOfColor, ProfileOfVisual } from "../diagram/model";
import React, { useContext, useMemo, useState } from "react";

export enum Language {
  Czech = "cs",
  English = "en",
};

export const SupportedLanguages: [string, string][] = [
  [Language.Czech, "Čeština"],
  [Language.English, "English"]
];

/**
 * Runtime options that can be changed by the user.
 * Such change is expected to be reflected in the user interface.
 * As a result options are provided via React hook.
 */
export interface Options {

  /**
   * Selected data language.
   */
  language: Language;

  /**
   * Set language.
   */
  setLanguage: (language: Language) => void;

  /**
   * This is temporary!
   */
  visualOptions: VisualModelOptions;

  /**
   * This is temporary!
   */
  setVisualOptions: (next: VisualModelOptions) => void;

}

export interface VisualModelOptions {

  labelVisual: LabelVisual;

  entityMainColor: EntityColor;

  profileOfVisual: ProfileOfVisual;

  profileOfColor: ProfileOfColor;

  /**
   * Show range label using {@link labelVisual} and cardinality.
   */
  displayRangeDetail: boolean;

  /**
   * When true <<profile>> is shown for relationship profiles.
   */
  displayRelationshipProfileArchetype: boolean;

}

const OptionsContext = React.createContext<Options>(null as any);

export const OptionsContextProvider = (props: { children: React.ReactNode }) => {
  const [language, setLanguage] = useState(Language.English);
  const [visualOptions, setVisualOptions] = useState<VisualModelOptions>({
    entityMainColor: EntityColor.Entity,
    labelVisual: LabelVisual.Entity,
    profileOfVisual: ProfileOfVisual.Entity,
    profileOfColor: ProfileOfColor.None,
    displayRangeDetail: true,
    displayRelationshipProfileArchetype: false,
  });

  const context = useMemo(() => {
    return {
      language,
      setLanguage,
      visualOptions,
      setVisualOptions,
    };
  }, [language, setLanguage, visualOptions, setVisualOptions])

  return (
    <OptionsContext.Provider value={context}>
      {props.children}
    </OptionsContext.Provider>
  );
};

export const useOptions = (): Options => {
  return useContext(OptionsContext);
};
