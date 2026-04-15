import { App, PluginSettingTab, Setting } from "obsidian";
import type AppleTTSPlugin from "./main";

export interface AppleTTSSettings {
	voice: string;
	rate: number;
	languageFilter: string;
	skipFrontmatter: boolean;
	skipCodeBlocks: boolean;
	skipLinks: boolean;
	skipImages: boolean;
	skipMath: boolean;
	skipTables: boolean;
	skipCallouts: boolean;
	skipHtml: boolean;
	skipTags: boolean;
	skipEmbeds: boolean;
}

export const DEFAULT_SETTINGS: AppleTTSSettings = {
	voice: "",
	rate: 1.0,
	languageFilter: "",
	skipFrontmatter: true,
	skipCodeBlocks: true,
	skipLinks: false,
	skipImages: true,
	skipMath: true,
	skipTables: false,
	skipCallouts: false,
	skipHtml: true,
	skipTags: true,
	skipEmbeds: true,
};

export class AppleTTSSettingTab extends PluginSettingTab {
	plugin: AppleTTSPlugin;

	constructor(app: App, plugin: AppleTTSPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;
		containerEl.empty();

		// --- Voice & Speed ---

		const voices = this.plugin.voices;
		const filtered = this.plugin.settings.languageFilter
			? voices.filter((v) =>
					v.language
						.toLowerCase()
						.startsWith(
							this.plugin.settings.languageFilter.toLowerCase()
						)
				)
			: voices;

		new Setting(containerEl)
			.setName("Language filter")
			.setDesc(
				'Filter voices by language prefix (e.g. "en", "fr"). Leave empty for all voices.'
			)
			.addText((text) =>
				text
					.setPlaceholder("en")
					.setValue(this.plugin.settings.languageFilter)
					.onChange(async (value) => {
						this.plugin.settings.languageFilter = value;
						await this.plugin.saveSettings();
						this.display();
					})
			);

		new Setting(containerEl)
			.setName("Voice")
			.setDesc(
				`Select a macOS voice (${filtered.length} available).`
			)
			.addDropdown((dropdown) => {
				dropdown.addOption("", "System default");
				for (const voice of filtered) {
					dropdown.addOption(
						voice.name,
						`${voice.name} (${voice.language})`
					);
				}
				dropdown.setValue(this.plugin.settings.voice);
				dropdown.onChange(async (value) => {
					this.plugin.settings.voice = value;
					await this.plugin.saveSettings();
				});
			});

		new Setting(containerEl)
			.setName("Speech rate")
			.setDesc(
				`Speed multiplier (current: ${this.plugin.settings.rate}x)`
			)
			.addSlider((slider) =>
				slider
					.setLimits(0.5, 3.0, 0.1)
					.setValue(this.plugin.settings.rate)
					.setDynamicTooltip()
					.onChange(async (value) => {
						this.plugin.settings.rate =
							Math.round(value * 10) / 10;
						await this.plugin.saveSettings();
						this.display();
					})
			);

		// --- Content Filters ---

		new Setting(containerEl)
			.setName("Content filters")
			.setDesc("Choose which content types to skip when reading aloud.")
			.setHeading();

		const filters: {
			key: keyof AppleTTSSettings;
			name: string;
			desc: string;
		}[] = [
			{
				key: "skipCodeBlocks",
				name: "Skip code blocks",
				desc: "Skip fenced code blocks and inline code",
			},
			{
				key: "skipMath",
				name: "Skip math equations",
				desc: "Skip LaTeX math ($...$ and $$...$$)",
			},
			{
				key: "skipTables",
				name: "Skip tables",
				desc: "Skip markdown table content",
			},
			{
				key: "skipLinks",
				name: "Skip link text",
				desc: "Remove link text entirely (off = read the link text)",
			},
			{
				key: "skipImages",
				name: "Skip images",
				desc: "Skip image references (off = read alt text)",
			},
			{
				key: "skipEmbeds",
				name: "Skip embeds",
				desc: "Skip ![[embedded]] references (off = read filename)",
			},
			{
				key: "skipCallouts",
				name: "Skip callouts",
				desc: "Skip callout content (off = read callout body)",
			},
			{
				key: "skipHtml",
				name: "Skip HTML",
				desc: "Strip HTML tags from content",
			},
			{
				key: "skipTags",
				name: "Skip tags",
				desc: "Remove #tags from speech",
			},
		];

		for (const filter of filters) {
			new Setting(containerEl)
				.setName(filter.name)
				.setDesc(filter.desc)
				.addToggle((toggle) =>
					toggle
						.setValue(
							this.plugin.settings[filter.key] as boolean
						)
						.onChange(async (value) => {
							(this.plugin.settings[filter.key] as boolean) =
								value;
							await this.plugin.saveSettings();
						})
				);
		}
	}
}
