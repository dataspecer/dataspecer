import { useEffect, useState } from 'react'
import { CONTROLLED_VOCABULARY_MODEL } from '@dataspecer/core-v2/model/known-models'
import { httpFetch } from '@dataspecer/core/io/fetch/fetch-browser'
import { generateEntityId } from '@dataspecer/core/entity-model'
import { createSetEntityOperation, createUpdateEntityOperation } from '@dataspecer/core/operation'
import {
  PROJECT_MODEL_ID,
  createCreateModelOperation,
  createRemoveModelOperation,
  isPackageEntity,
  type PackageEntity,
} from '@dataspecer/core/project-model'
import type { LanguageString } from '@dataspecer/core/core/core-resource'
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

export interface NestedVocabularyPackage {
  packageId: string
  label: LanguageString
  vocabularies: ControlledVocabulary[]
}

interface GroupedVocabularies {
  own: ControlledVocabulary[]
  nestedPackages: NestedVocabularyPackage[]
}

const EMPTY_GROUPED_VOCABULARIES: GroupedVocabularies = { own: [], nestedPackages: [] }

/**
 * Splits the tracked controlled vocabulary models into those directly owned
 * by `rootPackageId` and those found in its descendant packages (grouped per
 * descendant package, skipping descendants with no vocabularies of their own).
 */
function groupVocabulariesByPackage(
  modelStore: DefaultFrontendModelStore,
  rootPackageId: string,
): GroupedVocabularies {
  const entities = modelStore.getAllEntities()
  const projectTree = entities[PROJECT_MODEL_ID] as Record<string, PackageEntity> | undefined
  const rootPackage = projectTree?.[rootPackageId]
  if (!projectTree || !rootPackage || !isPackageEntity(rootPackage)) {
    return EMPTY_GROUPED_VOCABULARIES
  }

  function resolveVocabulary(modelId: string): ControlledVocabulary | undefined {
    return entities[modelId]?.[modelId] as ControlledVocabulary | undefined
  }

  function collectOwnVocabularies(pkg: PackageEntity): ControlledVocabulary[] {
    return pkg.subModels
      .map(resolveVocabulary)
      .filter((vocabulary): vocabulary is ControlledVocabulary => vocabulary !== undefined)
  }

  const own = collectOwnVocabularies(rootPackage)
  const nestedPackages: NestedVocabularyPackage[] = []
  const visited = new Set<string>([rootPackageId])

  function walk(pkg: PackageEntity) {
    for (const childId of pkg.subModels) {
      const child = projectTree![childId]
      if (!child || !isPackageEntity(child) || visited.has(child.id)) continue
      visited.add(child.id)

      const vocabularies = collectOwnVocabularies(child)
      if (vocabularies.length > 0) {
        nestedPackages.push({
          packageId: child.id,
          label: child.label,
          vocabularies,
        })
      }
      walk(child)
    }
  }
  walk(rootPackage)

  return { own, nestedPackages }
}

export type VocabulariesError = 'missing-package' | 'load-failed'

export function useVocabularies() {
  const { backendUrl } = useConfig()
  const [modelStore, setModelStore] = useState<DefaultFrontendModelStore | null>(null)
  const [vocabularies, setVocabularies] = useState<ControlledVocabulary[]>([])
  const [grouped, setGrouped] = useState<GroupedVocabularies>(EMPTY_GROUPED_VOCABULARIES)
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

    const refresh = () => {
      setVocabularies(readVocabularies(store))
      setGrouped(groupVocabulariesByPackage(store, packageIri))
    }

    const unsubscribeEntityChanges = store.subscribeToEntityChanges(refresh)
    const unsubscribeTransactionCommit = store.subscribeToTransactionCommit(() => {
      store.saveByOverride()
    })

    store
      .initialize()
      .then(() => store.waitForModelsToLoad())
      .then(() => {
        if (cancelled) return
        refresh()
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
    own: grouped.own,
    nestedPackages: grouped.nestedPackages,
    loading,
    error,
    addVocabulary,
    updateVocabulary,
    deleteVocabulary,
  }
}
