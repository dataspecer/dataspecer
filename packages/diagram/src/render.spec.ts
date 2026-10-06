import { describe, expect, it, vi } from "vitest";
import { DOMParser } from "@xmldom/xmldom";
import type { EntityRecord } from "@dataspecer/core/entity-model";
import { createColorGenerator, type VisualNode, type VisualRelationship, type VisualModelData } from "@dataspecer/visual-model";
import { generateVisualModelSvg, type SvgLinkContext, type SvgRenderOptions } from "./index.ts";
import { diagramFixture, classEntity, edge, node, relationship } from "./__fixtures__/diagram.ts";

function render(options: SvgRenderOptions = {}) {
  const { visual, models } = diagramFixture();
  return generateVisualModelSvg(visual, models, options);
}

function parse(svg: string) {
  const errors: string[] = [];
  const document = new DOMParser({ errorHandler: {
    warning: message => errors.push(message), error: message => errors.push(message), fatalError: message => errors.push(message),
  } }).parseFromString(svg, "image/svg+xml");
  expect(errors).toEqual([]);
  expect(document.documentElement.namespaceURI).toBe("http://www.w3.org/2000/svg");
  return document;
}

function elements(svg: string, name: string) {
  return Array.from(parse(svg).getElementsByTagName(name));
}

