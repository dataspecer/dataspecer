// Working the MonacoDiffEditor is pretty difficult for non-obvious reason.
// Basically if we put in new mergeFromContent, mergeToContent, then the editor is mounted again (all states/refs are reseted and onMount is called).
// However if those strings were already given to the editor, we do not mount the editor - the values are kept.
// Because of that we explicitly track if it was change in already existing models (changedUnderlyingModelsInEditor) changed
// So we do not call updateDiffNodeOnChange with old values if we swap model (we would then modify the new diff node based on editor differences in the old diff node (the one before swap))

// Also there is possible optimization to have interval set for every 2 seconds for example and on editing change inside editor just update ref variable that some change happened
// And then each 2 seconds check if the diff tree needs updating. Currently we check if the node needs updating on each editor update, but since the performance hit is not so big we kept it.
// Also due to behavior explained above, I just implemented it the easiest way possible.


import { Dispatch, FC, SetStateAction, useEffect, useRef } from "react";
import RawMonacoEditor, { DiffEditor } from "@monaco-editor/react";
import * as monaco from 'monaco-editor';
import { EditableType, getDiffNodeFromDiffTree, getEditableAndNonEditableValue, MergeState } from "@dataspecer/git";
import { useTheme } from "next-themes";
import { handleEditorWillMount } from "./monaco-editor";

export const MonacoDiffEditor: FC<{
  editorRef: React.RefObject<{ editor: monaco.editor.IStandaloneDiffEditor } | undefined>,
  mergeFromContent: string,
  mergeToContent: string,
  projectIrisTreePathToFilesystemNode: string,
  datastoreType: string | null,
  format: string,
  editable: EditableType,
  setMergeState: Dispatch<SetStateAction<MergeState | null>>,
} & React.ComponentProps<typeof RawMonacoEditor>> = (props) => {
  const { resolvedTheme } = useTheme();
  const editorsContent = getEditableAndNonEditableValue(props.editable, props.mergeFromContent, props.mergeToContent);
  const changedUnderlyingModelsInEditor = useRef<boolean>(false);
  const currentProjectIrisTreePathToFilesystemNode = useRef<string | null>(null);
  const currentDatastoreType = useRef<string | null>(null);


  useEffect(() => {
    changedUnderlyingModelsInEditor.current = true;
    currentProjectIrisTreePathToFilesystemNode.current = props.projectIrisTreePathToFilesystemNode;
    currentDatastoreType.current = props.datastoreType;
  }, [props.mergeFromContent, props.mergeToContent]);


  const updateDiffNodeOnChange = (projectIrisTreePathToFilesystemNode: string, datastoreType: string | null) => {
    if (props.editorRef.current === undefined) {
      return;
    }

    props.setMergeState(prev => {
      const model = props.editorRef.current?.editor.getModel() ?? null;
      const lineChanges = props.editorRef.current?.editor.getLineChanges();
      if (model === null) {
        return prev;
      }
      if (prev === null) {
        return null;
      }
      if (projectIrisTreePathToFilesystemNode === null) {
        // Should not happen but we just do nothing instead of throwing error.
        console.error("Inside Monaco Diff editor the path to the file node is null, which should not happen, this is probably programmer error.");
        return prev;
      }

      // We first check on the old one, so we dont have to create copy of merge state if it is not needed (micro-optimization)
      // we have to go through tree twice now, but I feel like that the cloning will be much more expensive.
      const diffNodeToChangeNonCopy = getDiffNodeFromDiffTree(prev.diffTreeData?.diffTree!, projectIrisTreePathToFilesystemNode);
      const datastoreComparisonToChangeNonCopy = diffNodeToChangeNonCopy?.datastoreComparisons
        .find(datastoreComparison => datastoreComparison.affectedDataStore.type === datastoreType);
      if (lineChanges?.length !== undefined && lineChanges.length > 0) {
        if (datastoreComparisonToChangeNonCopy?.datastoreComparisonResult === "same") {
          // We went from no changes to changes
          const mergeStateCopy = {...prev};
          const diffNodeToChange = getDiffNodeFromDiffTree(mergeStateCopy.diffTreeData?.diffTree!, projectIrisTreePathToFilesystemNode);
          const datastoreComparisonToChange = diffNodeToChange?.datastoreComparisons
            .find(datastoreComparison => datastoreComparison.affectedDataStore.type === datastoreType);
          datastoreComparisonToChange!.datastoreComparisonResult = "modified";
          return mergeStateCopy;
        }
        else {
          return prev;
        }
      }
      else {
        if (datastoreComparisonToChangeNonCopy?.datastoreComparisonResult === "modified") {
          // TODO: Copy-pasted from the above
          // We went from changes to no changes
          const mergeStateCopy = {...prev};
          const diffNodeToChange = getDiffNodeFromDiffTree(mergeStateCopy.diffTreeData?.diffTree!, projectIrisTreePathToFilesystemNode);
          const datastoreComparisonToChange = diffNodeToChange?.datastoreComparisons
            .find(datastoreComparison => datastoreComparison.affectedDataStore.type === datastoreType);
          datastoreComparisonToChange!.datastoreComparisonResult = "same";
          return mergeStateCopy;
        }
        else {
          return prev;
        }
      }
    });
  }

  return <div className="flex flex-col grow overflow-hidden h-screen w-[100%]">
  <DiffEditor
      {...props}
      onMount={editor => {
        props.editorRef.current = {editor};
        changedUnderlyingModelsInEditor.current = false;
        const model = props.editorRef.current?.editor.getModel() ?? null;

        if (model !== null) {
          model.original.setValue(editorsContent.nonEditable);
          model.modified.setValue(editorsContent.editable);

          // Only the modified since in current version we allow only editing of the one editor.
          model.modified.onDidChangeContent(() => {
            setTimeout(() => {
              if (changedUnderlyingModelsInEditor.current) {
                changedUnderlyingModelsInEditor.current = false;
                return;
              }
              if (currentProjectIrisTreePathToFilesystemNode.current === null || currentDatastoreType.current === null) {
                return;
              }

              updateDiffNodeOnChange(currentProjectIrisTreePathToFilesystemNode.current, currentDatastoreType.current);
            }, 400);
          });
        }
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
