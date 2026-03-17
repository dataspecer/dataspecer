import type { GenerationModel } from '../generation-model/types.ts';
import { FileTree } from './file-tree.ts';
import { buildRenderContext } from './render-context.ts';
import { join, relative } from 'node:path';
import { readdirSync, readFileSync } from 'node:fs';
import { Eta } from 'eta';

const eta = new Eta({
  autoTrim: false,
});

export function renderGeneratedApp(model: GenerationModel): FileTree {
  const tree = new FileTree();
  addStaticGeneratedAppAssets(tree);

  const context = buildRenderContext(model);
  tree.set('package.json', renderTemplate('package-json.eta', context));
  tree.set('tsconfig.json', renderTemplate('tsconfig-json.eta', context));
  tree.set('vite.config.ts', renderTemplate('vite-config-ts.eta', context));
  tree.set('index.html', renderTemplate('index-html.eta', context));
  tree.set('README.md', renderTemplate('readme.eta', context));
  tree.set('src/main.tsx', renderTemplate('main-tsx.eta', context));
  tree.set('src/App.tsx', renderTemplate('app-tsx.eta', context));
  tree.set('src/routes.tsx', renderTemplate('routes-tsx.eta', context));
  tree.set(
    'src/data-source/create-data-source.ts',
    renderTemplate('create-data-source-ts.eta', context)
  );
  tree.set(
    'src/generated/operation-registry.ts',
    renderTemplate('operation-registry-ts.eta', context)
  );

  context.aggregates.forEach((aggregate) => {
    tree.set(
      `src/modules/${aggregate.moduleName}/model.ts`,
      renderTemplate('aggregate-model-ts.eta', {
        ...context,
        aggregate,
      })
    );
    tree.set(
      `src/modules/${aggregate.moduleName}/descriptor.ts`,
      renderTemplate('aggregate-descriptor-ts.eta', {
        ...context,
        aggregate,
      })
    );
    tree.set(
      `src/modules/${aggregate.moduleName}/ldkit-schema.ts`,
      renderTemplate('aggregate-ldkit-schema-ts.eta', {
        ...context,
        aggregate,
      })
    );
  });

  context.pages.forEach((page) => {
    tree.set(
      `src/modules/${page.moduleName}/${page.operation.routeId}-operation.ts`,
      renderTemplate('operation-override-ts.eta', {
        ...context,
        page,
      })
    );
    tree.set(
      `src/pages/${page.fileName}`,
      renderTemplate('operation-page-tsx.eta', {
        ...context,
        page,
      })
    );
  });

  return tree;
}

function renderTemplate(templateName: string, data: object): string {
  const template = readFileSync(
    join(import.meta.dirname, '..', 'templates', 'generated-app', templateName),
    'utf8'
  );

  return eta.renderString(template, data);
}

function addStaticGeneratedAppAssets(fileTree: FileTree): void {
  const root = join(import.meta.dirname, '..', '..', 'static', 'generated-app');
  for (const filePath of collectFiles(root)) {
    fileTree.set(relative(root, filePath), readFileSync(filePath, 'utf8'));
  }
}

function collectFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const entryPath = join(directory, entry.name);
    return entry.isDirectory() ? collectFiles(entryPath) : [entryPath];
  });
}
