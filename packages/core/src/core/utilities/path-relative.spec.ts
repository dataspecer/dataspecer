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

    //

    expect(pathRelative("/directory/file", "/Příliš žluťoučký kůň úpěl ďábelské ódy/🐎")).toBe("../Příliš žluťoučký kůň úpěl ďábelské ódy/🐎");
  });

  test("rfc3986#section-5.2: pathRelative and back to absolute", () => {
    const from = "http://a/b/c/d;p?q";

    expect(new URL(pathRelative(from, "g:h"), from).toString()).toBe("g:h");
    expect(new URL(pathRelative(from, "http://a/b/c/g"), from).toString()).toBe("http://a/b/c/g");
    expect(new URL(pathRelative(from, "http://a/b/c/g"), from).toString()).toBe("http://a/b/c/g");
    expect(new URL(pathRelative(from, "http://a/b/c/g/"), from).toString()).toBe("http://a/b/c/g/");
    expect(new URL(pathRelative(from, "http://a/g"), from).toString()).toBe("http://a/g");
    //expect(new URL(pathRelative(from, "http://g"), from).toString()).toBe("http://g");
    expect(new URL(pathRelative(from, "http://a/b/c/d;p?y"), from).toString()).toBe("http://a/b/c/d;p?y");
    expect(new URL(pathRelative(from, "http://a/b/c/g?y"), from).toString()).toBe("http://a/b/c/g?y");
    expect(new URL(pathRelative(from, "http://a/b/c/d;p?q#s"), from).toString()).toBe("http://a/b/c/d;p?q#s");
    expect(new URL(pathRelative(from, "http://a/b/c/g#s"), from).toString()).toBe("http://a/b/c/g#s");
    expect(new URL(pathRelative(from, "http://a/b/c/g?y#s"), from).toString()).toBe("http://a/b/c/g?y#s");
    expect(new URL(pathRelative(from, "http://a/b/c/;x"), from).toString()).toBe("http://a/b/c/;x");
    expect(new URL(pathRelative(from, "http://a/b/c/g;x"), from).toString()).toBe("http://a/b/c/g;x");
    expect(new URL(pathRelative(from, "http://a/b/c/g;x?y#s"), from).toString()).toBe("http://a/b/c/g;x?y#s");
    expect(new URL(pathRelative(from, "http://a/b/c/d;p?q"), from).toString()).toBe("http://a/b/c/d;p?q");
    expect(new URL(pathRelative(from, "http://a/b/c/"), from).toString()).toBe("http://a/b/c/");
    expect(new URL(pathRelative(from, "http://a/b/c/"), from).toString()).toBe("http://a/b/c/");
    expect(new URL(pathRelative(from, "http://a/b/"), from).toString()).toBe("http://a/b/");
    expect(new URL(pathRelative(from, "http://a/b/"), from).toString()).toBe("http://a/b/");
    expect(new URL(pathRelative(from, "http://a/b/g"), from).toString()).toBe("http://a/b/g");
    expect(new URL(pathRelative(from, "http://a/"), from).toString()).toBe("http://a/");
    expect(new URL(pathRelative(from, "http://a/"), from).toString()).toBe("http://a/");
    expect(new URL(pathRelative(from, "http://a/g"), from).toString()).toBe("http://a/g");
  });

});
