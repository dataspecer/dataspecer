import { PageLayout } from './components/layout/page-layout'
import { useHashRoute } from './hooks/use-hash-route'
import { useVocabulariesContext } from './contexts/vocabularies-context'
import { useVocabularyEditor } from './hooks/use-vocabulary-editor'
import { useSourceWizard } from './hooks/use-source-wizard'
import { SearchPage } from './components/source-wizard/search-page'
import { SourceSelectionPage } from './components/source-wizard/source-selection-page'
import { VocabularyListPage } from './components/vocabulary-list/vocabulary-list-page'
import { VocabularyFormPage } from './components/vocabulary-form/vocabulary-form-page'
import { VocabularyViewPage } from './components/vocabulary-view/vocabulary-view-page'
import { Alert, AlertTitle, AlertDescription } from './components/ui/alert'
import type { ControlledVocabulary } from '@dataspecer/controlled-vocabulary-model'
import { useTranslation } from 'react-i18next'
import { useTheme } from 'next-themes'
import { useEffect, useState } from 'react'
import { TriangleAlert } from 'lucide-react'
import { supportedLanguages } from './i18n'

export type Screen = "list" | "source-selection" | "search" | "distribution" | "form-prefilled" | "form-empty" | "view"

function App() {
  const [screen, navigate] = useHashRoute()
  const wizard = useSourceWizard(screen, navigate)
  const { loading, error, addVocabulary, updateVocabulary, deleteVocabulary } = useVocabulariesContext()
  const { editingVocabulary, startEditing, startCreating, cancelEditing } = useVocabularyEditor()
  const [viewingVocabulary, setViewingVocabulary] = useState<ControlledVocabulary | null>(null)
  const { t, i18n } = useTranslation()
  const { setTheme } = useTheme()

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const language = params.get('language')
    const theme = params.get('theme')

    if (language && supportedLanguages.includes(language)) {
      i18n.changeLanguage(language)
    }

    if (theme && ['light', 'dark', 'system'].includes(theme)) {
      setTheme(theme)
    }
  }, [i18n, setTheme])

  const handleFormConfirm = (vocabulary: Omit<ControlledVocabulary, 'id' | 'type'>) => {
    if (editingVocabulary) {
      updateVocabulary(editingVocabulary.id, vocabulary)
    } else {
      addVocabulary(vocabulary)
    }
    cancelEditing()
    navigate("list")
  }

  const handleFormCancel = () => {
    cancelEditing()
    navigate("list")
  }

  const handleEdit = (vocab: ControlledVocabulary) => {
    startEditing(vocab)
    navigate("form-empty")
  }

  const handleView = (vocab: ControlledVocabulary) => {
    setViewingVocabulary(vocab)
    navigate("view")
  }

  const handleCloseView = () => {
    setViewingVocabulary(null)
    navigate("list")
  }

  const handleCreate = () => {
    startCreating()
    navigate("form-empty")
  }

  if (error) {
    return (
      <PageLayout>
        <Alert variant="destructive">
          <TriangleAlert className="h-4 w-4" />
          <AlertTitle>{t(`error.${error}.title`)}</AlertTitle>
          <AlertDescription>{t(`error.${error}.description`)}</AlertDescription>
        </Alert>
      </PageLayout>
    )
  }

  if (loading) {
    return (
      <PageLayout>
        <div className="flex justify-center p-8">
          Loading…
        </div>
      </PageLayout>
    )
  }

  return (
    <PageLayout>
      {screen === "list" ? (
        <VocabularyListPage
          onNavigateSourceSelection={() => navigate("source-selection")}
          onNavigateFormEmpty={handleCreate}
          onEdit={handleEdit}
          onDelete={deleteVocabulary}
          onView={handleView}
        />
      ) : screen === "source-selection" ? (
        <SourceSelectionPage
          initialSourceId={wizard.state.sourceId}
          onCancel={() => {
            wizard.reset()
            navigate("list")
          }}
          onContinue={(sourceId) => {
            wizard.selectSource(sourceId)
            navigate("search")
          }}
        />
      ) : screen === "search" && wizard.state.sourceId !== null ? (
        <SearchPage
          sourceId={wizard.state.sourceId}
          groupsPage={wizard.state.groupsPage}
          onGroupsPageChange={wizard.setGroupsPage}
          onCancel={() => {
            wizard.reset()
            navigate("list")
          }}
          onChangeSource={() => navigate("source-selection")}
        />
      ) : screen === "form-empty" ? (
        <VocabularyFormPage
          vocabulary={editingVocabulary}
          onCancel={handleFormCancel}
          onConfirm={handleFormConfirm}
        />
      ) : screen === "view" && viewingVocabulary ? (
        <VocabularyViewPage
          vocabulary={viewingVocabulary}
          onClose={handleCloseView}
        />
      ) : !wizard.available ? null : (
        <div>Screen: {screen}</div>
      )}
    </PageLayout>
  )
}

export default App
