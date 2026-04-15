import { spawn, execFile, ChildProcess } from "child_process";

export interface VoiceInfo {
	name: string;
	language: string;
	sample: string;
}

export class TTSEngine {
	private process: ChildProcess | null = null;
	onStateChange: ((speaking: boolean) => void) | null = null;

	get isSpeaking(): boolean {
		return this.process !== null;
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

	speak(text: string, voice: string, rate: number): void {
		this.stop();

		const args: string[] = [];
		if (voice) {
			args.push("-v", voice);
		}
		args.push("-r", String(rate));

		this.process = spawn("say", args);

		this.process.stdin?.write(text);
		this.process.stdin?.end();

		this.process.on("close", () => {
			this.process = null;
			this.onStateChange?.(false);
		});

		this.process.on("error", () => {
			this.process = null;
			this.onStateChange?.(false);
		});

		this.onStateChange?.(true);
	}

	stop(): void {
		if (this.process) {
			this.process.kill("SIGTERM");
			this.process = null;
			this.onStateChange?.(false);
		}
	}
}
