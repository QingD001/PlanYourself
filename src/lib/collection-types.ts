export const COLLECTION_TYPES = [
  { value: "article", label: "文章" },
  { value: "video", label: "视频" },
  { value: "course", label: "课程" },
  { value: "book", label: "书籍" },
  { value: "project", label: "项目" },
  { value: "exercise", label: "习题" },
] as const

export type CollectionType = (typeof COLLECTION_TYPES)[number]["value"]

export const DEFAULT_COLLECTION_TYPE: CollectionType = "exercise"

export function normalizeCollectionType(value?: string | null): CollectionType {
  if (!value) return DEFAULT_COLLECTION_TYPE
  const normalized = value.trim().toLowerCase()
  return COLLECTION_TYPES.some((type) => type.value === normalized)
    ? (normalized as CollectionType)
    : DEFAULT_COLLECTION_TYPE
}

export function getCollectionTypeLabel(value?: string | null) {
  const normalized = normalizeCollectionType(value)
  return COLLECTION_TYPES.find((type) => type.value === normalized)?.label ?? normalized
}
