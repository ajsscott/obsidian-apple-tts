import { setIcon } from "obsidian";

export interface ControlPanelCallbacks {
	onPlayPause: () => void;
	onStop: () => void;
	onPrevious: () => void;
	onNext: () => void;
}

/**
 * Floating, draggable control panel for TTS playback.
 * Pause, play, stop, previous sentence, next sentence, and a progress counter.
 */
export class ControlPanel {
	private root: HTMLElement | null = null;
	private playPauseBtn: HTMLButtonElement | null = null;
	private counterEl: HTMLElement | null = null;

	private dragOffset: { x: number; y: number } | null = null;
	private onMouseMove = (ev: MouseEvent) => this.handleMouseMove(ev);
	private onMouseUp = () => this.handleMouseUp();

	constructor(private callbacks: ControlPanelCallbacks) {}

	/** Show the panel (idempotent). */
	show(): void {
		if (this.root) return;
		this.root = this.build();
		document.body.appendChild(this.root);
	}

	/** Hide and remove the panel. */
	hide(): void {
		if (!this.root) return;
		this.detachDragListeners();
		this.root.remove();
		this.root = null;
		this.playPauseBtn = null;
		this.counterEl = null;
	}

	/** Update the play/pause button icon. `playing` = currently speaking (show pause icon). */
	setPlaying(playing: boolean): void {
		if (!this.playPauseBtn) return;
		setIcon(this.playPauseBtn, playing ? "pause" : "play");
		this.playPauseBtn.setAttr(
			"aria-label",
			playing ? "Pause" : "Play"
		);
	}

	/** Update the "current / total" counter. */
	setSentenceCounter(current: number, total: number): void {
		if (!this.counterEl) return;
		if (total === 0) {
			this.counterEl.setText("");
		} else {
			this.counterEl.setText(`${current + 1} / ${total}`);
		}
	}

	private build(): HTMLElement {
		const root = document.createElement("div");
		root.addClass("apple-tts-panel");

		// Drag handle (top bar)
		const handle = root.createDiv({ cls: "apple-tts-panel-handle" });
		handle.createSpan({ cls: "apple-tts-panel-title", text: "Apple TTS" });
		this.counterEl = handle.createSpan({ cls: "apple-tts-panel-counter" });
		handle.addEventListener("mousedown", (ev) => this.handleMouseDown(ev));

		// Button row
		const buttons = root.createDiv({ cls: "apple-tts-panel-buttons" });

		this.createButton(buttons, "skip-back", "Previous sentence", () =>
			this.callbacks.onPrevious()
		);

		this.playPauseBtn = this.createButton(
			buttons,
			"pause",
			"Pause",
			() => this.callbacks.onPlayPause()
		);

		this.createButton(buttons, "square", "Stop", () => this.callbacks.onStop());

		this.createButton(buttons, "skip-forward", "Next sentence", () =>
			this.callbacks.onNext()
		);

		return root;
	}

	private createButton(
		parent: HTMLElement,
		icon: string,
		label: string,
		onClick: () => void
	): HTMLButtonElement {
		const btn = parent.createEl("button", { cls: "apple-tts-panel-btn" });
		setIcon(btn, icon);
		btn.setAttr("aria-label", label);
		btn.addEventListener("click", onClick);
		return btn;
	}

	private handleMouseDown(ev: MouseEvent): void {
		if (!this.root) return;
		ev.preventDefault();
		const rect = this.root.getBoundingClientRect();
		this.dragOffset = {
			x: ev.clientX - rect.left,
			y: ev.clientY - rect.top,
		};
		document.addEventListener("mousemove", this.onMouseMove);
		document.addEventListener("mouseup", this.onMouseUp);
	}

	private handleMouseMove(ev: MouseEvent): void {
		if (!this.root || !this.dragOffset) return;
		const x = ev.clientX - this.dragOffset.x;
		const y = ev.clientY - this.dragOffset.y;
		// Clamp to viewport
		const maxX = window.innerWidth - this.root.offsetWidth;
		const maxY = window.innerHeight - this.root.offsetHeight;
		const clampedX = Math.max(0, Math.min(x, maxX));
		const clampedY = Math.max(0, Math.min(y, maxY));
		// Write positions through CSS custom properties so styling stays in
		// the stylesheet (required by Obsidian's no-inline-styles lint rule).
		this.root.style.setProperty("--apple-tts-panel-left", `${clampedX}px`);
		this.root.style.setProperty("--apple-tts-panel-top", `${clampedY}px`);
		this.root.addClass("is-dragged");
	}

	private handleMouseUp(): void {
		this.dragOffset = null;
		this.detachDragListeners();
	}

	private detachDragListeners(): void {
		document.removeEventListener("mousemove", this.onMouseMove);
		document.removeEventListener("mouseup", this.onMouseUp);
	}
}
