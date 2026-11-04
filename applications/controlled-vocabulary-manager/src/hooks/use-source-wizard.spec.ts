import { describe, expect, test } from "vitest"
import type { VocabularyMetadata } from "@/sources/types"
import { isWizardScreenAvailable, searchBackStep, type WizardState } from "./use-source-wizard"

const empty: WizardState = { sourceId: null, groupsPage: 0, group: null, query: "", candidatesPage: 0, candidate: null, metadata: null }
const candidate = { id: "c", title: {}, groupLabel: {} }
const metadata = { metadata: {} as VocabularyMetadata, warnings: [], sampleIris: [] }

describe("isWizardScreenAvailable", () => {
  test("lets the screens before the choice of the source be shown without it", () => {
    for (const screen of ["list", "source-selection", "form-empty", "view"] as const) {
      expect(isWizardScreenAvailable(screen, empty)).toBe(true)
    }
  })

  test("shows the search only with a source", () => {
    expect(isWizardScreenAvailable("search", empty)).toBe(false)
    expect(isWizardScreenAvailable("search", { ...empty, sourceId: "nkod" })).toBe(true)
  })

  test("shows the choice of the distribution only with a chosen vocabulary", () => {
    expect(isWizardScreenAvailable("distribution", { ...empty, sourceId: "nkod" })).toBe(false)
    expect(isWizardScreenAvailable("distribution", { ...empty, sourceId: "nkod", candidate })).toBe(true)
  })

  test("shows the prefilled form only with the metadata read", () => {
    expect(isWizardScreenAvailable("form-prefilled", { ...empty, sourceId: "nkod", candidate })).toBe(false)
    expect(isWizardScreenAvailable("form-prefilled", { ...empty, sourceId: "nkod", candidate, metadata })).toBe(true)
  })
})

describe("searchBackStep", () => {
  const group = { id: "g", label: {}, count: 1 }

  test("goes back to the choice of the source from the list of groups", () => {
    expect(searchBackStep({ ...empty, sourceId: "nkod" })).toBe("source")
  })

  test("goes back to the list of groups from the vocabularies of a group", () => {
    expect(searchBackStep({ ...empty, sourceId: "nkod", group })).toBe("all-groups")
  })

  test("clears the search first, whether or not a group is chosen", () => {
    expect(searchBackStep({ ...empty, sourceId: "nkod", query: "pohl" })).toBe("clear-search")
    expect(searchBackStep({ ...empty, sourceId: "nkod", group, query: "pohl" })).toBe("clear-search")
  })
})
