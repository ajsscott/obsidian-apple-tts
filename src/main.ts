import { MarkdownView, Notice, Plugin, setIcon, Editor } from "obsidian";
import { EditorView } from "@codemirror/view";
import { TTSEngine, VoiceInfo } from "./tts-engine";
import { stripMarkdownForSpeech } from "./text-processor";
import { splitSentences, mapSentences, SentenceSegment } from "./sentence-splitter";
import { ttsHighlightExtension, applyHighlight } from "./highlight-extension";
import { ControlPanel } from "./control-panel";
import {
	AppleTTSSettings,
	AppleTTSSettingTab,
	DEFAULT_SETTINGS,
} from "./settings";

export default class AppleTTSPlugin extends Plugin {
	settings: AppleTTSSettings = DEFAULT_SETTINGS;
	ttsEngine: TTSEngine = new TTSEngine();
	voices: VoiceInfo[] = [];
	private ribbonIconEl: HTMLElement | null = null;
	private statusBarEl: HTMLElement | null = null;
	private controlPanel: ControlPanel | null = null;

	/** Editor view currently being highlighted, and the sentence segments we
	 * pre-computed for the active playback. Cleared on stop. */
	private activeView: EditorView | null = null;
	private activeSegments: SentenceSegment[] = [];

	async onload() {
		await this.loadSettings();

		if (process.platform !== "darwin") {
			new Notice("This plugin requires macOS");
			return;
		}

		// Register the CodeMirror highlight extension once — it then runs in
		// every markdown editor and watches for setActiveHighlight effects.
		this.registerEditorExtension(ttsHighlightExtension);

		this.controlPanel = new ControlPanel({
			onPlayPause: () => this.togglePlayPause(),
			onStop: () => this.ttsEngine.stop(),
			onPrevious: () => this.ttsEngine.previous(),
			onNext: () => this.ttsEngine.next(),
		});

		this.ttsEngine.onStateChange = (speaking: boolean) => {
			if (this.ribbonIconEl) {
				setIcon(
					this.ribbonIconEl,
					speaking ? "square" : "audio-lines"
				);
			}
			if (this.statusBarEl) {
				this.statusBarEl.setText(
					speaking ? "Speaking..." : ""
				);
			}
			if (speaking) {
				this.controlPanel?.show();
				this.controlPanel?.setPlaying(true);
			} else {
				this.controlPanel?.hide();
				this.clearHighlight();
			}
		};

		this.ttsEngine.onSentenceChange = (index: number) => {
			this.highlightSentence(index);
			this.controlPanel?.setSentenceCounter(
				index,
				this.ttsEngine.queueLength
			);
		};

		this.ttsEngine.onPauseChange = (paused: boolean) => {
			this.controlPanel?.setPlaying(!paused);
			if (this.statusBarEl) {
				this.statusBarEl.setText(paused ? "Paused" : "Speaking...");
			}
		};

		try {
			this.voices = await this.ttsEngine.getVoices();
		} catch (e) {
			new Notice(`Could not load voices: ${e instanceof Error ? e.message : String(e)}`);
		}

		this.ribbonIconEl = this.addRibbonIcon(
			"audio-lines",
			"Read note aloud",
			() => {
				if (this.ttsEngine.isSpeaking) {
					this.ttsEngine.stop();
				} else {
					this.readNote();
				}
			}
		);

		this.statusBarEl = this.addStatusBarItem();

		this.addCommand({
			id: "read-note",
			name: "Read entire note",
			checkCallback: (checking: boolean) => {
				const view =
					this.app.workspace.getActiveViewOfType(MarkdownView);
				if (!view) return false;
				if (!checking) this.readNote();
				return true;
			},
		});

		this.addCommand({
			id: "read-selection",
			name: "Read selected text",
			checkCallback: (checking: boolean) => {
				const view =
					this.app.workspace.getActiveViewOfType(MarkdownView);
				if (!view) return false;
				if (!checking) {
					const editor = view.editor;
					const selection = editor.getSelection();
					if (!selection) {
						new Notice("No text selected");
						return true;
					}
					const offset = editor.posToOffset(editor.getCursor("from"));
					this.speakText(selection, editor, offset);
				}
				return true;
			},
		});

		this.addCommand({
			id: "read-from-cursor",
			name: "Read from cursor position",
			checkCallback: (checking: boolean) => {
				const view =
					this.app.workspace.getActiveViewOfType(MarkdownView);
				if (!view) return false;
				if (!checking) {
					const editor = view.editor;
					const cursor = editor.getCursor();
					const lastLine = editor.lastLine();
					const endPos = {
						line: lastLine,
						ch: editor.getLine(lastLine).length,
					};
					const text = editor.getRange(cursor, endPos);
					if (!text.trim()) {
						new Notice("No text after cursor");
						return true;
					}
					const offset = editor.posToOffset(cursor);
					this.speakText(text, editor, offset);
				}
				return true;
			},
		});

		this.addCommand({
			id: "pause-resume",
			name: "Pause or resume speaking",
			callback: () => this.togglePlayPause(),
		});

		this.addCommand({
			id: "next-sentence",
			name: "Jump to next sentence",
			callback: () => this.ttsEngine.next(),
		});

		this.addCommand({
			id: "previous-sentence",
			name: "Jump to previous sentence",
			callback: () => this.ttsEngine.previous(),
		});

		this.addCommand({
			id: "stop",
			name: "Stop speaking",
			callback: () => {
				this.ttsEngine.stop();
			},
		});

		this.addSettingTab(new AppleTTSSettingTab(this.app, this));
	}

