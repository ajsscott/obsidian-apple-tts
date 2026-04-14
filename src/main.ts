import { MarkdownView, Notice, Plugin, setIcon } from "obsidian";
import { TTSEngine, VoiceInfo } from "./tts-engine";
import { stripMarkdownForSpeech } from "./text-processor";
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

	async onload() {
		await this.loadSettings();

		if (process.platform !== "darwin") {
			new Notice("Apple TTS requires macOS");
			return;
		}

		this.ttsEngine.onStateChange = (speaking: boolean) => {
			if (this.ribbonIconEl) {
				setIcon(
					this.ribbonIconEl,
					speaking ? "square" : "audio-lines"
				);
			}
			if (this.statusBarEl) {
				this.statusBarEl.setText(
					speaking ? "TTS: Speaking..." : ""
				);
			}
		};

		try {
			this.voices = await this.ttsEngine.getVoices();
		} catch {
			new Notice("Apple TTS: Could not load voices");
		}

		this.ribbonIconEl = this.addRibbonIcon(
			"audio-lines",
			"Apple TTS: Read note aloud",
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
					const selection = view.editor.getSelection();
					if (!selection) {
						new Notice("No text selected");
						return true;
					}
					this.speakText(selection);
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
					this.speakText(text);
				}
				return true;
			},
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
	}

	private readNote() {
		const view = this.app.workspace.getActiveViewOfType(MarkdownView);
		if (!view) {
			new Notice("No active note");
			return;
		}
		const text = view.editor.getValue();
		if (!text.trim()) {
			new Notice("Note is empty");
			return;
		}
		this.speakText(text);
	}

	private speakText(rawText: string) {
		const cleaned = stripMarkdownForSpeech(rawText, this.settings);
		if (!cleaned) {
			new Notice("No speakable text found");
			return;
		}
		// Convert multiplier (0.5x–3.0x) to WPM (say default is ~175)
		const wpm = Math.round(175 * this.settings.rate);
		this.ttsEngine.speak(
			cleaned,
			this.settings.voice,
			wpm
		);
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
