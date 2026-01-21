import { DataPsmSchema } from "@dataspecer/core/data-psm/model";
import { DataPsmSchemaXmlExtension } from "@dataspecer/core/data-psm/xml-extension/model";
import { useFederatedObservableStore } from "@dataspecer/federated-observable-store-react/store";
import { useResource } from "@dataspecer/federated-observable-store-react/use-resource";
import { Alert, Box, Button, Collapse, FormControl, FormControlLabel, FormLabel, Grid, Radio, RadioGroup, Switch, TextField, Typography } from "@mui/material";
import { isEqual } from "lodash";
import React, { memo, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useTranslation, Trans } from "react-i18next";
import { InfoHelp } from "../../../../components/info-help";
import { SetCardinalityPsm } from "../../../operations/set-cardinality";
import { SetRootCollection } from "../../../operations/set-root-collection";
import { SetTechnicalLabel } from "../../../operations/set-technical-label";
import { XmlSetSchemaNamespace } from "../../../operations/xml-set-schema-namespace";
import { Cardinality, CardinalitySelector } from "../../helper/cardinality-selector";
import { useSaveHandler } from "../../helper/save-handler";
import { InDifferentLanguages } from "./InDifferentLanguages";
import { skip } from "node:test";
import { XmlSetSkipRootElement } from "../../../operations/xml-set-skip-root-element";
import { SetKeyValue } from "./set-key-value";
import { SetJsonPrefixes } from "../../../operations/set-json-prefixes";
import { SetJsonTypeMapping } from "../../../operations/set-json-type-mapping";
import { SetJsonEnforceContext } from "../../../operations/set-json-enforce-context";
import { BulkUpdateTechnicalLabelsDialog } from "./bulk-update-technical-labels-dialog";
import { DefaultConfigurationContext } from "../../../../application";

function cardinalityFromPsm(entity?: DataPsmSchema): Cardinality {
  return {
    cardinalityMin: entity?.dataPsmCardinality ? entity.dataPsmCardinality[0] : 1,
    cardinalityMax: entity?.dataPsmCardinality ? entity.dataPsmCardinality[1] : 1,
  };
}

const defaultXmlContainer = "root";

