import { isControlledVocabulary } from "@dataspecer/controlled-vocabulary-model";
import { Entity } from "@dataspecer/core-v2";
import { isControlledVocabularyAssignment, normalizeQualifier } from "@dataspecer/core-v2/semantic-model/profile/concepts";
import { useResource } from "@dataspecer/federated-observable-store-react/use-resource";
import { Box, Card, Chip, Link, Typography } from "@mui/material";
import React from "react";
import { useTranslation } from "react-i18next";
import { CardContent } from "../../../mui-overrides";
import { LanguageStringText } from "../../helper/LanguageStringComponents";

/**
 * Shows the controlled vocabularies assigned to a class profile, read-only.
 * The assignments are edited in the Conceptual Model Editor.
 */
export const ControlledVocabularies: React.FC<{
    classProfileId: string,
    assignmentIds: string[],
}> = ({classProfileId, assignmentIds}) => <>
    {assignmentIds.map(assignmentId =>
        <ControlledVocabularyItem key={assignmentId} classProfileId={classProfileId} assignmentId={assignmentId} />
    )}
</>;

const ControlledVocabularyItem: React.FC<{
    classProfileId: string,
    assignmentId: string,
}> = ({classProfileId, assignmentId}) => {
    const {t} = useTranslation("detail");

    const {resource: assignmentResource} = useResource<Entity>(assignmentId);
    const assignment = assignmentResource !== null && isControlledVocabularyAssignment(assignmentResource) ? assignmentResource : null;

    const {resource: vocabularyResource} = useResource<Entity>(assignment?.vocabulary ?? null);
    const vocabulary = vocabularyResource !== null && isControlledVocabulary(vocabularyResource) ? vocabularyResource : null;

    if (assignment === null) {
        return <Card sx={{mb: 1}}><CardContent>
            <Typography variant="body2" color="textSecondary">{t("controlled vocabularies.assignment not found")} {assignmentId}</Typography>
        </CardContent></Card>;
    }

    const qualifier = normalizeQualifier(assignment.qualifier);

    return <Card sx={{mb: 1}}><CardContent>
        <Box sx={{display: "flex", flexWrap: "wrap", alignItems: "center", gap: 1, mb: 1}}>
            <Typography variant="subtitle2" component="h3">
                {vocabulary === null
                    ? <i>{t("controlled vocabularies.vocabulary not found")} {assignment.vocabulary}</i>
                    : <LanguageStringText from={vocabulary.title} fallback={<i>{t("controlled vocabularies.no title")}</i>} />}
            </Typography>
            {assignment.classProfile !== classProfileId &&
                <Chip size="small" label={t("controlled vocabularies.assigned from profiled")} />}
            {assignment.replaces !== null &&
                <Chip size="small" label={t("controlled vocabularies.replaces assigned from profiled")} />}
        </Box>

        <Field label={t("controlled vocabularies.usage")}>
            {t(`controlled vocabularies.qualifier.${qualifier}`, {defaultValue: qualifier})}
        </Field>

        {vocabulary !== null && <>
            <Field label={t(vocabulary.conformsToSkos ? "controlled vocabularies.scheme" : "controlled vocabularies.reference")}>
                <UrlText value={vocabulary.references} />
            </Field>
            <Field label={t("controlled vocabularies.iri")}>
                <UrlText value={vocabulary.iri} />
            </Field>
            <Field label={t("controlled vocabularies.pattern")}>
                {vocabulary.pattern === null ? null : <code>{vocabulary.pattern}</code>}
            </Field>
            <Field label={t("controlled vocabularies.documentation")}>
                <UrlText value={vocabulary.documentation} />
            </Field>
            <Field label={t("controlled vocabularies.access url")}>
                <UrlText value={vocabulary.distribution.accessUrl} />
            </Field>
            <Field label={t("controlled vocabularies.download url")}>
                <UrlText value={vocabulary.distribution.downloadUrl} />
            </Field>
        </>}
    </CardContent></Card>;
};

/**
 * A labeled value that is not shown when there is no value.
 */
const Field: React.FC<{label: string, children: React.ReactNode}> = ({label, children}) => {
    if (children === null || children === undefined || children === false || children === "") {
        return null;
    }
    return <Typography variant="body2" component="div" sx={{wordBreak: "break-word"}}>
        <strong>{label}:</strong> {children}
    </Typography>;
};

/**
 * Shows the value as a link when it is a web address, otherwise as a plain text.
 * The values are free text, so only http and https addresses are linked.
 */
const UrlText: React.FC<{value: string | null}> = ({value}) => {
    if (value === null || value === "") {
        return null;
    }
    if (/^https?:\/\//i.test(value)) {
        return <Link href={value} target="_blank" rel="noopener noreferrer">{value}</Link>;
    }
    return <>{value}</>;
};
