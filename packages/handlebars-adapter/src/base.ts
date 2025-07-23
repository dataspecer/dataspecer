import Handlebars from "handlebars";
import { HandlebarsAdapter } from "./interface.ts";
import { Name } from "ajv";

export class BaseHandlebarsAdapter implements HandlebarsAdapter {
  protected readonly engine: typeof Handlebars;
  private resolvedFunctions: Map<() => Promise<unknown>, unknown> = new Map();
  private toAwait: Promise<unknown>[] = [];

  constructor() {
    this.engine = Handlebars.create();
  }

  async<T>(fn: () => Promise<T>): () => T {
    return (() => {
      if (this.resolvedFunctions.has(fn)) {
        return this.resolvedFunctions.get(fn);
      }
      const result = fn();
      if (result instanceof Promise) {
        const promise = result.then((r) => this.resolvedFunctions.set(fn, r));
        this.toAwait.push(promise);
      } else {
        return result;
      }
    }) as () => T;
  }

  partial = (template: string) => {
    return () => this.engine.compile(template, {compat: true});
  }

  async render(template: string, data: object, templates: Record<string, string> = {}): Promise<string> {
    const compiledTemplates = Object.fromEntries(
      Object.entries(templates).map(([name, template]) =>
        ([name, this.engine.compile(template, {compat: true})])
      )
    );

    const compiled = this.engine.compile(template, {compat: true});
    let result: string;
    do {
      this.toAwait = [];
      result = compiled(data, {partials: compiledTemplates, allowedProtoMethods: {
        isAttribute: true,
        isAssociation: true,
        isCustomType: true,
      }});
      await Promise.all(this.toAwait);
    } while (this.toAwait.length > 0);
    return result;
  }
}
