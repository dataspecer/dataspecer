import { describe, expect, test } from "vitest"
import { isWizardScreenAvailable } from "./use-source-wizard"

describe("isWizardScreenAvailable", () => {
  test("lets the screens before the choice of the source be shown without it", () => {
    for (const screen of ["list", "source-selection", "form-empty", "view"] as const) {
      expect(isWizardScreenAvailable(screen, { sourceId: null })).toBe(true)
    }
  })

  test("does not show the screens after the choice of the source without it", () => {
    for (const screen of ["search", "distribution", "form-prefilled"] as const) {
      expect(isWizardScreenAvailable(screen, { sourceId: null })).toBe(false)
    }
  })

  test("shows the screens after the choice of the source with it", () => {
    for (const screen of ["search", "distribution", "form-prefilled"] as const) {
      expect(isWizardScreenAvailable(screen, { sourceId: "nkod" })).toBe(true)
    }
  })
})
