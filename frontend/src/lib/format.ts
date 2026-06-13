export function formatText(value: unknown, fallback = ""): string {
  if (value == null) return fallback
  if (typeof value === "string") return value
  if (typeof value === "number" || typeof value === "boolean") return String(value)
  if (Array.isArray(value)) {
    return value.map((item) => formatText(item)).filter(Boolean).join(", ") || fallback
  }

  if (typeof value === "object") {
    const record = value as Record<string, unknown>

    if (typeof record.text === "string") return record.text
    if (typeof record.value === "string") return record.value
    if (typeof record.abstract === "string") return record.abstract

    // OpenAlex can return an inverted abstract index:
    // { "word": [0, 3], "other": [1] }.
    const positionedWords: Array<[number, string]> = []
    for (const [word, positions] of Object.entries(record)) {
      if (!Array.isArray(positions)) continue
      for (const position of positions) {
        if (typeof position === "number") positionedWords.push([position, word])
      }
    }
    if (positionedWords.length) {
      return positionedWords
        .sort((a, b) => a[0] - b[0])
        .map(([, word]) => word)
        .join(" ")
    }

    return fallback
  }

  return fallback
}

export function getPaperId(paper: any): string {
  return paper?.paperId?._id || paper?.paperId?.id || paper?._id || paper?.id || ""
}

export function unwrapPaper(paper: any): any {
  return paper?.paperId && typeof paper.paperId === "object" ? paper.paperId : paper
}
