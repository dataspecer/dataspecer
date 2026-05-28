import { PageLayout } from './components/layout/page-layout'
import { useHashRoute } from './hooks/use-hash-route'
import { useVocabularies } from './hooks/use-vocabularies'
import { useVocabularyEditor } from './hooks/use-vocabulary-editor'
import { VocabularyListPage } from './components/vocabulary-list/vocabulary-list-page'
import { VocabularyFormPage } from './components/vocabulary-form/vocabulary-form-page'
import type { Vocabulary } from './types/vocabulary'

export type Screen = "list" | "source-selection" | "search" | "form-prefilled" | "form-empty"

function App() {
  const [screen, navigate] = useHashRoute()
  const { vocabularies, loading, addVocabulary, updateVocabulary, deleteVocabulary } = useVocabularies()
  const { editingVocabulary, startEditing, startCreating, cancelEditing } = useVocabularyEditor()

  const handleFormConfirm = (vocabulary: Vocabulary) => {
    if (editingVocabulary) {
      updateVocabulary(vocabulary)
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

  const handleEdit = (vocab: Vocabulary) => {
    startEditing(vocab)
    navigate("form-empty")
  }

  const handleCreate = () => {
    startCreating()
    navigate("form-empty")
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
          vocabularies={vocabularies}
          onNavigateSourceSelection={() => navigate("form-empty")}
          onNavigateFormEmpty={handleCreate}
          onEdit={handleEdit}
          onDelete={deleteVocabulary}
        />
      ) : screen === "form-empty" ? (
        <VocabularyFormPage
          vocabulary={editingVocabulary}
          vocabularies={vocabularies}
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
