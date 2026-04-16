export interface SentenceSegment {
	/** Cleaned sentence text — what `say` reads aloud. */
	text: string;
	/** Start offset in the original (unprocessed) text. -1 if not found. */
	from: number;
	/** End offset in the original (unprocessed) text. -1 if not found. */
	to: number;
}

/**
 * Split cleaned text into sentences on terminal punctuation.
 * Keeps it simple — does NOT try to handle abbreviations like "Dr." or "e.g.".
 * For speech synthesis those breaks are acceptable.
 */
export function splitSentences(cleaned: string): string[] {
	const trimmed = cleaned.trim();
	if (!trimmed) return [];

	// Split on [.!?] followed by whitespace or end-of-string.
	// Keep the terminator with the sentence.
	const regex = /[^.!?]+[.!?]+(?=\s|$)|[^.!?]+$/g;
	const matches = trimmed.match(regex);
	if (!matches) return [trimmed];

	return matches.map((s) => s.trim()).filter((s) => s.length > 0);
}

/**
 * Map cleaned sentences back to positions in the original text.
 *
 * Strategy: for each sentence, search for its first 2–3 words in the original,
 * starting from the last match position. End of the sentence = start of the
 * next sentence (or end of text).
 *
 * This handles inline formatting reasonably: "**Quick** brown fox" in original
 * cleans to "Quick brown fox"; searching for "Quick" still finds position 2.
 * The highlight will include the `**` markers — acceptable for MVP.
 *
 * Returns segments with `from = -1, to = -1` when the sentence can't be located.
 */
export function mapSentences(
	sentences: string[],
	originalText: string,
	originalOffset = 0
): SentenceSegment[] {
	const segments: SentenceSegment[] = [];
	let searchFrom = 0;
	const positions: (number | null)[] = [];

	// First pass: find start positions for each sentence
	for (const sentence of sentences) {
		const pos = findSentenceStart(sentence, originalText, searchFrom);
		positions.push(pos);
		if (pos !== null) {
			searchFrom = pos + 1;
		}
	}

	// Second pass: build segments where end = start of next (or end of text)
	for (let i = 0; i < sentences.length; i++) {
		const pos = positions[i];
		if (pos === null) {
			segments.push({ text: sentences[i], from: -1, to: -1 });
			continue;
		}

		// Find the next successfully located sentence to determine end
		let nextPos: number | null = null;
		for (let j = i + 1; j < positions.length; j++) {
			if (positions[j] !== null) {
				nextPos = positions[j];
				break;
			}
		}

		const to = nextPos ?? originalText.length;
		segments.push({
			text: sentences[i],
			from: pos + originalOffset,
			to: to + originalOffset,
		});
	}

	return segments;
}

/**
 * Find where a cleaned sentence likely starts in the original text.
 * Tries progressively shorter prefixes if the longer ones don't match.
 */
function findSentenceStart(
	sentence: string,
	originalText: string,
	searchFrom: number
): number | null {
	const words = sentence.split(/\s+/).filter((w) => w.length > 0);
	if (words.length === 0) return null;

	// Try matching first 3 words, then 2, then 1
	for (const count of [3, 2, 1]) {
		if (words.length < count) continue;
		const prefix = words.slice(0, count).join(" ");
		if (prefix.length < 2) continue;
		const pos = originalText.indexOf(prefix, searchFrom);
		if (pos !== -1) return pos;
	}

	// Last resort: try just the first word if it's long enough to be distinctive
	const firstWord = words[0];
	if (firstWord.length >= 4) {
		const pos = originalText.indexOf(firstWord, searchFrom);
		if (pos !== -1) return pos;
	}

	return null;
}