describe("visual-model SVG", () => {
  it.each([false, true])("uses generated model colors when saved colors are absent or null: %s", nullColor => {
    const data = diagramFixture();
    if (nullColor) {
      (data.visual.modelColor as VisualModelData).color = null;
    } else {
      delete data.visual.modelColor;
    }
    const svg = generateVisualModelSvg(data.visual, data.models);
    const color = createColorGenerator().generateModelColor("vocabulary");
    expect(elements(svg, "rect").some(element => element.getAttribute("fill") === color)).toBe(true);
    expect(elements(svg, "path").some(element => element.getAttribute("stroke") === color)).toBe(true);
    expect(svg).toContain('#99f6e4');
    expect(svg).not.toContain('#cbd5e1');
  });

  it.each(["light", "dark", "transparent"] as const)("renders a reviewable %s fixture", async mode => {
    const svg = render({
      theme: mode === "dark" ? "dark" : "light",
      background: mode === "transparent" ? "transparent" : undefined,
      prefixes: { "https://example.org/": "ex", "https://example.org/profile/": "profile" },
      getLink: ({ entityId, modelId }) => `#${entityId ?? modelId}`,
    });
    parse(svg);
    expect(svg).not.toMatch(/\sdata-[\w-]+=/);
    expect(svg).not.toContain("var(--");
    expect(svg).toContain("path.relationship { stroke-width: 2;");
    expect(svg).not.toMatch(/foreignObject|<script|marker-end|NaN|Infinity/);
    await expect(svg).toMatchFileSnapshot(`./__fixtures__/${mode}.svg`);
  });

  it("uses aggregated labels, preserved profile declarations and project labels", () => {
    const data = diagramFixture();
    const svg = generateVisualModelSvg(data.visual, data.models);
    const text = parse(svg).documentElement.textContent;
    expect(text).toContain("Employee");
    expect(text).toContain("profile of Person");
    expect(text).toContain("Employee name : xsd:string profile of Name [1..1]");
    expect(text).toContain("<<mandatory>>");
    expect(text).toContain("https://example.org/Person");
    expect(text).toContain("Detail diagram");
    expect(text).not.toContain("Header title");
  });

  it("renders diagram names with only the project and semantic models", () => {
    const data = diagramFixture();
    delete data.models.detail;
    const onWarning = vi.fn();
    const svg = generateVisualModelSvg(data.visual, data.models, { onWarning });
    expect(parse(svg).documentElement.textContent).toContain("Detail diagram");
    expect(onWarning).not.toHaveBeenCalled();
  });

  it("ignores visual headers and falls back to the model identifier", () => {
    const data = diagramFixture();
    delete data.models._project_model;
    const svg = generateVisualModelSvg(data.visual, data.models);
    expect(parse(svg).documentElement.textContent).not.toContain("Header title");
    expect(parse(svg).documentElement.textContent).toContain("Represents detail");
  });

  it("keeps attributes ordered and identifies each linked semantic entity", () => {
    const data = diagramFixture();
    data.models.vocabulary.second = relationship("second", "Second", "Person", "Organization");
    (data.visual.person as VisualNode).content = ["second", "name"];
    const getLink = vi.fn(({ entityId }: SvgLinkContext) => `https://example.org/docs?entity=${entityId}&view=full`);
    const svg = generateVisualModelSvg(data.visual, data.models, { getLink });
    const attributes = elements(svg, "a").filter(anchor => anchor.getAttribute("class") === "attribute");
    expect(attributes.map(anchor => new URL(anchor.getAttribute("href")!).searchParams.get("entity"))).toEqual(["second", "name", "employeeName"]);
    expect(getLink.mock.calls.filter(([context]) => context.visualEntityId === "works")).toHaveLength(1);
    expect(getLink).toHaveBeenCalledWith({ kind: "attribute", modelId: "vocabulary", entityId: "name", visualEntityId: "person" });
    for (const anchor of elements(svg, "a")) {
      expect(anchor.getElementsByTagName("a").length).toBe(0);
      expect(anchor.getAttribute("href")).toBe(anchor.getAttribute("xlink:href"));
    }
  });

  it("fits multiline diagram titles inside their reference box", () => {
    const data = diagramFixture();
    data.visual = { diagram: data.visual.diagram };
    data.models._project_model.detail = {
      ...data.models._project_model.detail,
      label: { en: "First line\nSecond line\nThird line" },
    } as EntityRecord[string];
    const document = parse(generateVisualModelSvg(data.visual, data.models));
    const diagram = Array.from(document.getElementsByTagName("g"))
      .find(group => group.getAttribute("class") === "diagram")!;
    const box = diagram.getElementsByTagName("rect")[0];
    const bottom = Number(box.getAttribute("y")) + Number(box.getAttribute("height"));
    const lines = Array.from(diagram.getElementsByTagName("tspan"));
    expect(lines).toHaveLength(6);
    expect(lines.every(line => Number(line.getAttribute("y")) < bottom)).toBe(true);
  });

  it("applies the longest custom prefix to built-in datatypes without warnings", () => {
    const onWarning = vi.fn();
    const svg = render({
      prefixes: {
        "http://www.w3.org/": "w3",
        "http://www.w3.org/2001/XMLSchema#": "schema",
      },
      onWarning,
    });
    expect(parse(svg).documentElement.textContent).toContain(": schema:string");
    expect(svg).not.toContain("xsd:string");
    expect(onWarning).not.toHaveBeenCalled();
  });

  it("supports independently disabled links and broad arrow hit targets", () => {
    const svg = render({ getLink: context => context.kind === "relationship" ? "#relationship" : null, linkTarget: "_blank" });
    const anchors = elements(svg, "a");
    expect(anchors).toHaveLength(2);
    expect(anchors.every(anchor => anchor.getAttribute("class") === "relationship")).toBe(true);
    expect(anchors[0].getAttribute("rel")).toBe("noopener noreferrer");
    expect(Array.from(anchors[0].getElementsByTagName("path")).some(path => path.getAttribute("class")!.includes("hit-area"))).toBe(true);
    expect(elements(render({ getLink: () => null }), "a")).toHaveLength(0);
  });

  it("escapes content and URLs and rejects executable links", () => {
    const data = diagramFixture();
    data.models.vocabulary.Person = classEntity("Person", '<script>alert("x")</script> & Ω\u0000');
    const svg = generateVisualModelSvg(data.visual, data.models, { getLink: () => '#a" onload="alert(1)&value=<x>' });
    const document = parse(svg);
    expect(document.getElementsByTagName("script").length).toBe(0);
    expect(document.documentElement.textContent).toContain('<script>alert("x")</script> & Ω�');
    expect(elements(svg, "a")[0].getAttribute("onload")).toBe("");
    for (const url of ["javascript:alert(1)", " JavaScript:alert(1)", "java\nscript:alert(1)", "data:text/html,x", "vbscript:x"]) {
      const onWarning = vi.fn();
      expect(elements(render({ getLink: () => url, onWarning }), "a")).toHaveLength(0);
      expect(onWarning).toHaveBeenCalled();
    }
  });

  it("matches vocabulary display choices and handles cyclic profile declarations", () => {
    const data = diagramFixture();
    let svg = generateVisualModelSvg(data.visual, data.models, { labelMode: "vocabulary", colorMode: "vocabulary" });
    const profileNode = elements(svg, "g").find(group => group.getAttribute("class") === "class" && group.textContent!.includes("⚓"))!;
    expect(profileNode.textContent).toContain("Person");
    expect(profileNode.getElementsByTagName("rect")[0].getAttribute("fill")).toBe("#cbd5e1");
    (data.models.profile.Employee as EntityRecord[string] & { profiling: string[] }).profiling = ["Employee"];
    svg = generateVisualModelSvg(data.visual, data.models, { labelMode: "vocabulary" });
    expect(parse(svg).documentElement.textContent).toContain("Employee");
  });

  it("supports localization, annotation overrides and hidden details", () => {
    const svg = render({ language: "cs", texts: { mandatory: "Required!" }, showIris: false, showRangeDetails: false, showCardinalities: false, profileOfMode: "hidden" });
    const text = parse(svg).documentElement.textContent;
    expect(text).toContain("Person česky");
    expect(text).toContain("Detailní diagram");
    expect(text).toContain("Required!");
    expect(text).not.toContain("profile of");
    expect(text).not.toContain("https://example.org/");
    expect(text).not.toContain("[1..1]");
    expect(text).not.toContain(": xsd:string");
  });

  it("uses IRIs as labels without repeating an IRI row", () => {
    const data = diagramFixture();
    data.visual = { person: data.visual.person };
    (data.visual.person as VisualNode).content = [];
    const svg = generateVisualModelSvg(data.visual, data.models, { labelMode: "iri", prefixes: { "https://example.org/": "ex" } });
    expect(elements(svg, "text").map(element => element.textContent)).toEqual(["ex:Person"]);
  });

  it("resolves reversed relationship ends and renders relationship profiles", () => {
    const data = diagramFixture();
    const relation = data.models.vocabulary.worksFor as ReturnType<typeof relationship>;
    relation.ends.reverse();
    data.visual.profileRelation = edge("profileRelation", "employeeName", "profile", "employee", "organization");
    const text = elements(generateVisualModelSvg(data.visual, data.models), "text")
      .map(element => element.textContent).join("");
    expect(text).toContain("Works for");
    expect(text).toContain("Employee name(Name)<<mandatory>>");
    expect(text).not.toContain("<<profile>>");
    expect(text).toContain("[0..*]");
  });

  it("resolves cross-model attributes but never guesses ambiguous references", () => {
    const data = diagramFixture();
    (data.visual.employee as VisualNode).content = ["name"];
    const callback = vi.fn(() => null);
    generateVisualModelSvg(data.visual, data.models, { getLink: callback });
    expect(callback).toHaveBeenCalledWith({ kind: "attribute", modelId: "vocabulary", entityId: "name", visualEntityId: "employee" });
    data.models.other = { name: relationship("name", "Ambiguous", "Person", "Person") };
    const onWarning = vi.fn();
    const svg = generateVisualModelSvg(data.visual, data.models, { onWarning });
    expect(onWarning.mock.calls.some(([message]) => message.includes("Ambiguous"))).toBe(true);
    const attributes = elements(svg, "g").filter(group => group.getAttribute("class") === "attribute");
    expect(attributes).toHaveLength(1);
    expect(attributes[0].textContent).toContain("Name : xsd:string");
  });

  it("warns for missing entities and endpoints and preserves valid content", () => {
    const data = diagramFixture();
    delete data.models.vocabulary.Organization;
    (data.visual.person as VisualNode).content.push("absent");
    data.visual.unknown = { id: "unknown", type: ["unknown"] };
    const onWarning = vi.fn();
    const svg = generateVisualModelSvg(data.visual, data.models, { onWarning });
    expect(parse(svg).documentElement.textContent).toContain("Person");
    expect(onWarning.mock.calls.some(([message]) => message.includes("missing visual endpoints"))).toBe(true);
    expect(onWarning.mock.calls.some(([message]) => message.includes("unsupported visual entity"))).toBe(true);
    expect(onWarning.mock.calls.some(([message]) => message.includes("absent"))).toBe(true);
  });

  it("includes distant waypoints, negative positions, arrowheads and labels in its bounds", () => {
    const data = diagramFixture();
    (data.visual.works as VisualRelationship).waypoints = [{ x: -900, y: -700, anchored: null }];
    const document = parse(generateVisualModelSvg(data.visual, data.models));
    const [x, y, width, height] = document.documentElement.getAttribute("viewBox")!.split(" ").map(Number);
    expect(x).toBeLessThan(-900);
    expect(y).toBeLessThan(-700);
    for (const rect of Array.from(document.getElementsByTagName("rect"))) {
      const rx = Number(rect.getAttribute("x"));
      const ry = Number(rect.getAttribute("y"));
      expect(rx).toBeGreaterThanOrEqual(x);
      expect(ry).toBeGreaterThanOrEqual(y);
      expect(rx + Number(rect.getAttribute("width"))).toBeLessThanOrEqual(x + width + 0.001);
      expect(ry + Number(rect.getAttribute("height"))).toBeLessThanOrEqual(y + height + 0.001);
    }
  });

  it("handles self-loops, repeated waypoints and invalid coordinates", () => {
    const data = diagramFixture();
    data.visual.loop = edge("loop", "worksFor", "vocabulary", "person", "person");
    (data.visual.works as VisualRelationship).waypoints = [{ x: 300, y: 70, anchored: null }, { x: 300, y: 70, anchored: null }];
    let svg = generateVisualModelSvg(data.visual, data.models);
    expect(svg).not.toMatch(/NaN|Infinity/);
    expect(Math.max(...elements(svg, "path").map(path => path.getAttribute("d")!.match(/L/g)?.length ?? 0))).toBeGreaterThanOrEqual(4);
    (data.visual.person as VisualNode).position.x = NaN;
    const onWarning = vi.fn();
    svg = generateVisualModelSvg(data.visual, data.models, { onWarning });
    expect(svg).not.toMatch(/NaN|Infinity/);
    expect(onWarning).toHaveBeenCalled();
  });

  it("returns a valid empty image and validates numeric options", () => {
    const empty = parse(generateVisualModelSvg({}, {}, { padding: 0, background: "transparent" }));
    expect(empty.documentElement.getAttribute("viewBox")).toBe("0 0 1 1");
    expect(empty.getElementsByTagName("rect").length).toBe(0);
    for (const options of [{ padding: -1 }, { fontSize: 0 }, { fontSize: Infinity }, { padding: NaN }]) {
      expect(() => generateVisualModelSvg({}, {}, options)).toThrow();
    }
  });

  it("is deterministic and leaves all input entities unchanged", () => {
    const data = diagramFixture();
    const before = structuredClone(data);
    const first = generateVisualModelSvg(data.visual, data.models);
    const second = generateVisualModelSvg(data.visual, data.models);
    expect(first).toBe(second);
    expect(data).toEqual(before);
  });
});
