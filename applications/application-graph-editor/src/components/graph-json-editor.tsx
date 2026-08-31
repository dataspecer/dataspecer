import MonacoEditor, { type Monaco, type OnChange, type OnMount } from '@monaco-editor/react';
import { applicationGraphSchema } from '@dataspecer/app-generator/graph';

interface GraphJsonEditorProps {
  value: string;
  onChange: OnChange;
  onMount?: OnMount;
}

function configureJsonLanguage(instance: Monaco): void {
  instance.languages.json.jsonDefaults.setDiagnosticsOptions({
    validate: true,
    schemas: [
      {
        // Registering under the real $id also resolves an inline "$schema" reference without
        // allowing Monaco to fetch schemas from the network.
        uri: applicationGraphSchema.$id,
        fileMatch: ['*'],
        schema: applicationGraphSchema,
      },
    ],
  });
}

/** Monaco editor configured for application graph JSON. */
export function GraphJsonEditor(props: GraphJsonEditorProps) {
  return (
    <MonacoEditor
      language="json"
      value={props.value}
      onChange={props.onChange}
      onMount={props.onMount}
      beforeMount={configureJsonLanguage}
      options={{
        wordWrap: 'on',
        minimap: { enabled: false },
        insertSpaces: true,
        automaticLayout: true,
        scrollBeyondLastLine: false,
        fontSize: 13,
      }}
    />
  );
}
