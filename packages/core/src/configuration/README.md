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
