import { useState } from 'react'
import { PageLayout } from './components/layout/page-layout'
import { useHashRoute } from './hooks/use-hash-route'
import { VocabularyListPage } from './components/vocabulary-list/vocabulary-list-page'
import { VocabularyFormPage } from './components/vocabulary-form/vocabulary-form-page'
import { VocabularyEditPage } from './components/vocabulary-form/vocabulary-edit-page'
import type { Vocabulary } from './types/vocabulary'

export type Screen = "list" | "source-selection" | "search" | "form-prefilled" | "form-empty"

function App() {
  const [screen, navigate] = useHashRoute()
  const [vocabularies, setVocabularies] = useState<Vocabulary[]>([])
  const [editingVocabulary, setEditingVocabulary] = useState<Vocabulary | null>(null)

  const handleFormConfirm = (vocabulary: Vocabulary) => {
    if (editingVocabulary) {
      setVocabularies((prev) => prev.map((v) => v.id === vocabulary.id ? vocabulary : v))
    } else {
      setVocabularies((prev) => [...prev, vocabulary])
    }
    setEditingVocabulary(null)
    navigate("list")
  }

  const handleFormCancel = () => {
    setEditingVocabulary(null)
    navigate("list")
  }

  return (
    <PageLayout>
      {screen === "list" ? (
        <VocabularyListPage
          vocabularies={vocabularies}
          onNavigateSourceSelection={() => navigate("form-empty")}
          onNavigateFormEmpty={() => { setEditingVocabulary(null); navigate("form-empty") }}
          onEdit={(vocab) => { setEditingVocabulary(vocab); navigate("form-empty") }}
          onDelete={(vocab) => setVocabularies((prev) => prev.filter((v) => v.id !== vocab.id))}
        />
      ) : screen === "form-empty" ? (
        editingVocabulary ? (
          <VocabularyEditPage
            key={editingVocabulary.id}
            vocabulary={editingVocabulary}
            onCancel={handleFormCancel}
            onConfirm={handleFormConfirm}
          />
        ) : (
          <VocabularyFormPage
            key="new"
            onCancel={handleFormCancel}
            onConfirm={handleFormConfirm}
          />
        )
      ) : (
        <div>Screen: {screen}</div>
      )}
    </PageLayout>
  )
}

export default App
