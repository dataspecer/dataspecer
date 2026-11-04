# EU Vocabularies source (Reference Data Catalogue)

Finds vocabularies of the EU Vocabularies Reference Data Catalogue (Publications Office) and prefills the vocabulary form from them. Read this before changing a query or the metadata rules.

## Endpoint: why data.europa.eu and not Cellar
- **Used:** `https://data.europa.eu/sparql` (European Data Portal, Virtuoso, GET). It sends `access-control-allow-origin: *`, so the browser can call it.
- **Not usable:** the Cellar endpoint `https://publications.europa.eu/webapi/rdf/sparql` has the raw SKOS schemes and concepts, but sends **no CORS headers** (neither on GET nor on the preflight), so a browser blocks it. Using it would need a backend proxy. The `op.europa.eu` variants redirect or return 404.
- **Download files have no CORS either** (`op.europa.eu/o/opportal-service/euvoc-download-handler?...`). The distribution files therefore cannot be read; metadata is derived without them.
- Same Virtuoso cost limit (error 42000, 60 s) as NKOD. A pattern that selects a title of one language directly on a single record, e.g. `FILTER(lang(?t)='en')`, is rejected as too expensive (a filter inside the query that lists all vocabularies is fine).
- **The whole catalogue is read once and paged locally.** Paging, counting and searching on the endpoint took 3 to 8 s per page when the endpoint was cold (the page, the count and the group names each paid the cold start at once), and 0.1 to 0.3 s when warm; the shape of the query made no difference. With 243 vocabularies it is cheaper to read them all: one query (id, group, English and Czech titles, about 155 KB, 1 to 3 s) plus one for the group names (12 KB), then every page, search, sort and count is instant. The catalogue is cached for the session by `createCatalogueListing` (`../catalogue.ts`) and read again after a failure.

## What is a vocabulary here
The catalogue is `http://data.europa.eu/88u/catalogue/publ`: 387 `dcat:Dataset` records (a similar `…/catalogue/vocabularies` has only 30 DCAT-AP helper lists, it is not this one).
Vocabularies are the records with `dct:type` (`…/authority/dataset-type/…`) **NAL, CODE_LIST, TAXONOMY or THESAURUS: 243 records** (176 NAL, 49 TAXONOMY, 10 THESAURUS, 8 CODE_LIST). Other types (IEPD 47, ENVIRONMENTAL 14, …) are left out.
A named authority list (NAL) is an EU authority table such as countries or languages.
Search covers the English and Czech titles only, since only those are loaded for the listing.

## Record structure used
| Need | Property |
|---|---|
| Title | `dct:title`, about 24 languages (see below) |
| Group | `dct:creator` (corporate-body IRI) if it is an IRI, else `dct:publisher` (always the Publications Office). Name: `skos:prefLabel` of that IRI. |
| Identifier | `dct:identifier`, e.g. `country` (used for the scheme IRI of a NAL) |
| Type | `dct:type` |
| Documentation | `foaf:page`, else `dcat:landingPage` (both point to the vocabulary page on op.europa.eu) |
| Distributions | `dcat:distribution` -> `dct:title`, `dct:format` (EU file-type IRI, always present), `dcat:accessURL`, `dcat:downloadURL` (always present) |

- **Groups:** 55 vocabularies have no creator, so the group is "creator, else publisher": Publications Office 187, Eurostat 56 (total 243).
- **Titles:** the listing reads English and Czech only; the record read for the form has all languages, which are put in the form. Only English and a few Czech ones are real; most others are machine translations tagged like `cs-t-en-t0-mtec`. `toLanguageString` (`../sparql-utils.ts`) cuts the tag to its primary subtag, and a bare tag (`cs`) wins over a derived one.
- Records have 1 to 29 distributions; many are XML schema files, not vocabularies. Records have no `dcat:accessService`, no JSON-LD, and no SPARQL distribution.

