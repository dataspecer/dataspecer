import React from "react";
import {Alert, Box, Container, Fab, Paper, Skeleton, Stack, Typography, useTheme} from "@mui/material";
import {useTranslation} from "react-i18next";
import CloseIcon from '@mui/icons-material/Close';
import {useSingleGeneratedFileArtifact} from "./use-single-generated-file-artifact";
import {Light as SyntaxHighlighter, PrismLight as PrismSyntaxHighlighter} from "react-syntax-highlighter";
import {githubGist, vs2015} from "react-syntax-highlighter/dist/esm/styles/hljs";
import {coy, vscDarkPlus} from "react-syntax-highlighter/dist/esm/styles/prism";
import json from 'react-syntax-highlighter/dist/esm/languages/hljs/json';
import xml from 'react-syntax-highlighter/dist/esm/languages/hljs/xml';
import yaml from 'react-syntax-highlighter/dist/esm/languages/hljs/yaml';
import sparql from 'react-syntax-highlighter/dist/esm/languages/prism/sparql';
import turtle from 'react-syntax-highlighter/dist/esm/languages/prism/turtle';
import {useAsyncMemo} from "../../hooks/use-async-memo";

SyntaxHighlighter.registerLanguage("json", json);
SyntaxHighlighter.registerLanguage("jsonld", json);
SyntaxHighlighter.registerLanguage("xml", xml);
SyntaxHighlighter.registerLanguage("xsd", xml);
SyntaxHighlighter.registerLanguage("xslt", xml);
SyntaxHighlighter.registerLanguage("yaml", yaml);
PrismSyntaxHighlighter.registerLanguage("sparql", sparql);
PrismSyntaxHighlighter.registerLanguage("turtle", turtle);

const EXTENSION_TO_LANGUAGE: {[key: string]: string} = {
    ttl: "turtle",
}

/**
 * Component that renders single artifact result by generator id.
 */
export const SingleArtifactPreview: React.FC<{
    generatorIdentifier: string,
}> = ({generatorIdentifier}) => {
    const {t} = useTranslation("artifacts");
    const theme = useTheme();
    const isDarkMode = theme.palette.mode === 'dark';

    const [memoryStreamDictionary, isLoading] = useSingleGeneratedFileArtifact(generatorIdentifier);

    const [files] = useAsyncMemo(async () => {
        if (!memoryStreamDictionary) {
            return [];
        }
        const files = await memoryStreamDictionary.list();
        const result: {filename: string, content: string, extension: string}[] = [];
        for (const file of files) {
            let content = await memoryStreamDictionary.readPath(file).read();
            const filename = file.split("/").pop()!;

            const extension = filename.split(".").pop() as string;

            result.push({filename, content, extension});
        }
        return result;
    }, [memoryStreamDictionary]);

    if (isLoading) {
        return <Stack spacing={1}>
            <Skeleton variant="rounded" />
            <Skeleton variant="rounded" />
            <Skeleton variant="rounded" height={60} />
            <Skeleton variant="rounded" />
            <Skeleton variant="rounded" height={60} />
            <Skeleton variant="rounded" />
        </Stack>
    }

    if (!memoryStreamDictionary) {
        return <Alert severity="error"><strong>{t("error")}</strong></Alert>;
    }

    return <>
        {files?.map(file => <Box sx={{whiteSpace: "pre"}}>
            <Typography variant="h5" sx={{mb: 2}}>{file.filename}</Typography>
            {["sparql", "ttl"].includes(file.extension) ?
            <PrismSyntaxHighlighter language={EXTENSION_TO_LANGUAGE[file.extension] ?? file.extension} style={isDarkMode ? vscDarkPlus : coy}>{file.content}</PrismSyntaxHighlighter>
            :
            <SyntaxHighlighter wrapLongLines language={file.extension} style={isDarkMode ? vs2015 : githubGist}>{file.content}</SyntaxHighlighter>
            }
        </Box>)}
    </>;
}

/**
 * Previews a generated artifact content in a dialog.
 * @param artifactPreview
 * @param setArtifactPreview
 * @constructor
 */
export const MultipleArtifactsPreview: React.FC<{
    artifactPreview: string[],
    setArtifactPreview: (value: string[]) => void,
}> = ({artifactPreview, setArtifactPreview}) => {
    const {t} = useTranslation("ui");
    if (artifactPreview.length === 0) {
        return null;
    }
    return <Container>
        {artifactPreview.map(generatorId =>
            <Paper style={{padding: "1rem", margin: "1rem 0"}}>
                <Fab
                    variant="extended"
                    size="small"
                    color="primary"
                    aria-label="edit"
                    style={{float: "right", marginLeft: "2rem"}}
                    onClick={() => setArtifactPreview(artifactPreview.filter(a => a !== generatorId))}
                >
                    <CloseIcon/>{" "}
                    {t("close")}
                </Fab>
                <SingleArtifactPreview
                    key={generatorId}
                    generatorIdentifier={generatorId}
                />
            </Paper>
        )}
    </Container>
}
