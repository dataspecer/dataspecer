import type { EntityRecord } from "@dataspecer/core/entity-model";
import type { ModelIdentifier } from "@dataspecer/core/model";
import {
  isVisualNode, isVisualDiagramNode, isVisualRelationship, isVisualProfileRelationship,
  isVisualGroup, isModelVisualInformation, isVisualView, VISUAL_MODEL_ENTITY_TYPE,
  type VisualEntity, type VisualNode, type VisualDiagramNode,
  type VisualRelationship, type VisualProfileRelationship,
} from "@dataspecer/visual-model";
import { DiagramModel, cardinality, isClass, isRelationship, isGeneralization, relationshipEnds } from "./model.ts";
import { arrowhead, cardinalityPosition, labelPosition, route, textWidth, type Point, type Rectangle } from "./geometry.ts";
import { resolveOptions, type SvgRenderOptions, type SvgLinkContext } from "./options.ts";
import { SvgDrawing, color, headerText } from "./svg.ts";

type Row = { text: string; muted?: boolean; link?: SvgLinkContext };
type NodeLayout = {
  rect: Rectangle;
  header: Row[];
  rows: Row[];
  headerHeight: number;
  color: string;
  link: SvgLinkContext;
  diagram: boolean;
};

/**
 * Generates a standalone SVG using supplied aggregated semantic entities.
 * Preserves stored positions and does not modify or aggregate the input models.
 * @param visualModel Visual entities to draw.
 * @param models Project model (`PROJECT_MODEL_ID`) and all semantic models keyed by
 * model identifier, including vocabulary dependencies. Semantic
 * entities must have resolved aggregate values and preserved profile declarations.
 * IRIs must be absolute; model labels come from the project model.
 * Other model types are not required; the visual model is supplied separately.
 * @param options Appearance, localization, links, and warning handling.
 */
export function generateVisualModelSvg(
  visualModel: EntityRecord<VisualEntity>,
  models: Record<ModelIdentifier, EntityRecord>,
  options: SvgRenderOptions = {},
): string {
  const resolved = resolveOptions(options);
  const model = new DiagramModel(models, visualModel, resolved);
  const drawing = new SvgDrawing(resolved);
  const nodes = new Map<string, NodeLayout>();
  const anchored = anchoredMembers(visualModel, resolved.onWarning);
  for (const visual of Object.values(visualModel)) {
    if (isVisualNode(visual) || isVisualDiagramNode(visual)) {
      if (!finitePoint(visual.position)) {
        resolved.onWarning(`Skipped visual node ${JSON.stringify(visual.id)} with invalid coordinates.`);
        continue;
      }
      const node = layoutNode(visual, model, drawing, anchored.has(visual.id));
      if (node) nodes.set(visual.id, node);
    } else if (!isVisualRelationship(visual) && !isVisualProfileRelationship(visual)
      && !isVisualGroup(visual) && !isModelVisualInformation(visual) && !isVisualView(visual)
      && !visual.type.includes(VISUAL_MODEL_ENTITY_TYPE)) {
      resolved.onWarning(`Skipped unsupported visual entity ${JSON.stringify(visual.id)}.`);
    }
  }

  const edges: string[] = [];
  const labels: string[] = [];
  for (const visual of Object.values(visualModel)) {
    if (!isVisualRelationship(visual) && !isVisualProfileRelationship(visual)) continue;
    const edge = renderEdge(visual, nodes, model, drawing);
    if (edge) {
      edges.push(edge.path);
      labels.push(edge.labels);
    }
  }
  const bodies = [...nodes.values()].map(node => renderNode(node, drawing));
  return drawing.finish([
    `<!-- Arrows -->\n${edges.join("\n\n")}`,
    `<!-- Classes and diagrams -->\n${bodies.join("\n\n")}`,
    `<!-- Arrow labels -->\n${labels.filter(Boolean).join("\n\n")}`,
  ].join("\n\n"));
}