## Files
- `listing.ts` – the two queries that read the catalogue (`catalogueQuery`, `groupNamesQuery`) and the constants of the catalogue. Everything else of the listing (merging, sorting by English title, groups, search, paging) is the shared `../catalogue.ts`. The listing has English and Czech titles only (the languages of the app); the form gets all titles from the record (`detail.ts`).
- `detail.ts` – record query (UNION of plain patterns: titles, identifier, type, page, landing page) and distributions query; `buildDetail` returns `EuCandidateDetail` (adds `identifier`, `isNamedAuthorityList`).
- `distribution.ts` – format names (shared `../file-types.ts`), `carriesSkos`, ranking.
- `metadata.ts` – `readMetadata`, scheme IRI and regex derivation.
- `eu-source.ts` – wires it into `VocabularySource` (`EU_SPARQL_ENDPOINT`) with `createCatalogueListing`.

## Distributions
- Rank: RDF/XML, Turtle, generic `RDF`, CSV, XML, JSON, then others (ZIP, XLS, …). Among files of one format the title decides: `SKOS_CORE`, `SKOS_AP_EU`, `SKOS_AP_ACT`, then others, then by IRI. So the default is usually the `SKOS_CORE` RDF/XML file.
- Only RDF/XML, Turtle and RDF carry SKOS (`conformsToSkos` true). Any other format gives false and the vocabulary is referenced by the file address.
- `readable` is true for every distribution of a NAL record and false for the other types. It only decides what the user is told; nothing is read from the file.

## How metadata are derived (`metadata.ts`)
| Form field | From |
|---|---|
| Name | all record titles (untagged ones go under the UI language) |
| Documentation | `foaf:page`, else `dcat:landingPage` |
| Access / download URL | distribution `accessURL` / `downloadURL` (download checkbox on) |
| `conformsToSkos` | by format, see above |
| Scheme IRI | **NAL only:** `http://publications.europa.eu/resource/authority/<dct:identifier>` (identifier must match `[A-Za-z0-9._-]+`). Other types: empty + `noSchemeIri` warning. Non-SKOS distribution: the file address. |
| Regex | **NAL only:** from up to 200 values found with `?v skos:inScheme <scheme>` on data.europa.eu (`buildIriPattern`), plus 5 sample IRIs. If the catalogue has no values: the convention `^<scheme IRI>/.*$`, no samples, no warning. If the endpoint fails: the convention regex + `valuesNotLoaded` warning. |

### Why only NALs
- **NAL (176):** the scheme exists for 172 of 176 (missing in Cellar: `treaty-classification`, `com-internal-procedure`, `com-internal-event`, `com-internal-consultation-type`). The IRIs of the values are always `<scheme IRI>/<code>` (10 tables sampled, 100%). But data.europa.eu holds the **values of only 22 of the 176** (the DCAT-AP-related ones, e.g. country, language, file-type, data-theme); for the other 154 the regex comes from the convention.
- **TAXONOMY / THESAURUS / CODE_LIST (67, 51 with an identifier):** no usable convention. Scheme IRIs have per-dataset opaque namespaces (geonom2024 -> `data.europa.eu/4j8/geonom/geonom2024`, prodcom2024 -> `…/qw1/prodcom2024/prodcom2024`, nace2.1 -> `…/ux2/nace2.1/nace2.1`, cpa22 -> `…/ehl/cpa22/cpa22`, lucas2022 -> `…/oxm/lucas2022/lucas`, eurovoc -> `eurovoc.europa.eu/100141`, nuts -> `data.europa.eu/nuts`). Several are not in Cellar SPARQL at all (waste-category, agriprod, classification-level, combined-nomenclature-2024), and data.europa.eu has their values only for nuts and eurovoc. So the form is filled by hand.

## Known gaps and ideas
- Taxonomies, thesauri and code lists need manual scheme IRI and regex. A backend proxy to Cellar (or CORS on the Publications Office side) would allow looking the scheme up; a mapping table could cover the common ones.
- Czech titles are mostly machine translations.
- Distributions of other formats (CSV, XML) are listed but give no scheme IRI; the XML ones are often technical schema files.
- `npm run i18n` (i18next-cli) rewrites the locale files into a broken nested format here; edit `locales/*/default.json` by hand.

## Adding or fixing
- Shared helpers: `../sparql-utils.ts`, `../file-types.ts`, `../iri-pattern.ts`. Contract: `../types.ts`. Registration and the user-facing explanation of the derivation: `../registry.ts`.
- Check every query live before wiring it (watch the cost limit), and do not unit-test query text: test mapping, escaping and validation.
