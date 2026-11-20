import { describe, expect, test } from "vitest"
import { getSource, sourceDescriptors } from "./registry"

describe("sourceDescriptors", () => {
  test("have unique ids", () => {
    const ids = sourceDescriptors.map((source) => source.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  test("have a usable source exactly when they are available", () => {
    for (const descriptor of sourceDescriptors) {
      expect(getSource(descriptor.id) !== undefined).toBe(descriptor.available)
    }
  })

  test("name every source in English and Czech", () => {
    for (const source of sourceDescriptors) {
      expect(source.name.en).toBeTruthy()
      expect(source.name.cs).toBeTruthy()
    }
  })
})
