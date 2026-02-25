import { pathRelative } from "./path-relative.ts";

describe("pathRelative() util function", () => {
  test("absolute filesystem paths", () => {
    // Relative path from directory itself OR from index.html
    // This should behave the same

    expect(pathRelative("/a/b/c/", "/a/b/c/")).toBeOneOf(["", ".", "./"]);
    expect(pathRelative("/a/b/c/", "/a/b/")).toBeOneOf(["..", "../"]);
    expect(pathRelative("/a/b/c/", "/a/b/x")).toBe("../x");
    expect(pathRelative("/a/b/c/", "/a/b/c/x")).toBeOneOf(["./x", "x"]);
    expect(pathRelative("/a/b/c/", "/a/b/c/x/")).toBeOneOf(["./x/", "x/"]);

    expect(pathRelative("/a/b/c/index.html", "/a/b/c/")).toBeOneOf([".", "./"]); // Exception, missing ""
    expect(pathRelative("/a/b/c/index.html", "/a/b/")).toBeOneOf(["..", "../"]);
    expect(pathRelative("/a/b/c/index.html", "/a/b/x")).toBe("../x");
    expect(pathRelative("/a/b/c/index.html", "/a/b/c/x")).toBeOneOf(["./x", "x"]);
    expect(pathRelative("/a/b/c/index.html", "/a/b/c/x/")).toBeOneOf(["./x/", "x/"]);

    //

    expect(pathRelative("/a/b/c/index.html", "/a/b/c/index.html")).toBeOneOf(["", "./index.html", "index.html"]);

    //

    expect(pathRelative("/a/b/c/", "/a/b/c/?query")).toBeOneOf(["?query", "./?query"]);
    expect(pathRelative("/a/b/c", "/a/b/c?query")).toBeOneOf(["?query", "./c?query"]);

    expect(pathRelative("/a/b/c/", "/a/b/c/#hash")).toBeOneOf(["#hash", "./#hash"]);
    expect(pathRelative("/a/b/c", "/a/b/c#hash")).toBeOneOf(["#hash", "./c#hash"]);

    //

    expect(pathRelative("https://www.google.com/search?q=maps", "https://www.google.com/maps")).toBe("./maps");
  });
});
