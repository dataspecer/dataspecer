import { safeAsciiFileName, safeUnicodeFileName } from "./safe-file-name.ts";

test("absolute filesystem paths", () => {
  expect(safeAsciiFileName("Příliš / žluťoučký : kůň ( úpěl ❤️ ďábelské ódy.txt", "default.txt")).toBe("Prilis zlutoucky kun upel dabelske ody.txt");
  expect(safeUnicodeFileName("Příliš / žluťoučký : kůň ( úpěl ❤️ ďábelské ódy.txt", "default.txt")).toBe("Příliš žluťoučký kůň ( úpěl ❤️ ďábelské ódy.txt");
});