export const DataPsmSchemaCard: React.FC<{ iri: string; onClose: () => void }> = memo(({ iri }) => {
  const { t } = useTranslation("detail");
  const store = useFederatedObservableStore();
  const defaultConfiguration = useContext(DefaultConfigurationContext);
  const [bulkUpdateDialogOpen, setBulkUpdateDialogOpen] = useState(false);

  const { resource } = useResource<DataPsmSchema>(iri);
  const label = resource?.dataPsmHumanLabel ?? {};
  const description = resource?.dataPsmHumanDescription ?? {};

  const xmlData = useMemo(() => (resource ? DataPsmSchemaXmlExtension.getExtensionData(resource) : null), [resource]);

  const [namespaceEnabled, setNamespaceEnabled] = useState(
    xmlData !== null && (xmlData.namespace !== null || xmlData.namespacePrefix !== null)
  );
  const [namespace, setNamespace] = useState(xmlData?.namespace ?? "");
  const [namespacePrefix, setNamespacePrefix] = useState(xmlData?.namespacePrefix ?? "");

  useEffect(() => {
    if (xmlData) {
      const enabled = xmlData.namespace !== null || xmlData.namespacePrefix !== null;
      setNamespaceEnabled(enabled);
      if (enabled) {
        setNamespace(xmlData.namespace as string);
        setNamespacePrefix(xmlData.namespacePrefix as string);
      }
    }
  }, [xmlData]);

  useSaveHandler(
    xmlData !== null &&
      (xmlData.namespace !== (namespaceEnabled ? namespace : null) ||
        xmlData.namespacePrefix !== (namespaceEnabled ? namespacePrefix : null)),
    useCallback(
      async () =>
        await store.executeComplexOperation(
          new XmlSetSchemaNamespace(iri, namespaceEnabled ? namespacePrefix : null, namespaceEnabled ? namespace : null)
        ),
      [store, iri, namespaceEnabled, namespacePrefix, namespace]
    )
  );

  const [technicalLabel, setTechnicalLabel] = useState<string>("");
  useEffect(() => {
    setTechnicalLabel(resource?.dataPsmTechnicalLabel ?? "");
  }, [resource]);
  useSaveHandler(
    resource !== null && (resource.dataPsmTechnicalLabel ?? "") !== technicalLabel,
    useCallback(
      async () =>
        resource &&
        (await store.executeComplexOperation(new SetTechnicalLabel(resource.iri as string, technicalLabel))),
      [resource, store, technicalLabel]
    )
  );

  // region cardinality
  const [cardinality, setCardinality] = useState<Cardinality>(cardinalityFromPsm());

  useEffect(() => {
    setCardinality(cardinalityFromPsm(resource));
  }, [resource]);

  useSaveHandler(
    resource && !isEqual(cardinality, cardinalityFromPsm(resource)),
    useCallback(
      async () =>
        resource &&
        (await store.executeComplexOperation(
          new SetCardinalityPsm(iri, cardinality)
        )),
      [resource, iri, store, cardinality]
    )
  );
  // endregion

  // region xml container
  const [rootCollection, setRootCollection] = useState<{
    enforce: boolean;
    technicalLabel: string | null;
  }>({
    enforce: false,
    technicalLabel: null,
  });
  useEffect(() => {
    if (resource) {
      setRootCollection({
        enforce: resource.dataPsmEnforceCollection,
        technicalLabel: resource.dataPsmCollectionTechnicalLabel,
      });
    }
  }, [resource]);
  useSaveHandler(
    resource &&
      !isEqual(rootCollection, {
        enforce: resource.dataPsmEnforceCollection,
        technicalLabel: resource.dataPsmCollectionTechnicalLabel,
      }),
    useCallback(
      async () =>
        resource &&
        (await store.executeComplexOperation(
          new SetRootCollection(iri, rootCollection.enforce, rootCollection.technicalLabel)
        )),
      [resource, rootCollection]
    )
  );
  const currentXmlContainer = rootCollection.technicalLabel && rootCollection.technicalLabel.length > 0 ? rootCollection.technicalLabel : defaultXmlContainer;
  // endregion

  // region skip root element
  const [skipRootElement, setSkipRootElement] = useState(xmlData.skipRootElement === true);
  useEffect(() => {
    if (xmlData) {
      setSkipRootElement(xmlData.skipRootElement === true);
    }
  }, [xmlData]);
  useSaveHandler(
    xmlData !== null &&
    (xmlData.skipRootElement === true) !== skipRootElement,
    useCallback(
      async () =>
        await store.executeComplexOperation(
          new XmlSetSkipRootElement(iri, skipRootElement)
        ),
      [store, iri, skipRootElement]
    )
  );
  // endregion

  // region JSON prefixes
  const [jsonPrefixes, setJsonPrefixes] = useState<Record<string, string>>({});
  useEffect(() => {
    if (resource) {
      const prefixes = resource.jsonLdDefinedPrefixes ?? {};
      setJsonPrefixes(prefixes);
    }
  }, [resource]);
  useSaveHandler(
    resource && !isEqual(resource.jsonLdDefinedPrefixes ?? {}, jsonPrefixes),
    () => store.executeComplexOperation(new SetJsonPrefixes(iri, jsonPrefixes))
  );
  // endregion

  // region JSON type mapping
  const [jsonTypeMapping, setJsonTypeMapping] = useState<Record<string, string>>({});
  useEffect(() => {
    if (resource) {
      const prefixes = resource.jsonLdDefinedTypeMapping ?? {};
      setJsonTypeMapping(prefixes);
    }
  }, [resource]);
  useSaveHandler(
    resource && !isEqual(resource.jsonLdDefinedTypeMapping ?? {}, jsonTypeMapping),
    () => store.executeComplexOperation(new SetJsonTypeMapping(iri, jsonTypeMapping))
  );
  // endregion

  // region JSON context enforcement
  const [jsonEnforceContext, setJsonEnforceContext] = useState<"no" | "as-is" | "with-extensions">("no");
  useEffect(() => {
    if (resource) {
      const enforceContext = resource.jsonEnforceContext ?? "no";
      setJsonEnforceContext(enforceContext);
    }
  }, [resource]);
  useSaveHandler(
    resource && resource.jsonEnforceContext !== jsonEnforceContext,
    () => store.executeComplexOperation(new SetJsonEnforceContext(iri, jsonEnforceContext))
  );
  // endregion

  return (
    <>
      <Grid container spacing={5} sx={{ pt: 3 }}>
        <Grid item xs={6}>
          <InDifferentLanguages label={label} description={description} iri={iri} resourceType="dataPsm" />
        </Grid>
        <Grid item xs={6}>
          <Box sx={{ mb: 3 }}>
            <Typography variant="subtitle1" component="h2">
              {t("label technical label")}
            </Typography>
            <TextField
              autoFocus
              margin="dense"
              //label={t('label technical label')}
              hiddenLabel
              fullWidth
              variant="filled"
              value={technicalLabel}
              onChange={(event) => setTechnicalLabel(event.target.value)}
            />
            <Button 
              variant="text" 
              size="small"
              onClick={() => setBulkUpdateDialogOpen(true)}
              sx={{ mt: 1 }}
            >
              {t("bulk update technical labels.button text")}
            </Button>
          </Box>

          <Box sx={{ mb: 3 }}>
            <Typography variant="subtitle1" component="h2">
              {t("title cardinality")}{" "}
              <InfoHelp text={t("title cardinality help")} />
            </Typography>

            {cardinality && <CardinalitySelector value={cardinality} onChange={setCardinality} />}
          </Box>

          <Typography variant="h6" component="h2">
            {t("JSON attributes")}
          </Typography>

          <Typography variant="subtitle1" component="h2" sx={{mt: 2}} id="json-context-enforcement">
            {t("JSON enforce @context.title")}
            <InfoHelp text={t("JSON enforce @context.help")} />
          </Typography>

          <FormControl>
            <RadioGroup
              row
              aria-labelledby="json-context-enforcement"
              value={jsonEnforceContext}
              onChange={(event) => {
                const value = event.target.value as "no" | "as-is" | "with-extensions";
                setJsonEnforceContext(value);
              }}
            >
              <FormControlLabel value="no" control={<Radio />} label={t("JSON enforce @context.option.no")} />
              <FormControlLabel value="as-is" control={<Radio />} label={t("JSON enforce @context.option.as-is")} />
              <FormControlLabel value="with-extensions" control={<Radio />} label={t("JSON enforce @context.option.with-extensions")} />
            </RadioGroup>
          </FormControl>

          <Typography variant="subtitle1" component="h2" sx={{mt: 2}}>
            {t("JSON-LD IRI prefixes")}
            <InfoHelp text={t("JSON-LD IRI prefixes help")} />
          </Typography>


          <Box sx={{mt: 0}}>
            <SetKeyValue
              currentKV={jsonPrefixes}
              setCurrentKV={setJsonPrefixes}

              keyTitle="prefix"
              valueTitle="IRI"
              keyWidthPercent={20}
            />
          </Box>

          <Typography variant="subtitle1" component="h2" sx={{mt: 2}}>
            {t("JSON-LD type mapping")}
            <InfoHelp text={t("JSON-LD type mapping help")} />
          </Typography>

          <Box sx={{mt: 0}}>
            <SetKeyValue
              currentKV={jsonTypeMapping}
              setCurrentKV={setJsonTypeMapping}

              keyTitle="IRI"
              valueTitle="text"
              keyWidthPercent={60}
            />
          </Box>

          <Typography variant="h6" component="h2" sx={{mt: 3}}>
            {t("XML attributes")}
          </Typography>

          <Typography variant="subtitle1" component="h2" sx={{ mt: 2 }}>
            <Switch checked={namespaceEnabled} onChange={(e) => setNamespaceEnabled(e.target.checked)} />
            {t("XML namespace")}
          </Typography>

          <Grid container spacing={2} alignItems="center" sx={{ mb: 3 }}>
            <Grid item xs={3}>
              <TextField
                margin="dense"
                label={t("XML prefix")}
                fullWidth
                variant="filled"
                value={namespacePrefix}
                onChange={(event) => setNamespacePrefix(event.target.value)}
                disabled={!namespaceEnabled}
              />
            </Grid>
            <Grid item xs={9}>
              <TextField
                margin="dense"
                label={t("XML namespace")}
                fullWidth
                variant="filled"
                value={namespace}
                onChange={(event) => setNamespace(event.target.value)}
                disabled={!namespaceEnabled}
              />
            </Grid>
          </Grid>

          <Box sx={{ mb: 3 }}>
            <Typography variant="subtitle1" component="h2" sx={{ mt: 2 }}>
              <Switch checked={skipRootElement} onChange={(e) => setSkipRootElement(e.target.checked)} />
              {t("XML skip root element")}
            </Typography>

            <Collapse in={!skipRootElement}>
              <Typography variant="subtitle1" component="h2">
                {t("XML root container name")}
                <InfoHelp text={t("XML root container name help")} />
              </Typography>

              <Collapse in={!isEqual(cardinality, cardinalityFromPsm()) && !rootCollection.enforce}>
                <Alert severity="info">
                  <Trans i18nKey="XML root container alert" t={t} values={{ container: currentXmlContainer }}>
                    <code />
                  </Trans>
                </Alert>
              </Collapse>

              <div style={{ display: "flex", gap: ".5em", alignItems: "flex-start" }}>
                <FormControlLabel
                  sx={{ mt: 2, flexShrink: 0 }}
                  control={<Switch checked={rootCollection.enforce} onChange={(e) => setRootCollection(c => ({...c, enforce: e.target.checked}))} />}
                  label={t("XML root container always use")}
                />
                <TextField
                  autoFocus
                  margin="dense"
                  hiddenLabel
                  fullWidth
                  variant="filled"
                  value={rootCollection.technicalLabel}
                  onChange={(event) => setRootCollection(c => ({...c, technicalLabel: event.target.value}))}
                />
              </div>
            </Collapse>
          </Box>
        </Grid>
      </Grid>

      <BulkUpdateTechnicalLabelsDialog 
        open={bulkUpdateDialogOpen}
        onClose={() => setBulkUpdateDialogOpen(false)}
        schemaIri={iri}
        defaultConfiguration={defaultConfiguration}
      />
    </>
  );
});
