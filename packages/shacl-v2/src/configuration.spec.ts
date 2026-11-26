import { describe, expect, test } from "vitest";

import {
  DefaultShaclConfiguration,
  DefaultShaclFileKey,
  resolveShaclConfig,
  shaclConfig,
} from "./configuration.ts";

describe("resolveShaclConfig", () => {

  test("The default file checks the controlled vocabulary pattern but not the scheme.", () => {

    const defaults = DefaultShaclConfiguration.files[DefaultShaclFileKey]!;

    expect(defaults.controlledVocabularyPattern).toBe(true);
    expect(defaults.controlledVocabularyScheme).toBe(false);

  });

  test("A stored configuration without the controlled vocabulary options gets the defaults.", () => {

    // Configuration stored before the options existed.
    const stored = {
      files: {
        "": { languages: ["en"], noClassConstraints: true },
        "strict": { splitPropertyShapesByConstraints: true },
      },
    };

    const result = resolveShaclConfig([shaclConfig(stored)]);

    for (const file of Object.values(result.files)) {
      expect(file.controlledVocabularyPattern).toBe(true);
      expect(file.controlledVocabularyScheme).toBe(false);
    }
    // The stored options are kept.
    expect(result.files[""]!.languages).toStrictEqual(["en"]);
    expect(result.files[""]!.noClassConstraints).toBe(true);
    expect(result.files["strict"]!.splitPropertyShapesByConstraints).toBe(true);

  });

  test("Stored controlled vocabulary options override the defaults.", () => {

    const result = resolveShaclConfig([shaclConfig({
      files: {
        "": {
          controlledVocabularyPattern: false,
          controlledVocabularyScheme: true,
        },
      },
    })]);

    expect(result.files[""]!.controlledVocabularyPattern).toBe(false);
    expect(result.files[""]!.controlledVocabularyScheme).toBe(true);

  });

  test("A configuration without files results in the defaults.", () => {

    const result = resolveShaclConfig([]);

    expect(result).toStrictEqual(DefaultShaclConfiguration);

  });

  test("Later file maps replace earlier files and inherit the preceding default file.", () => {
    const first = shaclConfig({ files: {
      "": { languages: ["en"], noClassConstraints: true },
      removed: { controlledVocabularyPattern: false },
    } });
    const result = resolveShaclConfig([first, shaclConfig({ files: {
      strict: { controlledVocabularyScheme: true },
    } })]);
    expect(Object.keys(result.files)).toEqual(["strict"]);
    expect(result.files.strict).toMatchObject({
      languages: ["en"], noClassConstraints: true,
      controlledVocabularyPattern: true, controlledVocabularyScheme: true,
    });
    expect(first["shacl-v2"].files).toHaveProperty("removed");
    expect(resolveShaclConfig([shaclConfig({ files: {} })]).files).toEqual({});
  });

});
