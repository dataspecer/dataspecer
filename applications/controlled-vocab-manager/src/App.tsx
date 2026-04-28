import { useState } from 'react'
import { PageLayout } from './components/layout/page-layout'
import { useHashRoute } from './hooks/use-hash-route'
import { VocabularyListPage } from './components/vocabulary-list/vocabulary-list-page'
import type { Vocabulary } from './types/vocabulary'

export type Screen = "list" | "source-selection" | "search" | "form-prefilled" | "form-empty"

function App() {
  const [screen, navigate] = useHashRoute()
  const [vocabularies, setVocabularies] = useState<Vocabulary[]>([])

  return (
    <PageLayout>
      {screen === "list" ? (
        <VocabularyListPage
          vocabularies={vocabularies}
          onNavigateSourceSelection={() => navigate("source-selection")}
          onNavigateFormEmpty={() => navigate("form-empty")}
          onEdit={() => {}}
          onDelete={(vocab) => setVocabularies((prev) => prev.filter((v) => v.id !== vocab.id))}
        />
      ) : (
        <div>Screen: {screen}</div>
      )}
    </PageLayout>
  )
}

export default App
