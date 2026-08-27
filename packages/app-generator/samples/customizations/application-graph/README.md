# Application graph actions

These files turn the application-graph sample into a meta example: its detail page can export the
loaded RDF entity as application graph JSON or send that JSON to Dataspecer and download the
generated application (so the modeled application graph generates the app that creates itself).

After generating the application-graph sample, copy both TypeScript files into:

```text
src/modules/application-graph/
```

The downloaded ZIP is fresh generator output and does not inherit these two custom files. Copy them
into the new application if it should expose the same actions.
