import type { ReactNode } from 'react';
import Button from '@mui/material/Button';

import type { DetailPageActionsProps } from '@/shared/components/detail-view.tsx';
import type { BookModel } from './model.ts';

export function BooksDetailPageActions(props: DetailPageActionsProps<BookModel>): ReactNode {
  return <Button onClick={() => console.log('Book detail action:', props.item)}>Log book</Button>;
}
