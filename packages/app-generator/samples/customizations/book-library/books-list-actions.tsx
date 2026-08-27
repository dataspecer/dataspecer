import type { ReactNode } from 'react';
import TerminalIcon from '@mui/icons-material/Terminal';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';

import type { ListRowActionComponent, ListRowActionProps } from '@/shared/components/list-view.tsx';
import type { BookListRowModel } from './model.ts';

export function BooksListPageActions(): ReactNode {
  return <Button onClick={() => console.log('Books list action')}>Log list</Button>;
}

function LogBookRowAction(props: ListRowActionProps<BookListRowModel>): ReactNode {
  return (
    <Tooltip title="Log book">
      <IconButton
        aria-label="Log book"
        tabIndex={props.tabIndex}
        onClick={() => console.log('Book row action:', props.item)}
      >
        <TerminalIcon fontSize="small" />
      </IconButton>
    </Tooltip>
  );
}

export const additionalRowActions: readonly ListRowActionComponent<BookListRowModel>[] = [
  LogBookRowAction,
];
