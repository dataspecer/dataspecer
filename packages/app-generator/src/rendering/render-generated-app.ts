import type { GenerationModel } from '../generation-model/types.ts';
import { FileTree } from './file-tree.ts';
import { buildRenderContext } from './render-context.ts';
import { Eta } from 'eta';
import { generatedAppAssets } from '../generated/generated-app-assets.ts';

const eta = new Eta({
  autoTrim: false,
});

const TEMPLATE_SUFFIX = '.eta';

/**
 * Templates rendered more than once, which the tree cannot place on its own. Their paths say where
 * their output goes: `{module}` is one per data structure and `{route}` one per page.
 */
const MODULE_TEMPLATE = 'src/modules/{module}';
const PER_AGGREGATE = ['model.ts', 'descriptor.ts', 'ldkit-schema.ts'].map(
  (name) => `${MODULE_TEMPLATE}/${name}${TEMPLATE_SUFFIX}`
);
const PER_PAGE = ['{route}-operation.ts', '{route}-page.tsx'].map(
  (name) => `${MODULE_TEMPLATE}/${name}${TEMPLATE_SUFFIX}`
);
const REPEATED_TEMPLATES = new Set([...PER_AGGREGATE, ...PER_PAGE]);

export function renderGeneratedApp(model: GenerationModel): FileTree {
  const tree = new FileTree();
  const context = buildRenderContext(model);

  // The asset tree mirrors the generated application, so a file lands where it sits, and a
  // template is the same path without its suffix.
  for (const [assetPath, content] of Object.entries(generatedAppAssets)) {
    if (REPEATED_TEMPLATES.has(assetPath)) {
      continue;
    }
    if (assetPath.endsWith(TEMPLATE_SUFFIX)) {
      tree.set(assetPath.slice(0, -TEMPLATE_SUFFIX.length), eta.renderString(content, context));
    } else {
      tree.set(assetPath, content);
    }
  }

  context.aggregates.forEach((aggregate) => {
    PER_AGGREGATE.forEach((template) => {
      tree.set(
        outputPath(template, { module: aggregate.moduleName }),
        renderTemplate(template, { ...context, aggregate })
      );
    });
  });

  context.pages.forEach((page) => {
    PER_PAGE.forEach((template) => {
      tree.set(
        outputPath(template, { module: page.moduleName, route: page.operation.routeId }),
        renderTemplate(template, { ...context, page })
      );
    });
  });

  return tree;
}

function outputPath(template: string, values: Record<string, string>): string {
  return template
    .slice(0, -TEMPLATE_SUFFIX.length)
    .replace(/\{(\w+)\}/g, (match, name: string) => values[name] ?? match);
}

function renderTemplate(templatePath: string, data: object): string {
  const template = generatedAppAssets[templatePath as keyof typeof generatedAppAssets];
  if (template === undefined) {
    throw new Error(`Missing generated application template "${templatePath}".`);
  }
  return eta.renderString(template, data);
}