	onunload() {
		this.ttsEngine.stop();
		this.clearHighlight();
		this.controlPanel?.hide();
	}

	private togglePlayPause() {
		if (!this.ttsEngine.isSpeaking) return;
		if (this.ttsEngine.isPaused) {
			this.ttsEngine.resume();
		} else {
			this.ttsEngine.pause();
		}
	}

	private readNote() {
		const view = this.app.workspace.getActiveViewOfType(MarkdownView);
		if (!view) {
			new Notice("No active note");
			return;
		}
		const editor = view.editor;
		const text = editor.getValue();
		if (!text.trim()) {
			new Notice("Note is empty");
			return;
		}
		this.speakText(text, editor, 0);
	}

	/**
	 * Strip the raw text, split into sentences, map each back to a position
	 * range in the original text, and send the sentences to the TTS engine.
	 */
	private speakText(rawText: string, editor?: Editor, rawOffset = 0) {
		const cleaned = stripMarkdownForSpeech(rawText, this.settings);
		if (!cleaned) {
			new Notice("No speakable text found");
			return;
		}

		const sentences = splitSentences(cleaned);
		this.activeSegments = mapSentences(sentences, rawText, rawOffset);
		this.activeView = editor ? getEditorView(editor) : null;

		// Convert multiplier (0.5x–3.0x) to WPM (say default is ~175)
		const wpm = Math.round(175 * this.settings.rate);
		this.ttsEngine.speak(
			sentences,
			this.settings.voice,
			wpm
		);
	}

	private highlightSentence(index: number) {
		if (!this.activeView) return;
		const segment = this.activeSegments[index];
		if (!segment || segment.from < 0) {
			// Couldn't locate this sentence — clear any previous highlight
			applyHighlight(this.activeView, null);
			return;
		}
		applyHighlight(this.activeView, { from: segment.from, to: segment.to });
	}

	private clearHighlight() {
		if (this.activeView) {
			applyHighlight(this.activeView, null);
		}
		this.activeView = null;
		this.activeSegments = [];
	}

	async loadSettings() {
		this.settings = Object.assign(
			{},
			DEFAULT_SETTINGS,
			await this.loadData()
		);
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}
}

/**
 * Extract the CodeMirror EditorView from an Obsidian Editor.
 * Obsidian exposes `cm` as the EditorView — stable but undocumented.
 */
function getEditorView(editor: Editor): EditorView | null {
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	const cm = (editor as any).cm;
	if (cm instanceof EditorView) return cm;
	return null;
}
