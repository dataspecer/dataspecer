import { useEffect, useState } from 'react'
import { CONTROLLED_VOCABULARY_MODEL } from '@dataspecer/core-v2/model/known-models'
import { httpFetch } from '@dataspecer/core/io/fetch/fetch-browser'
import { generateEntityId } from '@dataspecer/core/entity-model'
import { createSetEntityOperation } from '@dataspecer/core/operation'
import { PROJECT_MODEL_ID, createCreateModelOperation, createRemoveModelOperation } from '@dataspecer/core/project-model'
import { createControlledVocabularyManagerModelStore, type DefaultFrontendModelStore } from '@dataspecer/model-store/implementation'
import { CONTROLLED_VOCABULARY_TYPE, type ControlledVocabulary } from '@dataspecer/controlled-vocabulary-model'
import { useEventCallback } from './use-event-callback'
import { useConfig } from '../contexts/config-context'

const packageIri = new URLSearchParams(window.location.search).get('package-iri')

/**
 * Reads all currently tracked controlled vocabulary models from the store -
 * each model has exactly one entity, keyed by the model's own id.
 */
function readVocabularies(modelStore: DefaultFrontendModelStore): ControlledVocabulary[] {
  const result: ControlledVocabulary[] = []
  for (const [modelId, entities] of Object.entries(modelStore.getAllEntities())) {
    const entity = entities[modelId] as ControlledVocabulary | undefined
    if (entity) {
      result.push(entity)
    }
  }
  return result
}

export function useVocabularies() {
  const { backendUrl } = useConfig()
  const [modelStore, setModelStore] = useState<DefaultFrontendModelStore | null>(null)
  const [vocabularies, setVocabularies] = useState<ControlledVocabulary[]>([])
  const [loading, setLoading] = useState(!!packageIri)

  useEffect(() => {
    if (!packageIri) return

    const store = createControlledVocabularyManagerModelStore({
      projectId: packageIri,
      backendUrl,
      httpFetch,
    })

    let cancelled = false

    const unsubscribeEntityChanges = store.subscribeToEntityChanges(() => {
      setVocabularies(readVocabularies(store))
    })
    const unsubscribeTransactionCommit = store.subscribeToTransactionCommit(() => {
      store.saveByOverride()
    })

    store
      .initialize()
      .then(() => store.waitForModelsToLoad())
      .then(() => {
        if (cancelled) return
        setVocabularies(readVocabularies(store))
        setModelStore(store)
        setLoading(false)
      })

    return () => {
      cancelled = true
      unsubscribeEntityChanges()
      unsubscribeTransactionCommit()
    }
  }, [backendUrl])

  const addVocabulary = useEventCallback((vocabulary: Omit<ControlledVocabulary, 'id' | 'type'>) => {
    if (!modelStore || !packageIri) return
    const id = generateEntityId()
    const entity: ControlledVocabulary = { ...vocabulary, id, type: [CONTROLLED_VOCABULARY_TYPE] }
    modelStore.transaction(
      [
        { modelId: PROJECT_MODEL_ID, operation: createCreateModelOperation(packageIri, CONTROLLED_VOCABULARY_MODEL, id) },
        { modelId: id, operation: createSetEntityOperation(entity) },
      ],
      {},
    )
  })

  const updateVocabulary = useEventCallback((id: string, vocabulary: Omit<ControlledVocabulary, 'id' | 'type'>) => {
    if (!modelStore) return
    const entity: ControlledVocabulary = { ...vocabulary, id, type: [CONTROLLED_VOCABULARY_TYPE] }
    modelStore.transaction([{ modelId: id, operation: createSetEntityOperation(entity) }], {})
  })

  const deleteVocabulary = useEventCallback((id: string) => {
    if (!modelStore) return
    modelStore.transaction([{ modelId: PROJECT_MODEL_ID, operation: createRemoveModelOperation(id) }], {})
  })

  return {
    vocabularies,
    loading,
    addVocabulary,
    updateVocabulary,
    deleteVocabulary,
  }
}
