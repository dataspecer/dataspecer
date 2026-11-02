# Legacy database conversion

Set this in .env in root:

```env
OPENAI_API_KEY=
OPENAI_BASE_URL='https://llm.ai.e-infra.cz/v1/'
OPENAI_MODEL='mini'
```

Run from the repository root with Bun and the workspace packages built:

```sh
bun services/backend/src/tools/convert-database.ts ../trusina/services/backend/database/
```

The endpoint must support Chat Completions with JSON object responses. The URL is
the API base URL, without `/chat/completions`. Credentials are only required when
an uncached configuration differs from the legacy defaults.

The tool dynamically imports `packages/template-artifact/src/configuration.ts`
from the source checkout containing the input database. Set
`LEGACY_TEMPLATE_CONFIGURATION` to a different configuration file if the database
was copied elsewhere. The source checkout is read only.

Legacy `template-artifact` overrides are merged with the original defaults before
generating per-template unified diffs. The AI receives those diffs, the original
defaults, and the current documentation defaults, and returns replacement
Handlebars partials. These are saved under the documentation configuration key
in the migrated generator configuration, alongside json, csv, client and
data-specification settings.

`services/backend/template-configuration-cache.json` stores the original value
and validated answer under a SHA-256 key. Object key order does not affect cache
hits. Each answer is written atomically before migration continues. Set
`TEMPLATE_CONFIGURATION_CACHE` to use another file. Run only one migration at a
time per cache file. Invalid responses fail the migration and are not cached;
automatic API retries are disabled.

Cached answers are reused even if the model, prompt or defaults change. Remove
an entry explicitly to regenerate it. Review generated partials: JSON validation
does not establish that the converted templates render correctly.

The output database remains `services/backend/database/`. As before, rerunning
the migration creates new projects; the cache avoids repeated AI calls, not
duplicate database imports. An interrupted API call before its answer is saved
may need to be repeated.
