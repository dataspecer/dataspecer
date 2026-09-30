import * as React from "react";
import {FC} from "react";
import RawMonacoEditor, { DiffEditor as RawMonacoDiffEditor } from "@monaco-editor/react";
import * as monaco from 'monaco-editor';
import { useTheme } from "next-themes";

function handleEditorWillMount(m: typeof monaco) {
  m.editor.defineTheme('dataspecer-dark', {
    base: 'vs-dark',
    inherit: true,
    rules: [
    ],
    colors: {
      'editor.background': '#0a0a0a',
    }
  });
  m.languages.json.jsonDefaults.setDiagnosticsOptions({
    enableSchemaRequest: true,
  });
}

export const MonacoDiffEditor: FC<{
  original: string,
  modified: string,
  language: string,
  onModifiedChange: (value: string) => void,
  renderSideBySide?: boolean,
} & React.ComponentProps<typeof RawMonacoDiffEditor>> = (props) => {
  const { resolvedTheme } = useTheme();
  const { onModifiedChange, renderSideBySide, ...editorProps } = props;

  return <div className="flex flex-col grow overflow-hidden">
      <RawMonacoDiffEditor
          {...editorProps}
          onMount={editor => editor.getModifiedEditor().onDidChangeModelContent(() => onModifiedChange(editor.getModifiedEditor().getValue()))}
          theme={resolvedTheme === "dark" ? "dataspecer-dark" : "vs"}
          language={props.language}
          beforeMount={handleEditorWillMount}
          options={{
              renderSideBySide: renderSideBySide ?? true,
              originalEditable: false,
              wordWrap: "on",
              minimap: { enabled: false },
          }}
      />
  </div>;
};

export const MonacoEditor: FC<{
  refs: React.MutableRefObject<{ editor: monaco.editor.IStandaloneCodeEditor } | undefined>,
  defaultValue: string,
  language: string,
} & React.ComponentProps<typeof RawMonacoEditor>> = (props) => {
  const { resolvedTheme } = useTheme();

  return <div className="flex flex-col grow overflow-hidden">
      <RawMonacoEditor
          {...props}
          onMount={editor => props.refs.current = {editor}}
          theme={resolvedTheme === "dark" ? "dataspecer-dark" : "vs"}
          language={props.language}
          defaultValue={props.defaultValue}
          beforeMount={handleEditorWillMount}
          options={{
              wordWrap: "on",
              minimap: {
                  enabled: false
              },
              insertSpaces: true,
          }}
      />
  </div>;
}
