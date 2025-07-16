export const MAIN_JSON_PARTIAL = "json-documentation";

export const defaultJsonPartials: Record<string, string> = {
  [MAIN_JSON_PARTIAL]: `<section>
<h3>{{#iflng "cs"}}Přehled JSON struktury{{lng}}Overview of JSON structure{{/iflng}}</h3>
<p>{{#iflng "cs"}}JSON Schéma zachycující strukturu pro{{lng}}The JSON Schema capturing the structure for{{/iflng}} <i>{{#humanLabel}}{{translate}}{{/humanLabel}}</i> {{#iflng "cs"}}je definováno v souboru{{lng}}is defined in file{{/iflng}} <a href="{{{artifact.json-schema.relativePath}}}"><code>{{artifact.json-schema.relativePath}}</code></a>. {{{translate infoText}}} <i>{{#structureModel}}{{#roots}}{{#classes}}{{#humanLabel}}{{translate}}{{/humanLabel}}{{/classes}}{{/roots}}{{/structureModel}}</i>.{{{translate infoText2}}}</p>

<ul>
{{#classes}}{{#inThisSchema}}
<li>
  <a href="#{{structureModelLinkId}}">
    {{#humanLabel}}{{translate}}{{/humanLabel}}
  </a>
<ul>
{{#properties}}
<li>
    <code>{{technicalLabel}}</code>:
    {{#if cardinalityIsRequired}}{{#iflng "cs"}}povinná{{lng}}required{{/iflng}}{{else}}{{#iflng "cs"}}nepovinná{{lng}}optional{{/iflng}}{{/if}}
    ({{cardinalityRange}}) {{#iflng "cs"}}položka typu{{lng}}item of type{{/iflng}} {{#dataTypes}}
      {{#isAssociation}}{{#dataType}}{{#isSimpleClass}}<strong>IRI (<a href="{{#pimClass}}{{href pimIri}}{{/pimClass}}">{{#humanLabel}}{{translate}}{{/humanLabel}}</a>)</strong>{{/isSimpleClass}}{{^isSimpleClass}}<strong><a href="#{{structureModelLinkId}}">{{#humanLabel}}{{translate}}{{/humanLabel}}</a></strong>{{/isSimpleClass}}{{/dataType}}{{/isAssociation}}
      {{#isAttribute}} {{#dataType}}<a href="{{{.}}}">{{translate (getLabelForDataType .)}}</a>{{#./regex}} {{#iflng "cs"}}dle regulárního výrazu{{lng}}by regular expression{{/iflng}} <code>{{{.}}}</code>{{/./regex}}{{/dataType}}{{^dataType}}{{#iflng "cs"}}bez datového typu{{lng}}without data type{{/iflng}}{{/dataType}}{{/isAttribute}}
    {{/dataTypes}}
</li>
{{/properties}}
</ul>
</li>
{{/inThisSchema}}{{/classes}}
</ul>

{{#classes}}{{#inThisSchema}}
<section id="{{structureModelLinkId}}">
<h3>{{#iflng "cs"}}Objekt{{lng}}Object{{/iflng}} <i>{{#humanLabel}}{{translate}}{{/humanLabel}}</i></h3>
<dl>
{{#humanDescription}}{{#translate}}
<dt>{{#iflng "cs"}}Popis{{lng}}Description{{/iflng}}</dt>
<dd>{{translation}}</dd>
{{/translate}}{{/humanDescription}}
<dt>{{#iflng "cs"}}Interpretace{{lng}}Interpretation{{/iflng}}</dt>
{{#pimClass}}
<dd>
  <a href="{{href pimIri}}">{{#humanLabel}}{{translate}}{{/humanLabel}}</a>
</dd>
{{/pimClass}}
</dl>

{{#properties}}
<section id="{{structureModelLinkId}}">
<h5>{{#iflng "cs"}}Vlastnost{{lng}}Property{{/iflng}} <code>{{technicalLabel}}</code></h5>
<dl>
<dt>{{#iflng "cs"}}Klíč{{lng}}Key{{/iflng}}</dt>
<dd>\`{{technicalLabel}}\`</dd>
<dt>{{#iflng "cs"}}Jméno{{lng}}Name{{/iflng}}</dt>
<dd>{{#humanLabel}}{{translate}}{{/humanLabel}}</dd>
{{#humanDescription}}{{#translate}}
<dt>{{#iflng "cs"}}Popis{{lng}}Description{{/iflng}}</dt>
<dd>{{translation}}</dd>
{{/translate}}{{/humanDescription}}
<dt>{{#iflng "cs"}}Povinnost{{lng}}Optionality{{/iflng}}</dt>
<dd>{{#if cardinalityIsRequired}}{{#iflng "cs"}}povinné{{lng}}required{{/iflng}}{{else}}{{#iflng "cs"}}nepovinné{{lng}}optional{{/iflng}}{{/if}}</dd>
<dt>{{#iflng "cs"}}Kardinalita{{lng}}Cardinality{{/iflng}}</dt>
<dd>{{cardinalityRange}}</dd>
<dt>{{#iflng "cs"}}Typ{{lng}}Type{{/iflng}}</dt>
{{#dataTypes}}

{{#isAssociation}}
{{#dataType}}
{{#isSimpleClass}}
<dd>
  IRI (<a href="{{#pimClass}}{{href pimIri}}{{/pimClass}}">{{#humanLabel}}{{translate}}{{/humanLabel}}</a>)
</dd>
{{/isSimpleClass}}
{{^isSimpleClass}}
<dd>
  <a href="{{externalDocumentation}}#{{#dataType}}{{structureModelLinkId}}{{/dataType}}">{{#dataType.humanLabel}}{{translate}}{{/dataType.humanLabel}}</a>
</dd>
{{/isSimpleClass}}
{{/dataType}}
{{/isAssociation}}

{{#isAttribute}}
<dd>
{{#dataType}}<a href="{{{.}}}">{{translate (getLabelForDataType .)}}</a>{{/dataType}}{{^dataType}}{{#iflng "cs"}}bez datového typu{{lng}}without data type{{/iflng}}{{/dataType}}
</dd>
{{/isAttribute}}

{{/dataTypes}}

{{#dataTypes}}{{#isAttribute}}{{#example}}
<dt>{{#iflng "cs"}}Příklad{{lng}}Example{{/iflng}}</dt>
<dd><div>{{.}}</div></dd>
{{/example}}{{/isAttribute}}{{/dataTypes}}

{{#dataTypes}}{{#isAttribute}}{{#./regex}}
<dt>{{#iflng "cs"}}Regulární výraz{{lng}}Regular expression{{/iflng}}</dt>
<dd><code>{{.}}</code></dd>
{{/./regex}}{{/isAttribute}}{{/dataTypes}}

<dt>{{#iflng "cs"}}Interpretace{{lng}}Interpretation{{/iflng}}</dt>
{{#pimAssociation}}
<dd>
<a href="{{href pimIri}}">{{#humanLabel}}{{translate}}{{/humanLabel}}</a>
</dd>
{{/pimAssociation}}
</dl>
</section>
{{/properties}}

</section>
{{/inThisSchema}}{{/classes}}

{{#classes}}{{#isFromExternalSchema}}
<section id="{{structureModelLinkId}}">
<h3>{{#iflng "cs"}}Referencovaný objekt{{lng}}Referenced object{{/iflng}} <i>{{#humanLabel}}{{translate}}{{/humanLabel}}</i></h3>
<dl>
{{#humanDescription}}{{#translate}}
<dt>{{#iflng "cs"}}Popis{{lng}}Description{{/iflng}}</dt>
<dd>{{translation}}</dd>
{{/translate}}{{/humanDescription}}
<dt>{{#iflng "cs"}}Interpretace{{lng}}Interpretation{{/iflng}}</dt>
{{#pimClass}}
<dd>
  <a href="{{href pimIri}}">{{#humanLabel}}{{translate}}{{/humanLabel}}</a>
</dd>
{{/pimClass}}
{{#classSpecificationArtifact}}
<dt>{{#iflng "cs"}}Schéma{{lng}}Schema{{/iflng}}</dt>
<dd>
  {{#iflng "cs"}}Schéma je definováno v{{lng}}Schema is defined in{{/iflng}} <a href="{{link}}">{{#semanticModel}}{{#humanLabel}}{{translate}}{{/humanLabel}}{{/semanticModel}}</a>.
</dd>
{{/classSpecificationArtifact}}
</dl>
</section>
{{/isFromExternalSchema}}{{/classes}}
</section>`,
};
