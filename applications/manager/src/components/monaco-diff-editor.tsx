import {FC, useEffect} from "react";
import RawMonacoEditor, { DiffEditor } from "@monaco-editor/react";
import * as monaco from 'monaco-editor';
import { handleEditorWillMount } from "./monaco-editor";
import { useTheme } from "next-themes";
import { EditableType, getEditableAndNonEditableValue } from "@dataspecer/git";

export const MonacoDiffEditor: FC<{
  editorRef: React.MutableRefObject<{ editor: monaco.editor.IStandaloneDiffEditor } | undefined>,
  mergeFromContent: string,
  mergeToContent: string,
  format: string
  editable: EditableType,
} & React.ComponentProps<typeof RawMonacoEditor>> = (props) => {
  const { resolvedTheme } = useTheme();
  const editorsContent = getEditableAndNonEditableValue(props.editable, props.mergeFromContent, props.mergeToContent);

  useEffect(() => {
    if (props.editorRef.current === undefined) {
      return;
    }

    const model = props.editorRef.current.editor.getModel();
    if (model !== null) {
      model.original.setValue(editorsContent.nonEditable);
      model.modified.setValue(editorsContent.editable);
    }
  }, [props.mergeFromContent, props.mergeToContent]);

  return <div className="flex flex-col grow overflow-hidden">
    <DiffEditor
      {...props}
      onMount={editor => {
        props.editorRef.current = {editor};
      }}
      theme={resolvedTheme === "dark" ? "dataspecer-dark" : "vs"}
      language={props.format}
      original={editorsContent.nonEditable}
      modified={editorsContent.editable}
      beforeMount={handleEditorWillMount}

      options={{
        minimap: {
          enabled: false
        },
        // This is if we want to editable editor to be different than the right one
        // originalEditable: props.editable === "mergeFrom",
        // readOnly: props.editable === "mergeFrom",
      }}
    />
  </div>;
}
