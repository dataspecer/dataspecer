import { describe, expect, test } from "vitest";
import { LayoutOptions } from "elkjs";
import {
  configToElkConfigSpecialCasesConvertor,
  modifyElkDataObject,
} from "./elk-utils.ts";

describe("elk-utils", () => {
  test("returns special interactive config for supported algorithm", () => {
    expect(configToElkConfigSpecialCasesConvertor("elk_layered", "interactive", true)).toEqual({
      "crossingMinimization.strategy": "INTERACTIVE",
      "crossingCounterNodeInfluence": "0",
      "cycleBreaking.strategy": "INTERACTIVE",
    });
  });

  test("returns null for unsupported special conversion input", () => {
    expect(configToElkConfigSpecialCasesConvertor("elk_layered", "interactive", false)).toBeNull();
    expect(configToElkConfigSpecialCasesConvertor("elk_layered", "in_layer_gap", 10)).toBeNull();
  });

  test("modifyElkDataObject maps config, applies special cases and stringifies advanced settings", () => {
    const elkData: LayoutOptions = {};

    modifyElkDataObject({
      layout_alg: "elk_force",
      layer_gap: 42,
      in_layer_gap: 5,
      interactive: true,
      advanced_settings: {
        "spacing.componentComponent": 123,
        "layoutHierarchy": true,
      },
    }, elkData);

    expect(elkData).toEqual({
      "elk.algorithm": "force",
      "spacing.nodeNodeBetweenLayers": 42,
      "spacing.nodeNode": 5,
      "spacing.edgeNode": 5,
      "interactive": "true",
      "spacing.componentComponent": "123",
      "layoutHierarchy": "true",
    });
  });

  test("modifyElkDataObject ignores empty advanced settings", () => {
    const elkData: LayoutOptions = {};

    modifyElkDataObject({
      layout_alg: "elk_layered",
      advanced_settings: {},
    }, elkData);

    expect(elkData).toEqual({
      "elk.algorithm": "layered",
    });
  });
});
