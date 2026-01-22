import {useToggle} from "../../hooks/use-toggle";
import React from "react";
import {DraggableProvidedDragHandleProps} from "@hello-pangea/dnd";
import {Box, Fade, IconButton, MenuItem, Typography} from "@mui/material";
import {ActionsOther} from "./common/actions-other";
import {styled} from "@mui/material/styles";
import Tooltip, {tooltipClasses} from "@mui/material/Tooltip";
import {DataPsmItemTreeContext} from "./data-psm-item-tree-context";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import ExpandLessIcon from "@mui/icons-material/ExpandLess";
import {useDialog} from "../../dialog";
import {EntityChainDetailDialog} from "../detail/entity-chain-detail-dialog";
import {Icons} from "../../icons";
import {useTranslation} from "react-i18next";

const LightTooltip = styled<typeof Tooltip>(({ className, ...props }) => (
  <Tooltip {...props} classes={{ popper: className }}   TransitionComponent={Fade}
           TransitionProps={{ timeout: 200 }} />
))(({ theme }) => ({
  [`& .${tooltipClasses.tooltip}`]: {
    backgroundColor: theme.palette.background.paper,
    color: theme.palette.text.primary,
    fontSize: "1rem",
    padding: 0,
    marginLeft: 0,
  },
  zIndex: 100,
}));

const Content = React.forwardRef<HTMLSpanElement, React.ComponentPropsWithoutRef<typeof Typography>>((props, ref) => {
  return (
    <Typography {...props} sx={{lineHeight: 1.9}}>
      {props.children}
      <span ref={ref} />
    </Typography>
  );
});

const ItemRow: React.FC<{
  children: React.ReactNode;
  actions?: React.ReactNode;
  open?: boolean;
  readOnly?: boolean;
  className?: string;

  icon?: React.ReactNode;
  collapsible?: {isOpen: boolean, open: () => void, close: () => void};
}> = ({children, actions, open, readOnly, collapsible,...props}) => {
  const toggle = useToggle(open ?? false);
  const {ignoreReadOnlyStyles} = React.useContext(DataPsmItemTreeContext);

  return <LightTooltip
    title={actions ? <Box sx={{display: "flex"}}>{actions}</Box> : false}
    placement={"right"}
    open={toggle.isOpen}
    onOpen={toggle.open}
    onClose={toggle.close}
  >
    <Content style={{opacity: readOnly && !ignoreReadOnlyStyles ? 0.5 : 1}}>
      {props.icon && props.icon}

      {collapsible && (collapsible.isOpen ?
          <IconButton size={"small"} onClick={collapsible.close}><ExpandMoreIcon/></IconButton> :
          <IconButton size={"small"} onClick={collapsible.open}><ExpandLessIcon/></IconButton>
      )}

      {(!collapsible && props.icon) && <span style={{width: ".75rem", display: "inline-block"}} />}

      {children}
    </Content>
  </LightTooltip>;
};

/**
 * Interface for inserting custom content into entity in tree.
 */
export interface RowSlots {
  // Whether the row is collapsible
  collapseToggle?: ReturnType<typeof useToggle>,

  // Icon shown on the left of the row
  icon?: React.ReactNode,

  // Content at the beginning of the row
  startRow?: React.ReactNode[],

  // Content at the end of the row
  endRow?: React.ReactNode[],

  // Menu actions
  menu?: React.ReactNode[],

  // Hidden menu actions
  hiddenMenu?: ((close: () => void) => React.ReactNode)[],

  // Properties for drag and drop functionality
  dragHandleProps?: DraggableProvidedDragHandleProps,

  // Subtree content
  subtree?: React.ReactNode,

  // IRIs that are on the row
  iris?: string[];
}

/**
 * Component that renders subtree based on provided slots as parameters.
 * todo: remove ItemRow
 */
export const DataPsmBaseRow: React.FC<RowSlots> = (props) => {
  const {t} = useTranslation("psm");


  const DetailDialog = useDialog(EntityChainDetailDialog, ["iris"]);

  return <li style={{listStyleType: "none"}}>
    <ItemRow collapsible={props.collapseToggle} icon={props.icon} actions={<>
      {props.menu}

      <MenuItem onClick={() => DetailDialog.open({})} title={t("button info")}><Icons.Tree.Edit/></MenuItem>

      {!!props.hiddenMenu?.length &&
          <ActionsOther>
            {close => props.hiddenMenu?.map(hm => hm(close))}
          </ActionsOther>
      }
    </>}>
    <span {...props.dragHandleProps}>
      <>{props.startRow}</>
      <>{props.endRow}</>
    </span>
    </ItemRow>

    <>{props.subtree}</>

    <DetailDialog.Component iris={props.iris ?? []} />
  </li>
};
