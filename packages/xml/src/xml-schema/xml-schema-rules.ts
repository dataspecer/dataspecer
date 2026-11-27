import type { StructureModelClass } from "@dataspecer/generators/structure-model/model";
import { getControlledVocabularyRules, rulesWithPattern } from "@dataspecer/generators/structure-model/helper/controlled-vocabulary-rules";

/**
 * Rule on the IRI of a value, with the pattern converted to the regular
 * expression of XML Schema.
 */
export interface XmlSchemaPatternRule {
  /**
   * Pattern for xs:pattern. XML Schema matches the whole value, so the pattern is not anchored.
   * To use it in XPath (for example in an assert) anchor it as `^(pattern)$`.
   */
  pattern: string;

  /**
   * Pattern as it was entered, either the regex of the class or the pattern of the controlled vocabulary.
   */
  sourcePattern: string;

  /**
   * Controlled vocabulary the pattern comes from, null for the regex of the class.
   */
  vocabularyId: string | null;
}

/**
 * Rule that XML Schema cannot express, so it is not part of the schema.
 */
export interface SkippedPatternRule {
  sourcePattern: string;

  vocabularyId: string | null;

  reason: string;
}

export interface XmlSchemaRules {
  /**
   * Every value must match the pattern. The regex of the class comes first,
   * the controlled vocabulary rules follow.
   */
  everyValue: XmlSchemaPatternRule[];

  /**
   * At least one value must match the pattern.
   */
  atLeastOne: XmlSchemaPatternRule[];

  /**
   * Rules that were left out because the pattern cannot be converted.
   */
  skipped: SkippedPatternRule[];
}

export type PatternConversion = { pattern: string } | { unsupportedReason: string };

/**
 * Escaped characters that XML Schema regular expressions accept.
 */
const XSD_ESCAPED_CHARACTERS = "\\|.-^?*+{}()[]";

const QUANTIFIER_IN_BRACES = /\{\d+(,\d*)?\}/y;

/**
 * Converts a regular expression written for ECMAScript to the regular expression of XML Schema (xs:pattern).
 *
 * The two differ in several ways, and the conversion keeps the meaning:
 * - ECMAScript finds the pattern anywhere in the value unless it is anchored by
 *   ^ and $, XML Schema always matches the whole value and takes ^ and $ as
 *   ordinary characters. The anchors are removed, and a side that is not
 *   anchored gets `.*` instead. Each alternative of a top level `|` is
 *   handled on its own.
 * - `\d` and `\w` are written as `[0-9]` and `[A-Za-z0-9_]`, as in XML Schema
 *   they stand for more characters.
 * - `(?:` becomes `(`, because groups of XML Schema do not capture. 
 *   A backslash before a character that is not escaped in XML Schema,
 *   such as `\/`, is dropped.
 *
 * What XML Schema cannot express is reported as unsupported: lookaround and
 * other `(?` groups, back references, lazy quantifiers, `\b`, `\u`, `\x` and
 * other escapes without an equivalent, anchors that are not at the edge of an
 * alternative, and `\D`, `\W` in a character class. `\s` is kept,
 * but XML Schema takes fewer characters as white space.
 */
