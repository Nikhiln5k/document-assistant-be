const CHUNK_SIZE = 1000;
const CHUNK_OVERLAP = 150;

/**
 * Splits text into overlapping chunks of roughly CHUNK_SIZE characters,
 * cutting at a paragraph or sentence end when one is close enough.
 */
export function splitIntoChunks(text: string): string[] {
  const cleanText = text
    .replaceAll('\0', '') // Postgres text columns reject NUL bytes, which some PDFs contain
    .replace(/\r\n/g, '\n')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  const chunks: string[] = [];
  let start = 0;

  while (start < cleanText.length) {
    let end = Math.min(start + CHUNK_SIZE, cleanText.length);

    if (end < cleanText.length) {
      const window = cleanText.slice(start, end);
      const breakAt = Math.max(
        window.lastIndexOf('\n'),
        window.lastIndexOf('. '),
      );
      if (breakAt > CHUNK_SIZE / 2) end = start + breakAt + 1;
    }

    const chunk = cleanText.slice(start, end).trim();
    if (chunk) chunks.push(chunk);

    if (end >= cleanText.length) break;
    start = end - CHUNK_OVERLAP;
  }

  return chunks;
}
