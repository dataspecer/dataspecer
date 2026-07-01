import { createContext, useContext, type ReactNode } from 'react'
import { useVocabularies } from '../hooks/use-vocabularies'
import type { Vocabulary } from '../types/vocabulary'

interface VocabulariesContextValue {
  vocabularies: Vocabulary[]
  loading: boolean
  addVocabulary: (vocabulary: Vocabulary) => void
  updateVocabulary: (vocabulary: Vocabulary) => void
  deleteVocabulary: (vocabulary: Vocabulary) => void
}

const VocabulariesContext = createContext<VocabulariesContextValue | null>(null)

export function VocabulariesProvider({ children }: { children: ReactNode }) {
  const vocabulariesState = useVocabularies()

  return (
    <VocabulariesContext.Provider value={vocabulariesState}>
      {children}
    </VocabulariesContext.Provider>
  )
}

export function useVocabulariesContext() {
  const context = useContext(VocabulariesContext)
  if (!context) {
    throw new Error('useVocabulariesContext must be used within VocabulariesProvider')
  }
  return context
}
