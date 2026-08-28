import { useState, type ReactNode } from 'react';
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';

import { useDataSource } from '@/shared/data-source/data-source-context.tsx';
import type { DetailPageActionsProps } from '@/shared/components/detail-view.tsx';
import { useSnackbar } from '@/shared/components/snackbar.tsx';
import { errorMessage } from '@/shared/operations/operation-result.ts';
import type { ApplicationGraphModel } from './model.ts';
import { buildApplicationGraphDocument } from './application-graph-document.ts';

const dataspecerBackendUrl = (
  (import.meta.env.VITE_DATASPECER_BACKEND as string | undefined) ?? 'http://localhost:3100'
).replace(/\/$/, '');

export function GraphsDetailPageActions(
  props: DetailPageActionsProps<ApplicationGraphModel>,
): ReactNode {
  const dataSource = useDataSource();
  const { notify } = useSnackbar();
  const [activeAction, setActiveAction] = useState<'export' | 'generate' | null>(null);

  const runAction = async (action: 'export' | 'generate', task: () => Promise<void>) => {
    setActiveAction(action);
    try {
      await task();
    } catch (error) {
      console.error(error);
      notify(errorMessage(error), 'error');
    } finally {
      setActiveAction(null);
    }
  };

  const exportJson = async () => {
    const graph = await buildApplicationGraphDocument(props.item, dataSource);
    downloadBlob(
      new Blob([`${JSON.stringify(graph, null, 2)}\n`], { type: 'application/json' }),
      `${toFileNameBase(graph.name)}.application-graph.json`,
    );
  };

  const generateApplication = async () => {
    const graph = await buildApplicationGraphDocument(props.item, dataSource);
    const response = await fetch(`${dataspecerBackendUrl}/app-generator/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(graph),
    });
    if (!response.ok) {
      const details = (await response.json().catch(() => null)) as {
        violations?: Array<{ message: string }>;
      } | null;
      const messages = details?.violations?.map((violation) => violation.message) ?? [];
      throw new Error(
        messages.length > 0
          ? messages.join(' ')
          : `Application generation failed with status ${response.status}.`,
      );
    }
    downloadBlob(await response.blob(), `${toFileNameBase(graph.name)}.zip`);
  };

  return (
    <Stack direction="row" spacing={1}>
      <Button
        variant="outlined"
        disabled={activeAction !== null}
        onClick={() => void runAction('export', exportJson)}
      >
        {activeAction === 'export' ? 'Exporting…' : 'Export JSON'}
      </Button>
      <Button
        variant="contained"
        disabled={activeAction !== null}
        onClick={() => void runAction('generate', generateApplication)}
      >
        {activeAction === 'generate' ? 'Generating…' : 'Generate application'}
      </Button>
    </Stack>
  );
}

function toFileNameBase(name: string): string {
  return (
    name
      .trim()
      .toLowerCase()
      .replace(/[^\p{L}\p{N}]+/gu, '-')
      .replace(/^-|-$/g, '') || 'generated-application'
  );
}

function downloadBlob(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = fileName;
  anchor.click();
  URL.revokeObjectURL(url);
}
