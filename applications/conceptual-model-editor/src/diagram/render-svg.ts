import { getNodesBounds, getViewportForBounds, Rect } from "@xyflow/react";

import { EdgeType, NodeType } from "./diagram-controller";

export async function diagramContentAsSvg(nodes: NodeType[], edges: EdgeType[]): Promise<string | null> {
  return await getSvg(nodes, edges, 1024, 768);
}

async function getSvg(nodes: NodeType[], edges: EdgeType[], width: number, height: number): Promise<string | null> {
  // We calculate a transform for the nodes so that all nodes are visible.
  // We then overwrite the transform of the `.react-flow__viewport`
  // so the whole diagram fits into the view - amount we can fit is determined
  // by the min-zoom argument.
  const bounds = getBounds(nodes, edges);
  const viewport = getViewportForBounds(bounds, width, height, 0.00001, 1, 0.001);

  const element = document.querySelector(".react-flow__viewport");
  if (element === null) {
    return null;
  }

  const transformation = `translate(${viewport.x}px, ${viewport.y}px) scale(${viewport.zoom})`;
  return renderToSvg(element as HTMLElement, { width, height, transformation });
};

function getBounds(nodes: NodeType[], edges: EdgeType[]): Rect {
  const bounds = getNodesBounds(nodes);
  // Then we add edges.
  let minX = bounds.x;
  let maxX = bounds.x + bounds.width;
  let minY = bounds.y;
  let maxY = bounds.y + bounds.height;
  for (const edge of edges) {
    if (edge.data === undefined) {
      continue;
    }
    for (const { x, y } of edge.data.waypoints) {
      minX = Math.min(minX, x);
      maxX = Math.max(maxX, x);
      minY = Math.min(minY, y);
      maxY = Math.max(maxY, y);
    }
  }
  const border = 2;
  return {
    x: minX - border,
    y: minY - border,
    width: (maxX - minX) + border,
    height: (maxY - minY) + border,
  };
}

// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

const lightBackgroundColor = "white";

const lightForegroundColor = "black";

const darkBackgroundColor = "black";

const darkForegroundColor = "white";

interface Options {
  width: number,
  height: number,
  transformation: string;
}

function renderToSvg(node: HTMLElement, options: Options): string {
  const clone = cloneNode(defaultContext(), node);
  // Apply custom styles.
  const style = clone.style;
  style.width = `${options.width}px`
  style.height = `${options.height}px`
  style.transform = options.transformation;
  // Convert to data URL string.
  return nodeToDataURL(clone, options.width, options.height);
}

/**
 * We employ context to track where in the DOM we are.
 */
interface Context {
  edgeLabels: boolean;
  edgeProfile: boolean;
  edgeMarker: boolean;
}

function defaultContext(): Context {
  return {
    edgeLabels: false,
    edgeProfile: false,
    edgeMarker: false,
  };
}

function cloneNode<Type extends Element>(context: Context, source: Type): Type {
  const target = source.cloneNode() as Type;

  // OnBeforeCloneChildren
  const nextContext = { ...context };
  if (target instanceof HTMLElement) {
    const className = target.className;
    if (className.includes("react-flow__edgelabel-renderer")) {
      nextContext.edgeLabels = true;
    }
  } else if (target instanceof SVGElement) {
    const className = (target.className as any).baseVal;
    if (className.includes("class-profile-edge")) {
      nextContext.edgeProfile = true;
    } else if (className.includes("react-flow__marker")) {
      nextContext.edgeMarker = true;
    }
  }
  // OnBeforeCloneChildren : end

  const children = Array.from(source.childNodes);
  for (const child of children) {
    if (child instanceof Element) {

      // ShouldCloneChild
      if (child instanceof HTMLElement) {
        const className = child.className;
        if (className.includes("react-flow__handle")) {
          // Ignore handles to connect edges.
          continue;
        }
      } else if (child instanceof SVGElement) {
        const className = (child.className as any).baseVal;
        if (className.includes("react-flow__edge-interaction")) {
          // Ignore copy of the path for interaction.
          continue;
        }
      }
      // ShouldCloneChild : end
      const childClone = cloneNode(nextContext, child);
      target.appendChild(childClone);

    } else {
      // It is a primitive value.
      target.appendChild(child.cloneNode());
      continue;
    }
  }

  // OnAfterCloneChildren
  if (target instanceof Element) {
    Array.from(target.attributes).forEach(({ name }) => {
      if (name.startsWith("data-")) {
        target.removeAttribute(name);
      } else if (name.startsWith("aria-")) {
        target.removeAttribute(name);
      }
    });
    // Remove other attributes.
    target.removeAttribute("tabindex");
    target.removeAttribute("role");

    if (target instanceof SVGElement) {
      if (context.edgeProfile) {
        updateProfileEdge(source as any, target);
      } else if (context.edgeMarker) {
        updateMarker(source as any, target);
      } else {
        applyComputedStyles(source as any, target, SVG_STYLE_WHITE_LIST);
      }
    } else if (target instanceof HTMLElement) {
      const className = target.className;
      if (className.includes("react-flow__viewport")) {
        updateViewport(source as any, target);
      } else if (className.includes("react-flow__edgelabel-renderer")) {
        updateEdgeLabelRenderer(target);
      } else if (context.edgeLabels) {
        updateEdgeLabelStyle(target);
      } else {
        // Default handling.
        applyComputedStyles(source as any, target, HTML_STYLE_WHITE_LIST);
      }
    }
  }
  // OnAfterCloneChildren : end

  return target;
}

