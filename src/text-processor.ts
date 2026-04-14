export interface FilterOptions {
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

export function stripMarkdownForSpeech(
	text: string,
	filters: FilterOptions
): string {
	let result = text;

	// Frontmatter — always removed (metadata, never useful to hear)
	result = result.replace(/^---\n[\s\S]*?\n---\n?/, "");

	// Code blocks (fenced)
	if (filters.skipCodeBlocks) {
		result = result.replace(/```[\s\S]*?```/g, "");
		result = result.replace(/~~~[\s\S]*?~~~/g, "");
		result = result.replace(/`[^`]+`/g, "");
	} else {
		// Keep content, remove fence markers
		result = result.replace(/```\w*\n([\s\S]*?)```/g, "$1");
		result = result.replace(/~~~\w*\n([\s\S]*?)~~~/g, "$1");
		result = result.replace(/`([^`]+)`/g, "$1");
	}

	// HTML comments — always removed
	result = result.replace(/<!--[\s\S]*?-->/g, "");

	// Math (LaTeX) — must come before other inline processing
	if (filters.skipMath) {
		result = result.replace(/\$\$[\s\S]*?\$\$/g, "");
		result = result.replace(/\$[^$\n]+\$/g, "");
	} else {
		// Remove just the dollar sign delimiters, keep content
		result = result.replace(/\$\$([\s\S]*?)\$\$/g, "$1");
		result = result.replace(/\$([^$\n]+)\$/g, "$1");
	}

	// Images
	if (filters.skipImages) {
		result = result.replace(/!\[[^\]]*\]\([^)]*\)/g, "");
	} else {
		// Read alt text
		result = result.replace(/!\[([^\]]*)\]\([^)]*\)/g, "$1");
	}

	// Embeds
	if (filters.skipEmbeds) {
		result = result.replace(/!\[\[[^\]]*\]\]/g, "");
	} else {
		// Read the filename
		result = result.replace(/!\[\[([^\]|]+)(?:\|[^\]]*)?\]\]/g, "$1");
	}

	// Wiki-links with display text: [[page|display]] → display
	result = result.replace(/\[\[[^\]|]+\|([^\]]+)\]\]/g, "$1");

	// Wiki-links without display text: [[page]] → page
	result = result.replace(/\[\[([^\]]+)\]\]/g, "$1");

	// Markdown links
	if (filters.skipLinks) {
		result = result.replace(/\[([^\]]+)\]\([^)]*\)/g, "");
	} else {
		result = result.replace(/\[([^\]]+)\]\([^)]*\)/g, "$1");
	}

	// HTML tags
	if (filters.skipHtml) {
		result = result.replace(/<[^>]+>/g, "");
	}

	// Tables
	if (filters.skipTables) {
		// Remove table rows (lines starting with |)
		result = result.replace(/^\|.*\|$/gm, "");
	} else {
		// Remove separator rows (|---|---|)
		result = result.replace(/^\|[\s\-:|]+\|$/gm, "");
		// Extract cell content: remove leading/trailing pipes and split
		result = result.replace(/^\|(.+)\|$/gm, (_match, cells: string) => {
			return cells
				.split("|")
				.map((c: string) => c.trim())
				.filter((c: string) => c)
				.join(", ");
		});
	}

	// Callouts — always strip the syntax line, keep body
	result = result.replace(/^>\s*\[![\w-]+\].*$/gm, "");

	// Heading markers
	result = result.replace(/^#{1,6}\s+/gm, "");

	// Bold/italic/strikethrough markers (keep inner text)
	result = result.replace(/\*\*\*(.+?)\*\*\*/g, "$1");
	result = result.replace(/\*\*(.+?)\*\*/g, "$1");
	result = result.replace(/\*(.+?)\*/g, "$1");
	result = result.replace(/___(.+?)___/g, "$1");
	result = result.replace(/__(.+?)__/g, "$1");
	result = result.replace(/_(.+?)_/g, "$1");
	result = result.replace(/~~(.+?)~~/g, "$1");

	// Horizontal rules
	result = result.replace(/^[-*_]{3,}\s*$/gm, "");

	// Blockquote prefixes
	result = result.replace(/^>\s?/gm, "");

	// Tags
	if (filters.skipTags) {
		result = result.replace(/(?<=\s|^)#[\w/-]+/gm, "");
	}

	// Highlight markers
	result = result.replace(/==(.+?)==/g, "$1");

	// Collapse multiple blank lines
	result = result.replace(/\n{3,}/g, "\n\n");

	return result.trim();
}
