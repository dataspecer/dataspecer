import { describe, expect, test } from "vitest"
import { pageCount, pageItems } from "./paging"

describe("pageItems", () => {
  const items = [1, 2, 3, 4, 5]

  test("cuts the page, which is zero-based", () => {
    expect(pageItems(items, 0, 2)).toEqual([1, 2])
    expect(pageItems(items, 2, 2)).toEqual([5])
  })

  test("gives nothing past the end", () => {
    expect(pageItems(items, 3, 2)).toEqual([])
  })
})

describe("pageCount", () => {
  test("counts the pages, an empty listing has one", () => {
    expect(pageCount(0, 20)).toBe(1)
    expect(pageCount(20, 20)).toBe(1)
    expect(pageCount(21, 20)).toBe(2)
  })
})
