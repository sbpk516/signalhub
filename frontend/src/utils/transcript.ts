// Lightweight transcript formatting utilities (frontend-only)

export type FormatOptions = {
  sentencesPerParagraph?: number
  preserveExistingNewlines?: boolean
  maxChars?: number // if text exceeds, we still process but can be used by caller
}

const DEFAULT_OPTIONS: Required<Pick<FormatOptions, 'sentencesPerParagraph' | 'preserveExistingNewlines'>> = {
  sentencesPerParagraph: 3,
  preserveExistingNewlines: true,
}

export const normalizeWhitespace = (text: string): string => {
  if (!text) return ''
  // Collapse multiple spaces, normalize newlines
  return text.replace(/\r\n?/g, '\n').replace(/[\t\f\v]+/g, ' ').replace(/ +/g, ' ').trim()
}

export const splitIntoParagraphsByNewlines = (text: string): string[] => {
  // Split on blank lines or single newlines that indicate breaks
  const parts = text
    .split(/\n{2,}/) // hard paragraph breaks
    .flatMap((block) => block.split(/\n/)) // soft breaks
    .map((s) => s.trim())
    .filter(Boolean)
  return parts
}

export const splitIntoSentences = (text: string): string[] => {
  // Simple sentence tokenizer: split on . ? ! followed by space/newline or end
  // Keeps the punctuation with the sentence
  const sentences: string[] = []
  let buffer = ''
  const push = () => {
    const s = buffer.trim()
    if (s) sentences.push(s)
    buffer = ''
  }

  for (let i = 0; i < text.length; i++) {
    const ch = text[i]
    buffer += ch
    if (ch === '.' || ch === '!' || ch === '?') {
      const next = text[i + 1]
      const after = text.slice(i + 1, i + 3)
      // sentence boundary if next is space/newline/end or quote + space
      if (!next || /\s/.test(next) || /^["')\]]\s?/.test(after)) {
        push()
      }
    }
  }
  push()
  return sentences
}

export const groupSentences = (sentences: string[], maxPerParagraph: number): string[] => {
  const paragraphs: string[] = []
  let current: string[] = []
  for (const s of sentences) {
    current.push(s)
    if (current.length >= maxPerParagraph) {
      paragraphs.push(current.join(' '))
      current = []
    }
  }
  if (current.length) paragraphs.push(current.join(' '))
  return paragraphs
}

export const formatTranscript = (raw: string, opts: FormatOptions = {}): string[] => {
  if (!raw) return []
  const options = { ...DEFAULT_OPTIONS, ...opts }

  const normalized = normalizeWhitespace(raw)

  // If existing newlines are present and we want to preserve, prefer that structure
  if (options.preserveExistingNewlines && /\n/.test(raw)) {
    const parts = splitIntoParagraphsByNewlines(raw)
    if (parts.length > 1) return parts
  }

  // Otherwise sentence-based grouping
  const sentences = splitIntoSentences(normalized)
  // Fallback: if tokenizer failed, return whole text
  if (sentences.length <= 1) return [normalized]
  return groupSentences(sentences, Math.max(1, options.sentencesPerParagraph || 3))
}