const SVG_STYLE_WHITE_LIST = new Set([
  "cx",
  "cy",
  "d",
  "opacity",
  "order",
  "overflow-x",
  "overflow-y",
  "position",
  "r",
  "rotate",
  "rx",
  "ry",
  "scale",
  "transform",
  "transform-origin",
  "transform-style",
  "x",
  "y",
  "z-index",
  "zoom",
]);

const HTML_STYLE_WHITE_LIST = new Set([
  "align-content",
  "align-items",
  "align-self",
  "background-color",
  "block-size",
  "border-bottom-color",
  "border-bottom-left-radius",
  "border-bottom-right-radius",
  "border-bottom-style",
  "border-bottom-width",
  "border-left-color",
  "border-left-style",
  "border-left-width",
  "border-right-color",
  "border-right-style",
  "border-right-width",
  "border-start-end-radius",
  "border-start-start-radius",
  "border-top-color",
  "border-top-left-radius",
  "border-top-right-radius",
  "border-top-style",
  "border-top-width",
  "bottom",
  "box-sizing",
  "color",
  "display",
  "font-family",
  "font-palette",
  "font-size",
  "font-size-adjust",
  "font-stretch",
  "font-style",
  "font-synthesis-small-caps",
  "font-synthesis-style",
  "font-synthesis-weight",
  "font-variant",
  "font-variant-alternates",
  "font-variant-caps",
  "font-variant-east-asian",
  "font-variant-emoji",
  "font-variant-ligatures",
  "font-variant-numeric",
  "font-variant-position",
  "font-weight",
  "height",
  "left",
  "margin-block-end",
  "margin-block-start",
  "margin-bottom",
  "margin-inline-end",
  "margin-inline-start",
  "margin-left",
  "margin-right",
  "margin-top",
  "opacity",
  "padding-block-end",
  "padding-block-start",
  "padding-bottom",
  "padding-inline-end",
  "padding-inline-start",
  "padding-left",
  "padding-right",
  "padding-top",
  "position",
  "resize",
  "right",
  "scale",
  "text-align",
  "text-align-last",
  "text-anchor",
  "text-box-edge",
  "text-box-trim",
  "text-decoration",
  "text-decoration-color",
  "text-decoration-line",
  "text-decoration-skip-ink",
  "text-decoration-style",
  "text-emphasis-color",
  "text-emphasis-position",
  "text-emphasis-style",
  "text-indent",
  "text-overflow",
  "text-rendering",
  "text-shadow",
  "text-size-adjust",
  "text-spacing-trim",
  "text-transform",
  "text-underline-position",
  "text-wrap-mode",
  "text-wrap-style",
  "top",
  "transform",
  "transform-origin",
  "transform-style",
  "white-space-collapse",
  "width",
  "word-break",
  "word-spacing",
  "z-index",
  "list-style-type",
]);

function updateProfileEdge(source: SVGElement, target: SVGElement) {
  applyComputedStyles(source, target, SVG_STYLE_WHITE_LIST);
  if (source.tagName.toLowerCase() === "path") {
    target.style.stroke = `light-dark(${lightForegroundColor}, ${darkForegroundColor})`;
  }
}

