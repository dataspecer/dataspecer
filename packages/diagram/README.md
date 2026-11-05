# @dataspecer/diagram

Generate SVG diagrams from visual model. The input is a single visual model as a
set of entities and aggregated semantic models. The output is a standalone SVG
string that can be opened in a browser or embedded in HTML.

```ts
import { generateVisualModelSvg } from "@dataspecer/diagram";

const svg = generateVisualModelSvg(visualModel, aggregatedModels);
```

Aggregated models must contain all aggregated semantic models that are
referenced by the visual model and it must also contain a package model.

Third parameter is for customization options.

`measureVisualModelNodes(visualModel, aggregatedModels, options)` returns the
width and height of each rendered node, keyed by its visual entity ID. Layout
callers can use these dimensions before assigning positions. Include the final
attribute content and use the same aggregated models and options for measurement
and rendering so that labels, profile annotations, and font sizes agree.

---

The goal of this package is to produce visually identical diagram to the one
produced by the `conceptual-model-editor` application.