/** Expands anchored groups without exposing their temporary editor highlights. */
function anchoredMembers(visual: EntityRecord<VisualEntity>, warn: (message: string) => void): Set<string> {
  const anchored = new Set<string>();
  const pending = Object.values(visual).filter(isVisualGroup).filter(group => group.anchored).map(group => group.id);
  while (pending.length) {
    const id = pending.pop()!;
    if (anchored.has(id)) continue;
    anchored.add(id);
    const entity = visual[id];
    if (!entity) warn(`Missing visual group member ${JSON.stringify(id)}.`);
    else if (isVisualGroup(entity)) pending.push(...entity.content);
  }
  return anchored;
}

/** Checks coordinates before including an element in the drawing. */
function finitePoint(point: Point): boolean {
  return Number.isFinite(point?.x) && Number.isFinite(point?.y);
}

/** Measures visible node content independently of a browser layout engine. */
function layoutNode(
  visual: VisualNode | VisualDiagramNode, model: DiagramModel, drawing: SvgDrawing, groupAnchored: boolean,
): NodeLayout | null {
  const options = model.options;
  const anchor = visual.position.anchored || groupAnchored ? " ⚓" : "";
  if (isVisualDiagramNode(visual)) {
    const title = model.modelLabel(visual.representedVisualModel);
    const header: Row[] = [{ text: title + anchor }];
    const rows: Row[] = [{ text: `${options.texts.represents} ${title}`, muted: true }];
    const width = Math.max(100, measureRows([...header, ...rows], options.fontSize) + 64);
    const height = Math.max(100, rowHeight([...header, ...rows], drawing.lineHeight) + 20);
    return {
      diagram: true, rect: { ...visual.position, width, height },
      header, rows, headerHeight: rowHeight(header, drawing.lineHeight) + 8,
      color: options.palette.body,
      link: { kind: "diagram", modelId: visual.representedVisualModel, entityId: null, visualEntityId: visual.id },
    };
  }

  const reference = model.explicit(visual.model, visual.representedEntity);
  if (!reference) return null;
  if (!isClass(reference.entity)) {
    options.onWarning(`Skipped non-class entity ${JSON.stringify(reference.entity.id)} in visual node ${JSON.stringify(visual.id)}.`);
    return null;
  }
  const header: Row[] = [{ text: model.label(reference) + anchor }];
  const profiles = model.profileLabels(reference);
  profiles.forEach((label, index) => header.push({ text: `${index === 0 ? options.texts.profileOf : ""} ${label}`, muted: true }));
  const rows: Row[] = [];
  const iri = model.iri(reference);
  if (options.showIris && options.labelMode !== "iri" && iri !== null) rows.push({ text: iri, muted: true });
  let lastLevel: ReturnType<DiagramModel["mandatoryLevel"]> = null;
  for (const id of visual.content) {
    const attribute = model.resolve(id, visual.model);
    if (!attribute) continue;
    if (!isRelationship(attribute.entity)) {
      options.onWarning(`Skipped non-relationship attribute ${JSON.stringify(id)} in visual node ${JSON.stringify(visual.id)}.`);
      continue;
    }
    const level = model.mandatoryLevel(attribute.entity);
    if (level !== lastLevel) rows.push({ text: level === null ? options.texts.undefinedLevel : options.texts[level] });
    lastLevel = level;
    const range = relationshipEnds(attribute.entity).range;
    let text = `- ${model.label(attribute)}`;
    if (options.showRangeDetails) text += ` : ${model.rangeLabel(attribute, range?.concept)}`;
    const profileLabels = model.profileLabels(attribute);
    if (profileLabels.length) text += ` ${options.texts.profileOf} ${profileLabels.join(", ")}`;
    if (options.showRangeDetails && options.showCardinalities) {
      const value = cardinality(range?.cardinality);
      if (value) text += ` ${value}`;
    }
    rows.push({ text, link: { kind: "attribute", modelId: attribute.modelId, entityId: id, visualEntityId: visual.id } });
  }
  const headerHeight = rowHeight(header, drawing.lineHeight) + 8;
  return {
    diagram: false,
    rect: {
      ...visual.position,
      width: Math.max(224, measureRows([...header, ...rows], options.fontSize) + 10),
      height: Math.max(56, headerHeight + rowHeight(rows, drawing.lineHeight) + 2),
    },
    header, rows, headerHeight, color: color(model.color(reference), "#9fbdff"),
    link: { kind: "class", modelId: visual.model, entityId: reference.entity.id, visualEntityId: visual.id },
  };
}