function updateMarker(source: SVGElement, target: SVGElement) {
  applyComputedStyles(source, target, SVG_STYLE_WHITE_LIST);
  // Replace default color (black) for polyline with light-dark alternative.
  if (source.tagName.toLowerCase() === "polyline") {
    if (target.style.fill === "rgb(0, 0, 0)") {
      const color = `light-dark(${lightForegroundColor}, ${darkForegroundColor})`;
      target.style.fill = color;
      target.style.stroke = color;
    }
  }
}

/**
 * Copy whitelisted computed (effective) styles from source to target.
 * We need this as some stiles are inherited or applied by classes.
 * This effectively instantiate the style as inline style.
 *
 * We utilize whitelisting as there are almost 400 style options.
 * At the same time, this introduce risk of braking the visual style.
 */
function applyComputedStyles<T extends HTMLElement | SVGElement>(
  source: T,
  target: T,
  whiteList: Set<string>,
) {
  const sourceStyle = source.style;
  const computedSourceStyle = window.getComputedStyle(source);

  const targetStyle = target.style;
  const computedTargetStyle = window.getComputedStyle(target);

  Array.from(computedSourceStyle).forEach((name) => {
    if (!whiteList.has(name)) {
      return;
    }

    let value = computedSourceStyle.getPropertyValue(name);
    if (name === "font-size" && value.endsWith("px")) {
      const reducedFont = Math.floor(
        parseFloat(value.substring(0, value.length - 2))) - 0.1;
      value = `${reducedFont}px`;
    }

    if (name === "d" && target.getAttribute("d")) {
      value = `path(${target.getAttribute("d")})`;
    }

    const targetValue = computedTargetStyle.getPropertyValue(name);
    if (targetValue === value) {
      // This is default value we can ignore it.
      return;
    }

    const priority = sourceStyle.getPropertyPriority(name);
    targetStyle.setProperty(name, value, priority);
  });
}

const VIEWPORT_STYLE_WHITE_LIST = new Set([
  "block-size",
  "display",
  "height",
  "opacity",
  "position",
  "transform-origin",
  "width",
  "z-index",
]);

function updateViewport(source: HTMLElement, target: HTMLElement) {
  applyComputedStyles(source as any, target, VIEWPORT_STYLE_WHITE_LIST);
}

/**
 * Invoke on parent of all edge labels.
 */
function updateEdgeLabelRenderer({ style }: HTMLElement) {
  style.color = `light-dark(${lightForegroundColor}, ${darkForegroundColor})`;
}

/**
 * Invoked on every edge label.
 */
function updateEdgeLabelStyle({ style }: HTMLElement) {
  // Color is inherited from parent.
  style.color = "";
  style.backgroundColor = `light-dark(${lightBackgroundColor},${darkBackgroundColor})`;
}

/**
 * Wrap given node into SVG element.
 */
function nodeToDataURL(node: Node, width: number, height: number): string {
  const xmlns = "http://www.w3.org/2000/svg";

  const foreignObject = document.createElementNS(xmlns, "foreignObject");
  foreignObject.setAttribute("width", "100%");
  foreignObject.setAttribute("height", "100%");
  foreignObject.setAttribute("x", "0");
  foreignObject.setAttribute("y", "0");
  foreignObject.setAttribute("externalResourcesRequired", "true");
  foreignObject.appendChild(node);

  const svg = document.createElementNS(xmlns, "svg");
  svg.setAttribute("width", String(width));
  svg.setAttribute("height", String(height));
  svg.setAttribute("viewBox", `0 0 ${width} ${height}`);
  svg.appendChild(foreignObject);
  svg.style.colorScheme = "light dark";
  svg.style.backgroundColor =
    `light-dark(${lightBackgroundColor},${darkBackgroundColor})`;

  const xml = new XMLSerializer().serializeToString(svg);
  const prettyXml = formatXml(xml);
  return prettyXml;
}

/**
 * Given XML string return a pretty printed version.
 */
function formatXml(xml: string): string {
  let formatted = "";
  let indent = "";
  const tab = "\t";
  xml.split(/>\s*</).forEach((node) => {
    if (node.match(/^\/\w/)) indent = indent.substring(tab.length);
    formatted += indent + "<" + node + ">\r\n";
    if (node.match(/^<?\w[^>]*[^\/]$/)) indent += tab;
  });
  return formatted.substring(1, formatted.length - 3);
}
