import { createContext, useContext, type ReactNode } from 'react'
import type { ControlledVocabulary } from '@dataspecer/controlled-vocabulary-model'
import { useVocabularies, type NestedVocabularyPackage, type VocabulariesError } from '../hooks/use-vocabularies'

interface VocabulariesContextValue {
  vocabularies: ControlledVocabulary[]
  own: ControlledVocabulary[]
  nestedPackages: NestedVocabularyPackage[]
  loading: boolean
  error: VocabulariesError | null
  addVocabulary: (vocabulary: Omit<ControlledVocabulary, 'id' | 'type'>) => void
  updateVocabulary: (id: string, vocabulary: Omit<ControlledVocabulary, 'id' | 'type'>) => void
  deleteVocabulary: (id: string) => void
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
