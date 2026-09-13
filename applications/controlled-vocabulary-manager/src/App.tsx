import { PageLayout } from './components/layout/page-layout'
import { useHashRoute } from './hooks/use-hash-route'
import { useVocabulariesContext } from './contexts/vocabularies-context'
import { useVocabularyEditor } from './hooks/use-vocabulary-editor'
import { VocabularyListPage } from './components/vocabulary-list/vocabulary-list-page'
import { VocabularyFormPage } from './components/vocabulary-form/vocabulary-form-page'
import { Alert, AlertTitle, AlertDescription } from './components/ui/alert'
import type { ControlledVocabulary } from '@dataspecer/controlled-vocabulary-model'
import { useTranslation } from 'react-i18next'
import { useTheme } from 'next-themes'
import { useEffect } from 'react'
import { TriangleAlert } from 'lucide-react'
import { supportedLanguages } from './i18n'

export type Screen = "list" | "source-selection" | "search" | "form-prefilled" | "form-empty"

function App() {
  const [screen, navigate] = useHashRoute()
  const { loading, error, addVocabulary, updateVocabulary, deleteVocabulary } = useVocabulariesContext()
  const { editingVocabulary, startEditing, startCreating, cancelEditing } = useVocabularyEditor()
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
          onNavigateSourceSelection={() => navigate("form-empty")}
          onNavigateFormEmpty={handleCreate}
          onEdit={handleEdit}
          onDelete={deleteVocabulary}
        />
      ) : screen === "form-empty" ? (
        <VocabularyFormPage
          vocabulary={editingVocabulary}
          onCancel={handleFormCancel}
          onConfirm={handleFormConfirm}
        />
      ) : (
        <div>Screen: {screen}</div>
      )}
    </PageLayout>
  )
}

export default App
