import { useEffect, useState } from 'react'
import { CONTROLLED_VOCABULARY_MODEL } from '@dataspecer/core-v2/model/known-models'
import { httpFetch } from '@dataspecer/core/io/fetch/fetch-browser'
import { generateEntityId } from '@dataspecer/core/entity-model'
import { createSetEntityOperation, createUpdateEntityOperation } from '@dataspecer/core/operation'
import { PROJECT_MODEL_ID, createCreateModelOperation, createRemoveModelOperation } from '@dataspecer/core/project-model'
import { createControlledVocabularyManagerModelStore, type DefaultFrontendModelStore } from '@dataspecer/model-store/implementation'
import { CONTROLLED_VOCABULARY_TYPE, type ControlledVocabulary } from '@dataspecer/controlled-vocabulary-model'
import { useEventCallback } from './use-event-callback'
import { useConfig } from '../contexts/config-context'

/**
 * The project's package iri is the last path segment of the URL 
 * e.g. `/controlled-vocabulary-manager/<iri>`
 */
function getPackageIriFromPath(): string | null {
  const segments = window.location.pathname.split('/').filter(Boolean)
  const last = segments[segments.length - 1]
  if (!last || last === 'controlled-vocabulary-manager') return null
  return decodeURIComponent(last)
}

const packageIri = getPackageIriFromPath()

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

export type VocabulariesError = 'missing-package' | 'load-failed'

export function useVocabularies() {
  const { backendUrl } = useConfig()
  const [modelStore, setModelStore] = useState<DefaultFrontendModelStore | null>(null)
  const [vocabularies, setVocabularies] = useState<ControlledVocabulary[]>([])
  const [loading, setLoading] = useState(!!packageIri)
  const [error, setError] = useState<VocabulariesError | null>(packageIri ? null : 'missing-package')

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
      .catch((err) => {
        if (cancelled) return
        console.error('Failed to load controlled vocabularies model store', err)
        setError('load-failed')
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
    const createModel = createCreateModelOperation(packageIri, CONTROLLED_VOCABULARY_MODEL, id)
    // set model label for package manager
    createModel.label = { en: vocabulary.title }
    modelStore.transaction(
      [
        { modelId: PROJECT_MODEL_ID, operation: createModel },
        { modelId: id, operation: createSetEntityOperation(entity) },
      ],
      {},
    )
  })

  const updateVocabulary = useEventCallback((id: string, vocabulary: Omit<ControlledVocabulary, 'id' | 'type'>) => {
    if (!modelStore) return
    const entity: ControlledVocabulary = { ...vocabulary, id, type: [CONTROLLED_VOCABULARY_TYPE] }
    modelStore.transaction(
      [
        { modelId: id, operation: createSetEntityOperation(entity) },
        // Keeps the resource's own label (shown in the package manager) in
        // sync with the vocabulary's title - the backend persists label
        // changes on a model's project-model entity into its resource metadata 
        { modelId: PROJECT_MODEL_ID, operation: createUpdateEntityOperation(id, { label: { en: vocabulary.title } }) },
      ],
      {},
    )
  })

  const deleteVocabulary = useEventCallback((id: string) => {
    if (!modelStore) return
    modelStore.transaction([{ modelId: PROJECT_MODEL_ID, operation: createRemoveModelOperation(id) }], {})
  })

  return {
    vocabularies,
    loading,
    error,
    addVocabulary,
    updateVocabulary,
    deleteVocabulary,
  }
}
