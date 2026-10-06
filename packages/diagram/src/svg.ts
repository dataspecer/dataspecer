import { textWidth, type Point, type Rectangle } from "./geometry.ts";
import type { RenderOptions, SvgLinkContext } from "./options.ts";

/** Escapes XML text and attributes, replacing characters forbidden by XML 1.0. */
export function escapeXml(value: string): string {
  return value.replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\ufffe\uffff]|\p{Surrogate}/gu, "\ufffd")
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;").replace(/'/g, "&apos;");
}

/** Rounds coordinates consistently and prevents invalid SVG numeric attributes. */
export function number(value: number): string {
  if (!Number.isFinite(value)) throw new Error("Non-finite SVG coordinate.");
  return String(Math.round(value * 1000) / 1000);
}

/** Accepts CSS color literals, excluding paint-server references and style declarations. */
export function color(value: string, fallback: string): string {
  return /^(?:#[\da-f]{3,4}|#[\da-f]{6}|#[\da-f]{8}|[a-z]+|(?:rgb|rgba|hsl|hsla)\([\d.,%+\-\s/]+\))$/i.test(value)
    ? value : fallback;
}

/** Chooses readable text for the model's hexadecimal header color. */
export function headerText(fill: string): string {
  let hex = fill.slice(1);
  if (!/^#[\da-f]{3,8}$/i.test(fill)) return "#000000";
  if (hex.length <= 4) hex = [...hex].map(character => character.repeat(2)).join("");
  const channels = [0, 2, 4].map(index => parseInt(hex.slice(index, index + 2), 16) / 255);
  const luminance = channels.map(value => value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4);
  return luminance[0] * 0.2126 + luminance[1] * 0.7152 + luminance[2] * 0.0722 > 0.179 ? "#000000" : "#ffffff";
}

/** Serializes SVG primitives while accumulating complete drawing bounds. */
export class SvgDrawing {
  private minX = Infinity;
  private minY = Infinity;
  private maxX = -Infinity;
  private maxY = -Infinity;
  readonly lineHeight: number;

  constructor(readonly options: RenderOptions) {
    this.lineHeight = options.fontSize * 1.5;
  }

  include(rect: Rectangle, stroke = 0): void {
    this.minX = Math.min(this.minX, rect.x - stroke / 2);
    this.minY = Math.min(this.minY, rect.y - stroke / 2);
    this.maxX = Math.max(this.maxX, rect.x + rect.width + stroke / 2);
    this.maxY = Math.max(this.maxY, rect.y + rect.height + stroke / 2);
  }

  rect(rect: Rectangle, fill: string, {
    stroke = "none", radius = 0, fillOpacity = 1,
  }: { stroke?: string; radius?: number; fillOpacity?: number } = {}): string {
    this.include(rect, stroke === "none" ? 0 : 1);
    return `<rect class="shape" x="${number(rect.x)}" y="${number(rect.y)}" width="${number(rect.width)}" height="${number(rect.height)}" rx="${number(radius)}" fill="${escapeXml(fill)}"${fillOpacity === 1 ? "" : ` fill-opacity="${number(fillOpacity)}"`}${stroke === "none" ? "" : ` stroke="${escapeXml(stroke)}"`}/>`;
  }

  path(points: Point[], stroke: string, {
    closed = false, fill = "none", dashed = false, width = 2,
  }: { closed?: boolean; fill?: string; dashed?: boolean; width?: number } = {}): string {
    if (!points.length) return "";
    for (const point of points) this.include({ ...point, width: 0, height: 0 }, width);
    const d = points.map((point, index) => `${index ? "L" : "M"}${number(point.x)} ${number(point.y)}`).join(" ") + (closed ? " Z" : "");
    const classes = ["relationship", dashed ? "dashed" : "", width === 12 ? "hit-area" : ""].filter(Boolean).join(" ");
    return `<path class="${classes}" d="${d}" fill="${escapeXml(fill)}" stroke="${escapeXml(stroke)}"${width === 2 || width === 12 ? "" : ` style="stroke-width:${number(width)}"`}/>`;
  }

  /** Renders explicit baselines without CSS layout or dominant-baseline differences. */
  text(value: string, x: number, y: number, fill: string, anchor: "start" | "middle" = "start"): string {
    const lines = value.split(/\r?\n/);
    const width = Math.max(0, ...lines.map(line => textWidth(line, this.options.fontSize)));
    this.include({ x: x - (anchor === "middle" ? width / 2 : 0), y, width, height: lines.length * this.lineHeight });
    return `<text fill="${escapeXml(fill)}"${anchor === "middle" ? ' text-anchor="middle"' : ""} xml:space="preserve">${lines.map((line, index) =>
      `<tspan x="${number(x)}" y="${number(y + this.options.fontSize + index * this.lineHeight)}">${escapeXml(line)}</tspan>`).join("")}</text>`;
  }

  /** Gives one element its own anchor without nesting interactive regions. */
  link(context: SvgLinkContext, content: string, {
    hitArea = "", href = this.options.getLink?.(context) ?? null,
  }: { hitArea?: string; href?: string | null } = {}): string {
    // let attributes = `data-kind="${context.kind}" data-visual-id="${escapeXml(context.visualEntityId)}"${context.entityId === null ? "" : ` data-entity-id="${escapeXml(context.entityId)}"`}`;
    // attributes += ` data-model-id="${escapeXml(context.modelId)}"`;
    const attributes = `class="${context.kind}"`;
    if (href === null) return `<g ${attributes}>${content}</g>`;
    const scheme = /^([a-z][a-z\d+.-]*):/i.exec(href.trim());
    if (/[\u0000-\u001f\u007f]/u.test(href) || (scheme && !/^(https?|mailto|tel)$/i.test(scheme[1]))) {
      this.options.onWarning(`Rejected unsafe SVG link for ${JSON.stringify(context.entityId ?? context.modelId)}.`);
      return `<g ${attributes}>${content}</g>`;
    }
    return `<a ${attributes} href="${escapeXml(href)}" xlink:href="${escapeXml(href)}" target="${this.options.linkTarget}"${this.options.linkTarget === "_blank" ? ' rel="noopener noreferrer"' : ""}>${hitArea}${content}</a>`;
  }

  finish(content: string): string {
    const empty = !Number.isFinite(this.minX);
    const x = empty ? 0 : this.minX - this.options.padding;
    const y = empty ? 0 : this.minY - this.options.padding;
    const width = empty ? Math.max(1, this.options.padding * 2) : Math.max(1, this.maxX - this.minX + 2 * this.options.padding);
    const height = empty ? Math.max(1, this.options.padding * 2) : Math.max(1, this.maxY - this.minY + 2 * this.options.padding);
    const background = this.options.background === "transparent" ? "" :
      `<rect x="${number(x)}" y="${number(y)}" width="${number(width)}" height="${number(height)}" fill="${escapeXml(color(this.options.background, this.options.palette.body))}"/>`;
    const stylesheet = `<style>
  .dataspecer-diagram .shape { stroke-width: 1; }
  .dataspecer-diagram path.relationship { stroke-width: 2; stroke-linejoin: round; }
  .dataspecer-diagram path.dashed { stroke-dasharray: 5 5; }
  .dataspecer-diagram path.hit-area { stroke-width: 12; pointer-events: stroke; }
  .dataspecer-diagram a { cursor: pointer; }
</style>`;
    const svg = `<svg class="dataspecer-diagram" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${number(width)}" height="${number(height)}" viewBox="${number(x)} ${number(y)} ${number(width)} ${number(height)}" font-family="ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, &quot;Segoe UI&quot;, sans-serif" font-size="${number(this.options.fontSize)}" font-weight="400" text-anchor="start" fill="${this.options.palette.text}">\n${stylesheet}\n\n${background ? `<!-- Background -->\n${background}\n\n` : ""}${content}\n</svg>`;
    // Keep text elements intact: whitespace inside xml:space="preserve" is visible.
    const lines = svg.split(/(<text\b[\s\S]*?<\/text>)/g)
      .map((part, index) => index % 2 ? part : part.replace(/></g, ">\n<"))
      .join("\n").split("\n");
    let depth = 0;
    return lines.map(line => {
      if (!line) return "";
      if (/^<\/(?:svg|g|a)>/.test(line)) depth--;
      const formatted = "  ".repeat(Math.max(0, depth)) + line;
      if (/^<(?:svg|g|a)\b/.test(line) && !/<\/(?:svg|g|a)>$/.test(line)) depth++;
      return formatted;
    }).join("\n") + "\n";
  }
}
