import { createContext, useContext, type ReactNode } from 'react'
import { useVocabularies } from '../hooks/use-vocabularies'
import type { CvmControlledVocabulary } from '../types/controlled-vocabulary'

interface VocabulariesContextValue {
  vocabularies: CvmControlledVocabulary[]
  loading: boolean
  addVocabulary: (vocabulary: CvmControlledVocabulary) => void
  updateVocabulary: (vocabulary: CvmControlledVocabulary) => void
  deleteVocabulary: (vocabulary: CvmControlledVocabulary) => void
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
