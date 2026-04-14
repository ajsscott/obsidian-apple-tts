# Apple TTS — Obsidian Plugin

Read your Obsidian notes aloud using the native macOS text-to-speech system.

> **macOS only.** This plugin uses the built-in `say` command available on macOS. It does not work on Windows or Linux.

No internet connection required. No external API keys. No subscriptions. Apple TTS uses the voices already installed on your Mac — the same ones available in System Settings > Accessibility > Spoken Content.

---

## Features

- **Read entire note** — Reads the full content of the active note
- **Read selected text** — Speaks only the text you've highlighted
- **Read from cursor** — Starts reading from your cursor position to the end of the note
- **Stop speaking** — Instantly stops playback
- **180+ voices** — Choose from all macOS voices installed on your system, including Siri voices and novelty voices
- **Adjustable speed** — 0.5x to 3.0x speech rate
- **Content filters** — Toggle which parts of your notes are read (code blocks, math equations, tables, links, images, embeds, callouts, HTML, tags)
- **Smart markdown stripping** — Automatically removes formatting syntax so you hear clean prose, not asterisks and brackets

## Installation

### From Obsidian Community Plugins

1. Open **Settings** > **Community plugins**
2. Turn off **Restricted mode** if it's still on
3. Click **Browse** and search for **"Apple TTS"**
4. Click **Install**, then **Enable**

### Manual Installation

1. Download `main.js`, `manifest.json`, and `styles.css` (if present) from the [latest release](https://github.com/ajsscott/obsidian-apple-tts/releases/latest)
2. Create a folder called `apple-tts` inside your vault's `.obsidian/plugins/` directory
3. Copy the downloaded files into that folder
4. Restart Obsidian and enable the plugin in **Settings** > **Community plugins**

## Usage

### Commands

Open the command palette (**Cmd+P**) and search for "Apple TTS":

| Command | Description |
|---|---|
| **Read entire note** | Reads the active note from start to finish |
| **Read selected text** | Reads only the currently highlighted text |
| **Read from cursor position** | Reads from your cursor to the end of the note |
| **Stop speaking** | Stops any active speech immediately |

### Ribbon Icon

Click the speaker icon in the left ribbon to toggle reading:
- When idle, clicking it reads the current note
- When speaking, clicking it stops playback

### Hotkeys

Assign your own keyboard shortcuts in **Settings** > **Hotkeys** — search for "Apple TTS" to find all four commands.

## Settings

### Voice & Speed

| Setting | Description | Default |
|---|---|---|
| **Language filter** | Filter the voice list by language code (e.g., `en`, `fr`, `ja`) | *(all voices)* |
| **Voice** | Select from installed macOS voices | *(System Default)* |
| **Speech rate** | Playback speed from 0.5x (slow) to 3.0x (fast) | 1.0x |

### Content Filters

Control which parts of your notes are read aloud. When a filter is **on**, that content type is **skipped**.

| Filter | What it controls | Default |
|---|---|---|
| **Skip code blocks** | Fenced code blocks (` ``` `) and inline code (`` ` ``) | On (skipped) |
| **Skip math equations** | LaTeX math (`$...$` and `$$...$$`) | On (skipped) |
| **Skip tables** | Markdown table content | Off (read aloud) |
| **Skip link text** | Text inside `[links](url)` | Off (read aloud) |
| **Skip images** | Image alt text from `![alt](url)` | On (skipped) |
| **Skip embeds** | Obsidian embeds `![[filename]]` | On (skipped) |
| **Skip callouts** | Callout body content (`> [!note]`) | Off (read aloud) |
| **Skip HTML** | Inline HTML tags | On (skipped) |
| **Skip tags** | Obsidian tags (`#tag`) | On (skipped) |

### Installing More Voices

macOS comes with a set of default voices, but you can install many more:

1. Open **System Settings** > **Accessibility** > **Spoken Content**
2. Click the dropdown next to **System Voice** and select **Manage Voices...**
3. Browse and download additional voices (including high-quality Siri voices)
4. Restart Obsidian — new voices will appear in the plugin's voice dropdown

## Platform Compatibility

| Platform | Supported |
|---|---|
| macOS (desktop) | Yes |
| Windows | No |
| Linux | No |
| iOS / iPadOS | No |
| Android | No |

This plugin is marked as **desktop only** in its manifest and will only load on macOS. On other platforms, it displays a notice explaining the requirement.

## How It Works

Apple TTS uses the macOS `say` command under the hood. When you trigger a read command:

1. The plugin extracts text from the active editor
2. Markdown syntax is stripped according to your content filter settings
3. The cleaned text is piped to the `say` process via stdin
4. The `say` process speaks the text through your system audio output

Stopping playback sends a termination signal to the running `say` process.

## Known Limitations

- **No pause/resume** — The macOS `say` command does not support pausing. Stop always means starting over from the beginning. This is a limitation of the underlying system command.
- **No audio progress indicator** — Since `say` speaks in real-time without providing progress callbacks, there is no seek bar or time display.
- **macOS only** — This plugin relies on a macOS-specific system command and cannot work on other operating systems.

## Development

### Building from Source

```bash
git clone https://github.com/ajsscott/obsidian-apple-tts.git
cd obsidian-apple-tts
npm install
npm run build
```

### Development Mode

```bash
npm run dev
```

This starts esbuild in watch mode — it rebuilds `main.js` automatically when you save changes.

### Testing in Your Vault

Symlink the plugin into your vault's plugin directory:

```bash
ln -s /path/to/obsidian-apple-tts /path/to/your-vault/.obsidian/plugins/apple-tts
```

Then toggle the plugin off and on in Obsidian's Community Plugins settings to reload it after changes.

## License

[MIT](LICENSE)
