# Configuration

Configuration is a mechanism for passing structured information to generators
and other consumers that can be overridden by the user.

The idea is that each scope defines its own default config values and then the
configuration object may override them. Its structure is a `Record<scope, data>`
where `scope` is a string key and `data` is an arbitrary object. Each scope then
defines resolve function that takes a list of those records and merges them into
a single configuration object for that scope.

---

Configuration may be defined for project in the model of the given package or in
the generator configuration file. Unifying this is a future work. Definition of
operations is also a future work.

## Meta configuration

A layer can include `meta: { imports: ["preset-iri", ...] }`.
`configurationImports(iris)` creates this scope. Before resolving individual
scopes, call `expandConfigurationImports(chain, registry)`, where the registry
maps IRIs to ordinary configuration objects. IRIs identify registered presets;
the expansion never performs network requests.

Imports expand recursively, in their listed order, immediately before the layer
that imports them. Consequently later imports take precedence over earlier
imports, and explicit settings in the importing layer take precedence over all
its imports. Repeated imports apply again at their position in the chain.
Unknown IRIs, cycles and malformed import lists throw explanatory errors.

Expansion preserves the original objects and consumes import directives in the
returned layers. The result can be expanded again without applying presets a
second time. Keep the original configuration for persistence and export; the
expanded chain is a view used by consumers. Scope-specific merging remains the
responsibility of each scope's resolver.
