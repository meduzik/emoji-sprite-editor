// Based on https://github.com/TruthfulTechnology/unicode.party/

import emojidata from 'unicode-emoji-json';
import emojilib from 'emojilib';

interface EmojiData {
	name: string;
	char: string;
	skinTone?: boolean;
	score?: number;
}

function humanize(word: string, category: string): string {
	if (category === 'Flags' && word.match(/^flag_/)) {
		return word.replace(/^flag_/, '').replace(/_/g, ' ');
	}
	return (word || '').replace(/_/g, ' ');
}

function scoreKeyword(keyword: string = '', query: string = ''): number {
	const normalizedQuery = query.toLowerCase().replace(/\W*/g, '');
	if (keyword.indexOf(normalizedQuery) === -1) {
		return 0;
	}
	return normalizedQuery.length / keyword.length;
}

export class EmojiSearcher {
	private keywords: Map<string, Set<EmojiData>>;

	constructor() {
		this.keywords = new Map();
		this.seedEmoji();
	}

	private seedEmoji() {
		for (const char of Object.keys(emojidata)) {
			const data = emojidata[char as keyof typeof emojidata];
			if (!data || !char) {
				continue;
			}
			
			const { slug, group, skin_tone_support: skinTone } = data;
			const keywords = (emojilib as any)[char] || [];
			const emoji: EmojiData = { 
				name: humanize(slug, group), 
				char,
				skinTone: skinTone || false
			};
			
			this.addKeyword(emoji.name.toLowerCase(), emoji);
			this.addKeyword(humanize(group, group).toLowerCase(), emoji);
			for (const k of keywords) {
				this.addKeyword(k.toLowerCase(), emoji);
			}
		}
	}

	private addKeyword(keyword: string, emoji: EmojiData) {
		if (this.keywords.has(keyword)) {
			this.keywords.get(keyword)!.add(emoji);
		} else {
			this.keywords.set(keyword, new Set([emoji]));
		}
	}

	findEmoji(query: string): EmojiData[] {
		if (!query || query.trim() === '') {
			return [];
		}

		const matches = new Set<EmojiData>();
		const scores = new Map<EmojiData, number>();
		
		this.keywords.forEach((emojis, keyword) => {
			const score = scoreKeyword(keyword, query);
			if (score === 0) {
				return;
			}
			for (const emoji of emojis) {
				scores.set(emoji, (scores.get(emoji) || 0) + score);
			}
			emojis.forEach(e => matches.add(e));
		});

		return Array.from(matches)
			.map(m => ({ ...m, score: scores.get(m) || 0 }))
			.sort((a, b) => b.score - a.score)
			.slice(0, 100); // Limit to top 100 results
	}
}
