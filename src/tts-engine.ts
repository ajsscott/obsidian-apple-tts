import { spawn, execFile, ChildProcess } from "child_process";

export interface VoiceInfo {
	name: string;
	language: string;
	sample: string;
}

export class TTSEngine {
	private process: ChildProcess | null = null;
	private queue: string[] = [];
	private currentIndex = -1;
	private currentVoice = "";
	private currentRate = 175;
	private paused = false;
	/** Incremented each time playback is cancelled or restarted; the close
	 * handler checks this to detect cancellation and stop advancing the queue. */
	private sessionToken = 0;

	onStateChange: ((speaking: boolean) => void) | null = null;
	/** Fires when the speaker starts a new sentence. Passes the sentence index. */
	onSentenceChange: ((index: number) => void) | null = null;
	/** Fires when pause state changes. */
	onPauseChange: ((paused: boolean) => void) | null = null;

	get isSpeaking(): boolean {
		return this.process !== null;
	}

	get isPaused(): boolean {
		return this.paused;
	}

	get queueLength(): number {
		return this.queue.length;
	}

	get currentSentenceIndex(): number {
		return this.currentIndex;
	}

	async getVoices(): Promise<VoiceInfo[]> {
		return new Promise((resolve, reject) => {
			execFile("say", ["-v", "?"], (error, stdout) => {
				if (error) {
					reject(new Error(error?.message ?? "Failed to list voices"));
					return;
				}
				const voices: VoiceInfo[] = [];
				for (const line of stdout.split("\n")) {
					const match = line.match(/^(.+?)\s{2,}(\w{2}_\w{2})\s+#\s+(.+)$/);
					if (match) {
						voices.push({
							name: match[1],
							language: match[2],
							sample: match[3],
						});
					}
				}
				resolve(voices);
			});
		});
	}

	/**
	 * Speak a list of sentences in order. Fires `onSentenceChange(index)` before
	 * each sentence starts. A single string is also accepted — it becomes a
	 * one-item queue.
	 */
	speak(sentences: string | string[], voice: string, rate: number): void {
		// Internal cleanup — we do NOT call stop() here because that would fire
		// onStateChange(false), which downstream listeners (e.g. highlight clear)
		// interpret as "playback ended." This is a new playback starting.
		this.sessionToken++;
		this.queue = [];
		this.currentIndex = -1;
		this.killCurrentProcess();
		this.setPaused(false);

		const queue = typeof sentences === "string" ? [sentences] : sentences;
		const nonEmpty = queue.filter((s) => s.trim().length > 0);
		if (nonEmpty.length === 0) {
			this.onStateChange?.(false);
			return;
		}

		this.queue = nonEmpty;
		this.currentVoice = voice;
		this.currentRate = rate;

		this.onStateChange?.(true);
		this.speakNext(this.sessionToken);
	}

	/**
	 * Pause the currently-playing sentence. Uses SIGSTOP, which halts the
	 * `say` process where it is. Resume picks up from the exact same point.
	 */
	pause(): void {
		if (!this.process || this.paused) return;
		try {
			this.process.kill("SIGSTOP");
			this.setPaused(true);
		} catch {
			// Process may have already exited — ignore
		}
	}

	/**
	 * Resume a paused sentence via SIGCONT.
	 */
	resume(): void {
		if (!this.process || !this.paused) return;
		try {
			this.process.kill("SIGCONT");
			this.setPaused(false);
		} catch {
			// Process may have already exited — ignore
		}
	}

	/**
	 * Jump to the next sentence. Kills the current one and starts the next.
	 * No-op if already at the last sentence.
	 */
	next(): void {
		this.jumpTo(this.currentIndex + 1);
	}

	/**
	 * Jump to the previous sentence. Kills the current one and starts the
	 * previous. No-op if already at the first sentence.
	 */
	previous(): void {
		this.jumpTo(this.currentIndex - 1);
	}

	private jumpTo(targetIndex: number): void {
		if (targetIndex < 0 || targetIndex >= this.queue.length) return;

		// Bump session token so the about-to-die process's close handler
		// sees a stale token and bails out instead of auto-advancing.
		this.sessionToken++;
		const newToken = this.sessionToken;

		this.killCurrentProcess();
		this.setPaused(false);

		// speakNext() will increment currentIndex, so we pre-decrement.
		this.currentIndex = targetIndex - 1;
		this.speakNext(newToken);
	}

	private speakNext(token: number): void {
		// If stop() or a new speak() was called, this session is stale — bail out.
		if (token !== this.sessionToken) return;

		this.currentIndex++;
		if (this.currentIndex >= this.queue.length) {
			// Queue finished
			this.process = null;
			this.onStateChange?.(false);
			return;
		}

		const sentence = this.queue[this.currentIndex];
		this.onSentenceChange?.(this.currentIndex);

		const args: string[] = [];
		if (this.currentVoice) {
			args.push("-v", this.currentVoice);
		}
		args.push("-r", String(this.currentRate));

		const proc = spawn("say", args);
		this.process = proc;

		proc.stdin?.write(sentence);
		proc.stdin?.end();

		proc.on("close", () => {
			// If token changed, we were stopped or replaced — don't advance.
			if (token !== this.sessionToken) return;
			this.speakNext(token);
		});

		proc.on("error", () => {
			if (token !== this.sessionToken) return;
			this.process = null;
			this.onStateChange?.(false);
		});
	}

	stop(): void {
		// Bump the session token first so in-flight close handlers bail out.
		this.sessionToken++;
		this.queue = [];
		this.currentIndex = -1;

		this.killCurrentProcess();
		this.setPaused(false);
		this.onStateChange?.(false);
	}

	/**
	 * Kill the child process cleanly, including the case where it is paused.
	 * SIGSTOP'd processes don't respond to SIGTERM until continued, so send
	 * SIGCONT first if we might be paused, then SIGTERM.
	 */
	private killCurrentProcess(): void {
		if (!this.process) return;
		try {
			if (this.paused) {
				this.process.kill("SIGCONT");
			}
			this.process.kill("SIGTERM");
		} catch {
			// Process may already be gone
		}
		this.process = null;
	}

	private setPaused(value: boolean): void {
		if (this.paused === value) return;
		this.paused = value;
		this.onPauseChange?.(value);
	}
}