export function convertPatternToXsd(source: string): PatternConversion {
  const alternatives: string[] = [];

  let current = "";
  let anchoredStart = false;
  let anchoredEnd = false;
  let depth = 0;
  let inClass = false;
  let atClassStart = false;
  // The last thing written in the character class is a hyphen that is not at its start.
  let rangeDashPending = false;

  const unsupported = (reason: string): PatternConversion => ({ unsupportedReason: reason });
  const finishAlternative = () => {
    alternatives.push((anchoredStart ? "" : ".*") + current + (anchoredEnd ? "" : ".*"));
    current = "";
    anchoredStart = false;
    anchoredEnd = false;
  };

  for (let i = 0; i < source.length; i++) {
    const char = source[i]!;
    const isAlternativeSeparator = char === "|" && depth === 0 && !inClass;

    if (anchoredEnd && !isAlternativeSeparator) {
      return unsupported("the anchor $ is not at the end of the pattern");
    }

    if (char === "\\") {
      const escaped = source[++i];
      if (escaped === undefined) {
        return unsupported("the pattern ends with a backslash");
      }
      if (escaped >= "0" && escaped <= "9") {
        return unsupported("back references are not supported");
      }
      // A hyphen next to a set of characters (\d, \w, ...) is a literal hyphen in ECMAScript.
      // In XML Schema it would be taken as a range, so it is escaped.
      const isSetInClass = inClass && "dwsSpP".includes(escaped);
      if (isSetInClass && rangeDashPending) {
        current = `${current.slice(0, -1)}\\-`;
      }
      if (escaped === "d") {
        current += inClass ? "0-9" : "[0-9]";
      } else if (escaped === "w") {
        current += inClass ? "A-Za-z0-9_" : "[A-Za-z0-9_]";
      } else if (escaped === "D" || escaped === "W") {
        if (inClass) {
          return unsupported(`\\${escaped} in a character class is not supported`);
        }
        current += escaped === "D" ? "[^0-9]" : "[^A-Za-z0-9_]";
      } else if (escaped === "p" || escaped === "P") {
        const end = source.indexOf("}", i);
        if (source[i + 1] !== "{" || end === -1) {
          return unsupported(`the escape \\${escaped} needs a property in braces`);
        }
        current += `\\${escaped}${source.slice(i + 1, end + 1)}`;
        i = end;
      } else if ("nrtsS".includes(escaped)) {
        current += `\\${escaped}`;
      } else if (/[A-Za-z]/.test(escaped)) {
        return unsupported(`the escape \\${escaped} is not supported`);
      } else {
        current += XSD_ESCAPED_CHARACTERS.includes(escaped) ? `\\${escaped}` : escaped;
      }
      if (isSetInClass && source[i + 1] === "-" && source[i + 2] !== "]") {
        current += "\\-";
        i++;
      }
      atClassStart = false;
      rangeDashPending = false;
      continue;
    }

    if (inClass) {
      if (char === "]") {
        if (atClassStart) {
          return unsupported("an empty character class is not supported");
        }
        inClass = false;
      } else if (char === "[") {
        return unsupported("[ inside of a character class is not supported");
      }
      rangeDashPending = char === "-" && !atClassStart;
      current += char;
      atClassStart = false;
      continue;
    }

    switch (char) {
      case "[":
        inClass = true;
        atClassStart = true;
        current += char;
        if (source[i + 1] === "^") {
          current += "^";
          i++;
        }
        break;
      case "(":
        depth++;
        if (source[i + 1] === "?") {
          if (source[i + 2] !== ":") {
            return unsupported("groups starting with (? other than (?: are not supported");
          }
          i += 2;
        }
        current += "(";
        break;
      case ")":
        if (--depth < 0) {
          return unsupported("the parentheses do not match");
        }
        current += char;
        break;
      case "|":
        if (depth === 0) {
          finishAlternative();
        } else {
          current += char;
        }
        break;
      case "^":
        if (depth > 0 || current !== "" || anchoredStart) {
          return unsupported("the anchor ^ is not at the start of the pattern");
        }
        anchoredStart = true;
        break;
      case "$":
        if (depth > 0) {
          return unsupported("the anchor $ is not at the end of the pattern");
        }
        anchoredEnd = true;
        break;
      case "{": {
        QUANTIFIER_IN_BRACES.lastIndex = i;
        const quantifier = QUANTIFIER_IN_BRACES.exec(source);
        if (quantifier === null) {
          current += "\\{";
          break;
        }
        current += quantifier[0];
        i += quantifier[0].length - 1;
        if (source[i + 1] === "?") {
          return unsupported("lazy quantifiers are not supported");
        }
        break;
      }
      case "}":
        current += "\\}";
        break;
      case "*":
      case "+":
      case "?":
        current += char;
        if (source[i + 1] === "?") {
          return unsupported("lazy quantifiers are not supported");
        }
        break;
      default:
        current += char;
    }
  }

  if (inClass) {
    return unsupported("a character class is not closed");
  }
  if (depth !== 0) {
    return unsupported("the parentheses do not match");
  }
  finishAlternative();

  return { pattern: alternatives.join("|") };
}

/**
 * Collects the rules on the IRI of a value of the class: the regex entered for
 * the class and the rules of the assigned controlled vocabularies.
 * A pattern that cannot be converted is reported in `skipped`.
 */
export function getXmlSchemaRules(
  structureClass: Pick<StructureModelClass,
    "regex" | "controlledVocabularies" | "requireRecommendedControlledVocabularyValue" | "restrictToRecommendedControlledVocabulary">,
): XmlSchemaRules {
  const controlledVocabularyRules = getControlledVocabularyRules(structureClass);
  const result: XmlSchemaRules = { everyValue: [], atLeastOne: [], skipped: [] };

  const add = (target: XmlSchemaPatternRule[], sourcePattern: string, vocabularyId: string | null) => {
    if (target.some((rule) => rule.sourcePattern === sourcePattern)) {
      return;
    }
    const conversion = convertPatternToXsd(sourcePattern);
    if ("unsupportedReason" in conversion) {
      if (!result.skipped.some((rule) => rule.sourcePattern === sourcePattern && rule.vocabularyId === vocabularyId)) {
        result.skipped.push({ sourcePattern, vocabularyId, reason: conversion.unsupportedReason });
      }
    } else {
      target.push({ pattern: conversion.pattern, sourcePattern, vocabularyId });
    }
  };

  if (structureClass.regex) {
    add(result.everyValue, structureClass.regex, null);
  }
  for (const rule of rulesWithPattern(controlledVocabularyRules.everyValue)) {
    add(result.everyValue, rule.pattern, rule.vocabularyId);
  }
  for (const rule of rulesWithPattern(controlledVocabularyRules.atLeastOne)) {
    add(result.atLeastOne, rule.pattern, rule.vocabularyId);
  }
  return result;
}
