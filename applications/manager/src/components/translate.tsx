import { LanguageString } from "@dataspecer/core/core/core-resource";
import { useTranslation } from "react-i18next";

/**
 * Translates language string.
 * @param props
 */
export function Translate(props: {
  text: LanguageString | null | false | undefined,
  match?: (translation: string, isMatch: boolean, language: string) => React.ReactNode,
  fallback?: React.ReactNode,
}) {
  const {i18n} = useTranslation();
  const match = props.match || (t => t);

  if (!props.text || Object.keys(props.text).length === 0) return props.fallback || null;
  if (props.text[i18n.language]) return match(props.text[i18n.language], true, i18n.language);
  const matchedLang = Object.keys(props.text)[0]!;
  return match(props.text[matchedLang], false, matchedLang);
}
