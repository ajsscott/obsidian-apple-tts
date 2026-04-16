import { StateEffect, StateField } from "@codemirror/state";
import { Decoration, DecorationSet, EditorView } from "@codemirror/view";

/**
 * CodeMirror extension that highlights a single active range in the editor.
 * Used to show which sentence is currently being read aloud.
 */

const highlightMark = Decoration.mark({ class: "apple-tts-active-sentence" });

/**
 * State effect to update the highlight. Pass `null` to clear.
 */
export const setActiveHighlight = StateEffect.define<{ from: number; to: number } | null>();

/**
 * State field that tracks the current highlight decoration.
 */
export const highlightField = StateField.define<DecorationSet>({
	create() {
		return Decoration.none;
	},
	update(deco, tr) {
		// Re-map existing decoration across document changes
		deco = deco.map(tr.changes);

		for (const effect of tr.effects) {
			if (effect.is(setActiveHighlight)) {
				const range = effect.value;
				if (range === null) {
					deco = Decoration.none;
				} else {
					const { from, to } = range;
					const docLen = tr.state.doc.length;
					// Clamp to document bounds and ensure from < to
					const safeFrom = Math.max(0, Math.min(from, docLen));
					const safeTo = Math.max(safeFrom, Math.min(to, docLen));
					if (safeFrom === safeTo) {
						deco = Decoration.none;
					} else {
						deco = Decoration.set([highlightMark.range(safeFrom, safeTo)]);
					}
				}
			}
		}

		return deco;
	},
	provide: (field) => EditorView.decorations.from(field),
});

/**
 * The full extension — include this in your editor via plugin registration.
 */
export const ttsHighlightExtension = [highlightField];

/**
 * Imperative helper: dispatch a highlight update on a given EditorView.
 */
export function applyHighlight(
	view: EditorView,
	range: { from: number; to: number } | null
): void {
	view.dispatch({
		effects: setActiveHighlight.of(range),
	});
}