/** Measures the widest explicit line in a collection of rows. */
function measureRows(rows: Row[], fontSize: number): number {
  return Math.max(0, ...rows.flatMap(row => row.text.split(/\r?\n/).map(line => textWidth(line, fontSize))));
}

/** Measures the total height of explicit lines in a collection of rows. */
function rowHeight(rows: Row[], lineHeight: number): number {
  return rows.reduce((height, row) => height + row.text.split(/\r?\n/).length * lineHeight, 0);
}

/** Draws headers and attribute rows as sibling interactive regions. */
function renderNode(node: NodeLayout, drawing: SvgDrawing): string {
  const { palette } = drawing.options;
  const { x, y, width, height } = node.rect;
  if (node.diagram) {
    const top = drawing.path([
      { x, y },
      { x: x + 10, y: y - 8 },
      { x: x + width + 10, y: y - 8 },
      { x: x + width, y },
    ], palette.border, { closed: true, fill: palette.body });
    const side = drawing.path([
      { x: x + width, y },
      { x: x + width + 10, y: y - 8 },
      { x: x + width + 10, y: y + height - 8 },
      { x: x + width, y: y + height },
    ], palette.border, { closed: true, fill: palette.body });
    const front = drawing.rect(node.rect, palette.body, { stroke: palette.border });
    const title = drawing.text(node.header[0].text, x + 20, y + 10, palette.text);
    const subtitle = drawing.text(node.rows[0].text, x + 20, y + 10 + rowHeight(node.header, drawing.lineHeight), palette.muted);
    return drawing.link(node.link, top + side + front + title + subtitle);
  }
  const background = drawing.rect(node.rect, palette.body, { stroke: palette.border });
  const foreground = headerText(node.color);
  let header = drawing.rect({ x: x + 0.5, y: y + 0.5, width: width - 1, height: node.headerHeight - 0.5 }, node.color);
  let nextY = y + 4;
  for (const row of node.header) {
    header += drawing.text(row.text, x + 4, nextY, row.muted && foreground === "#000000" ? "#4b5563" : foreground);
    nextY += rowHeight([row], drawing.lineHeight);
  }
  const body: string[] = [background, drawing.link(node.link, header)];
  nextY = y + node.headerHeight;
  for (const row of node.rows) {
    const text = drawing.text(row.text, x + 4, nextY, row.muted ? palette.muted : palette.text);
    if (row.link) {
      const hit = drawing.rect({ x: x + 1, y: nextY, width: width - 2, height: rowHeight([row], drawing.lineHeight) }, "transparent");
      body.push(drawing.link(row.link, text, { hitArea: hit }));
    } else body.push(text);
    nextY += rowHeight([row], drawing.lineHeight);
  }
  return body.join("");
}

/** Draws multiline edge labels with explicit backing rectangles. */
function edgeLabel(
  lines: Row[], position: Point, drawing: SvgDrawing,
  { centered = false, modelColor }: { centered?: boolean; modelColor: string },
): string {
  if (!lines.length) return "";
  const width = measureRows(lines, drawing.options.fontSize);
  const height = rowHeight(lines, drawing.lineHeight) - drawing.lineHeight + drawing.options.fontSize;
  const x = position.x - (centered ? width / 2 : 0);
  let y = position.y - (centered ? height / 2 : 0);
  const padding = centered ? 5 : 2;
  const backing = { x: x - padding, y: y - padding, width: width + 2 * padding, height: height + 2 * padding };
  const radius = centered ? 15 : 0;
  let result = drawing.rect(backing, drawing.options.palette.body, { radius });
  result += drawing.rect(backing, modelColor, { radius, fillOpacity: drawing.options.theme === "dark" ? 0.2 : 0.1 });
  for (const row of lines) {
    for (const line of row.text.split(/\r?\n/)) {
      result += drawing.text(line, x + width / 2, y - drawing.options.fontSize * 0.2,
        row.muted ? drawing.options.palette.muted : drawing.options.palette.text, "middle");
      y += drawing.lineHeight;
    }
  }
  return result;
}

