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
import { useConfig } from './contexts/config-context'
import { sourceDescriptors } from './sources/registry'

export type Screen = "list" | "source-selection" | "search" | "form-prefilled" | "form-empty" | "view" | "edit"

function App() {
  const [screen, navigate, routeParams] = useHashRoute()
  const { returnTo } = useConfig()
  const wizard = useSourceWizard(screen, navigate)
  const { loading, error, vocabularies, addVocabulary, updateVocabulary, deleteVocabulary } = useVocabulariesContext()
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

  // The vocabulary opened by an `#/edit/<id>` link, or the one chosen in the list.
  const vocabularyToEdit = screen === "edit"
    ? vocabularies.find((vocabulary) => vocabulary.id === routeParams.id)
    : editingVocabulary

  /** Leaves the form: back to the page we were opened from, otherwise to the list. */
  const leaveForm = () => {
    if (returnTo) {
      window.location.href = returnTo
      return
    }
    cancelEditing()
    navigate("list")
  }

  const handleFormConfirm = async (vocabulary: Omit<ControlledVocabulary, 'id' | 'type'>) => {
    const saved = vocabularyToEdit
      ? updateVocabulary(vocabularyToEdit.id, vocabulary)
      : addVocabulary(vocabulary)
    if (returnTo) {
      // The page we return to shows the saved data, so wait for the save.
      try {
        await saved
      } catch (err) {
        console.error('Failed to save the controlled vocabulary', err)
        return
      }
    }
    leaveForm()
  }

  const handleFormCancel = leaveForm

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
          onNavigateSourceSelection={() => {
            wizard.reset()
            navigate("source-selection")
          }}
          onNavigateFormEmpty={handleCreate}
          onEdit={handleEdit}
          onDelete={deleteVocabulary}
          onView={handleView}
        />
      ) : screen === "source-selection" ? (
        <SourceSelectionPage
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
          state={wizard.state}
          onGroupsPageChange={wizard.setGroupsPage}
          onGroupSelect={wizard.selectGroup}
          onSearch={wizard.search}
          onCandidatesPageChange={wizard.setCandidatesPage}
          onMetadata={(result) => {
            wizard.setMetadata(result)
            navigate("form-prefilled")
          }}
          onCancel={() => {
            wizard.reset()
            navigate("list")
          }}
          onChangeSource={() => navigate("source-selection")}
        />
      ) : screen === "edit" && !vocabularyToEdit ? (
        <Alert variant="destructive">
          <TriangleAlert className="h-4 w-4" />
          <AlertTitle>{t("error.vocabulary-not-found.title")}</AlertTitle>
          <AlertDescription>{t("error.vocabulary-not-found.description")}</AlertDescription>
        </Alert>
      ) : screen === "form-empty" || screen === "edit" ? (
        <VocabularyFormPage
          vocabulary={vocabularyToEdit}
          onCancel={handleFormCancel}
          onConfirm={handleFormConfirm}
        />
      ) : screen === "view" && viewingVocabulary ? (
        <VocabularyViewPage
          vocabulary={viewingVocabulary}
          onClose={handleCloseView}
        />
      ) : screen === "form-prefilled" && wizard.state.metadata !== null ? (
        <VocabularyFormPage
          prefilled={wizard.state.metadata}
          derivation={sourceDescriptors.find((descriptor) => descriptor.id === wizard.state.sourceId)?.metadataDerivation}
          onBack={() => navigate("search")}
          onCancel={() => {
            wizard.reset()
            handleFormCancel()
          }}
          onConfirm={(vocabulary) => {
            addVocabulary(vocabulary)
            wizard.reset()
            navigate("list")
          }}
        />
      ) : !wizard.available ? null : (
        <div>Screen: {screen}</div>
      )}
    </PageLayout>
  )
}

export default App
