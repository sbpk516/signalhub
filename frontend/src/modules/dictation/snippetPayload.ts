export interface DictationSnippetBuildParams {
  chunks: BlobPart[]
  mimeType: string
  durationMs: number
}

export interface DictationSnippetPayload {
  base64Audio: string
  mimeType: string
  durationMs: number
  sizeBytes: number
}

export const MAX_SNIPPET_BYTES = 5 * 1024 * 1024

export async function buildSnippetPayload({
  chunks,
  mimeType,
  durationMs,
}: DictationSnippetBuildParams): Promise<DictationSnippetPayload> {
  if (!chunks || chunks.length === 0) {
    throw new Error('No audio chunks available for upload')
  }

  const resolvedMimeType = mimeType || 'audio/webm'
  const blob = new Blob(chunks, { type: resolvedMimeType })
  const arrayBuffer = await blob.arrayBuffer()
  const sizeBytes = arrayBuffer.byteLength
  if (sizeBytes === 0) {
    throw new Error('Audio blob is empty')
  }
  if (sizeBytes > MAX_SNIPPET_BYTES) {
    throw new Error(`Audio blob exceeds maximum size (${sizeBytes} bytes)`) 
  }

  const bytes = new Uint8Array(arrayBuffer)
  const CHUNK_SIZE = 32 * 1024 // 32KB to avoid string bloat
  let binary = ''
  for (let i = 0; i < bytes.length; i += CHUNK_SIZE) {
    const chunk = bytes.subarray(i, i + CHUNK_SIZE)
    binary += String.fromCharCode(...chunk)
  }
  const base64Audio = btoa(binary)

  return {
    base64Audio,
    mimeType: resolvedMimeType,
    durationMs,
    sizeBytes,
  }
}