/** Emits edge strokes below nodes and linked labels above nodes. */
function renderEdge(
  visual: VisualRelationship | VisualProfileRelationship,
  nodes: Map<string, NodeLayout>, model: DiagramModel, drawing: SvgDrawing,
): { path: string; labels: string } | null {
  const source = nodes.get(visual.visualSource);
  const target = nodes.get(visual.visualTarget);
  const options = model.options;
  if (!source || !target) {
    options.onWarning(`Skipped edge ${JSON.stringify(visual.id)} with missing visual endpoints.`);
    return null;
  }
  const profileLink = isVisualProfileRelationship(visual);
  const reference = model.explicit(visual.model, profileLink ? visual.entity : visual.representedRelationship);
  if (!reference) return null;
  const generalization = isGeneralization(reference.entity);
  if (profileLink ? !isClass(reference.entity) : !isRelationship(reference.entity) && !generalization) {
    options.onWarning(`Skipped edge ${JSON.stringify(visual.id)} representing an unsupported entity.`);
    return null;
  }
  if (visual.waypoints.some(point => !finitePoint(point))) {
    options.onWarning(`Skipped edge ${JSON.stringify(visual.id)} with invalid waypoints.`);
    return null;
  }
  const points = route(source.rect, target.rect, visual.waypoints, source === target);
  const modelColor = color(model.color(reference), "#9fbdff");
  const stroke = profileLink ? options.palette.border : modelColor;
  let path = drawing.path(points, stroke, { dashed: profileLink });
  path += drawing.path(arrowhead(points), stroke, {
    closed: generalization || profileLink,
    fill: generalization || profileLink ? options.palette.body : "none",
  });
  const centerRows: Row[] = [];
  if (!profileLink && isRelationship(reference.entity)) {
    const label = model.label(reference);
    centerRows.push({ text: label });
    const profiles = model.profileLabels(reference);
    if (profiles.length && !(profiles.length === 1 && profiles[0] === label)) centerRows.push({ text: `(${profiles.join(", ")})` });
    const mandatory = model.mandatoryLevel(reference.entity);
    if (mandatory) centerRows.push({ text: options.texts[mandatory], muted: true });
  }
  let labels = edgeLabel(centerRows, labelPosition(points), drawing, { centered: true, modelColor });
  if (!profileLink && isRelationship(reference.entity) && options.showCardinalities) {
    const { domain, range } = relationshipEnds(reference.entity);
    const ends = [
      { cardinality: domain?.cardinality, point: points[0], adjacent: points[1] ?? points[0], node: source },
      { cardinality: range?.cardinality, point: points.at(-1)!, adjacent: points.at(-2) ?? points[0], node: target },
    ];
    for (const end of ends) {
      const value = cardinality(end.cardinality);
      if (!value) continue;
      const position = cardinalityPosition(end.point, end.adjacent, end.node.rect,
        textWidth(value, options.fontSize) + 4, options.fontSize + 4);
      position.x += 2;
      position.y += 2;
      labels += edgeLabel([{ text: value }], position, drawing, { modelColor });
    }
  }
  const context: SvgLinkContext = {
    kind: profileLink ? "profile-link" : generalization ? "generalization" : "relationship",
    modelId: reference.modelId, entityId: reference.entity.id, visualEntityId: visual.id,
  };
  // Resolve once even though the same edge occupies two SVG drawing layers.
  const href = options.getLink?.(context) ?? null;
  const hit = drawing.path(points, "transparent", { width: 12 });
  return {
    path: drawing.link(context, path, { hitArea: hit, href }),
    labels: labels ? drawing.link(context, labels, { href }) : "",
  };
}
