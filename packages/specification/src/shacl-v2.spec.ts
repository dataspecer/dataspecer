import { describe, expect, test } from "vitest";

import {
  DefaultShaclConfiguration,
  DefaultShaclFileKey,
  ShaclV2Configurator,
} from "./shacl-v2.ts";

describe("ShaclV2Configurator.merge", () => {

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

    const result = ShaclV2Configurator.merge(DefaultShaclConfiguration, stored);

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

    const result = ShaclV2Configurator.merge(DefaultShaclConfiguration, {
      files: {
        "": {
          controlledVocabularyPattern: false,
          controlledVocabularyScheme: true,
        },
      },
    });

    expect(result.files[""]!.controlledVocabularyPattern).toBe(false);
    expect(result.files[""]!.controlledVocabularyScheme).toBe(true);

  });

  test("A configuration without files results in the defaults.", () => {

    const result = ShaclV2Configurator.merge(DefaultShaclConfiguration, {});

    expect(result).toStrictEqual(DefaultShaclConfiguration);

  });

});
