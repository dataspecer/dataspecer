import * as React from "react";
import {FC} from "react";
import RawMonacoEditor, { DiffEditor } from "@monaco-editor/react";
import * as monaco from 'monaco-editor';
import { handleEditorWillMount } from "./monaco-editor";
import { useTheme } from "next-themes";
import { EditableType, getEditableAndNonEditableValue } from "@dataspecer/git";

export const MonacoDiffEditor: FC<{
  refs: React.MutableRefObject<{ editor: monaco.editor.IStandaloneDiffEditor } | undefined>,
  mergeFromContent: string,
  mergeToContent: string,
  format: string
  editable: EditableType,
} & React.ComponentProps<typeof RawMonacoEditor>> = (props) => {
  const { resolvedTheme } = useTheme();
  const editorsContent = getEditableAndNonEditableValue(props.editable, props.mergeFromContent, props.mergeToContent);


  return <div className="flex flex-col grow overflow-hidden">
    <DiffEditor
      {...props}
      onMount={editor => {
        props.refs.current = {editor};
      }}
      theme={resolvedTheme === "dark" ? "dataspecer-dark" : "vs"}
      language={props.format}
      original={editorsContent.nonEditable}
      modified={editorsContent.editable}
      beforeMount={handleEditorWillMount}

      options={{
        glyphMargin: true,       // TODO RadStr: Have to enable if we want to show something next the line numbers ... however that was just for testing of possibilities
        minimap: {
          enabled: false
        },
        // TODO RadStr: Remove later - this is if we want to editable editor to be different than the right one
        // originalEditable: props.editable === "mergeFrom",
        // readOnly: props.editable === "mergeFrom",
      }}
    />
  </div>;
}
