import {
  type Dispatch,
  type HTMLAttributes,
  type ReactNode,
  type SetStateAction,
  useEffect,
  useRef,
  useState,
} from "react";
import {
  type EdgeChange,
  type NodeChange,
  type OnEdgesChange,
  type OnNodesChange,
  Panel,
  useStore,
  useStoreApi,
} from "@xyflow/react";

import "./developer-tools.css";
import { useExploration } from "../../context/highlighting-exploration-mode";
import { t } from "../../application";
import { useActions } from "../../action/actions-react-binding";

/**
 * Provides some internal information.
 *
 * https://reactflow.dev/learn/advanced-use/devtools-and-debugging
 */
export function DeveloperTools() {
  const [changeLoggerActive, setChangeLoggerActive] = useState(false);
  const [viewportLoggerActive, setViewportLoggerActive] = useState(true);
  const explorationMode = useExploration();
  const { openPerformLayoutVisualModelDialog } = useActions();

  return (
    <div>
      <div className="react-flow__devtools">
        <Panel position="top-left">
          <DevToolButton
            setActive={setChangeLoggerActive}
            active={changeLoggerActive}
            title="Toggle Change Logger"
          >
            Change
          </DevToolButton>
          <DevToolButton
            setActive={setViewportLoggerActive}
            active={viewportLoggerActive}
            title="Toggle Viewport Logger"
          >
            Viewport
          </DevToolButton>
          <button onClick={_ => openPerformLayoutVisualModelDialog()}>{t("layout-dialog-open-button")}</button>
          <DevToolButton
            setActive={explorationMode.toggleHighlighting}
            active={explorationMode.isHighlightingOn}
            title={t("exploration-mode-button.title")}
          >
            {t("exploration-mode-button.name")}
          </DevToolButton>
        </Panel>
        {changeLoggerActive && <ChangeLogger />}
        {viewportLoggerActive && <ViewportLogger />}
      </div>
    </div>
  );
}

function DevToolButton({
  active,
  setActive,
  children,
  ...rest
}: {
  active: boolean;
  setActive: Dispatch<SetStateAction<boolean>>;
  children: ReactNode;
} & HTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      onClick={() => setActive((a) => !a)}
      className={active ? "active" : ""}
      {...rest}
    >
      {children}
    </button>
  );
}

function ChangeLogger({ limit = 16 }: {
  color?: string;
  limit?: number;
}) {
  const [changes, setChanges] = useState<(NodeChange | EdgeChange)[]>([]);
  const onChangeIntercepted = useRef(false);
  const onNodesChange = useStore((state) => state.onNodesChange);
  const onEdgesChange = useStore((state) => state.onEdgesChange);
  const store = useStoreApi();

  useEffect(() => {
    if (!onNodesChange || !onEdgesChange || onChangeIntercepted.current) {
      return;
    }

    onChangeIntercepted.current = true;
    const userOnNodesChange = onNodesChange;
    const userOnEdgeChange = onEdgesChange;

    // We register custom listeners.
    const onNodesChangeLogger: OnNodesChange = (changes) => {
      userOnNodesChange(changes);
      setChanges((oldChanges) => [...changes, ...oldChanges].slice(0, limit));
    };

    const onEdgesChangeLogger: OnEdgesChange = (changes) => {
      userOnEdgeChange(changes);
      setChanges((oldChanges) => [...changes, ...oldChanges].slice(0, limit));
    };

    store.setState({ onNodesChange: onNodesChangeLogger, onEdgesChange: onEdgesChangeLogger });
  }, [onNodesChange, onEdgesChange, limit, store]);

  return (
    <div className="react-flow__devtools-changelogger">
      <div className="react-flow__devtools-title">Change Logger</div>
      {changes.length === 0 ? (
        <>no changes triggered</>
      ) : (
        changes.map((change, index) => (
          <ChangeInfo key={index} change={change} />
        ))
      )}
    </div>
  );
}

function ChangeInfo({ change }: { change: NodeChange | EdgeChange }) {
  const id = "id" in change ? change.id : "-";
  const { type } = change;

  return (
    <div style={{ marginBottom: 4 }}>
      <div>node id: {id}</div>
      <div>
        {type === "add" ?
          JSON.stringify(change.item, null, 2) : null}
        {type === "dimensions" ?
          `dimensions: ${change.dimensions?.width ?? "-"} x ${change.dimensions?.height ?? "-"}` : null}
        {type === "position" ?
          `position: ${change.position?.x.toFixed(1,) ?? "-"}, ${change.position?.y.toFixed(1) ?? "-"}` : null}
        {type === "remove" ?
          "remove" : null}
        {type === "select" ?
          (change.selected ? "select" : "unselect") : null}
        {type === "replace" ?
          JSON.stringify(change.item, null, 2) : null}
      </div>
    </div>
  );
}

function ViewportLogger() {
  const viewport = useStore((state) =>
    `x: ${state.transform[0].toFixed(2)}, y: ${state.transform[1].toFixed(2,)}, zoom: ${state.transform[2].toFixed(2)}`,
  );
  return <Panel position="top-right">{viewport}</Panel>;
}
