// ==UserScript==
// @name          Reddit Show Comment Emojis
// @description   Shows comment emojis from New New Reddit on Old Reddit.
// @namespace     https://github.com/Yay295/Reddit-Show-Comment-Emojis
// @author        Yay295
// @match         *://*.reddit.com/*
// @version       0.0.1
// ==/UserScript==

"use strict";

const DOM_PARSER = new DOMParser();

const EMOJI_CACHE = {};

async function getEmojis(subreddit_name) {
	let response = await fetch('https://www.reddit.com/svc/shreddit/composer/emotes?subredditName=' + subreddit_name);
	let emoji_document = DOM_PARSER.parseFromString(await response.text(),'text/html');
	return Array.from(
		emoji_document.querySelectorAll('img[data-media-id]')
	).map(
		e => ({'id': e.getAttribute('data-media-id').split('|')[2], 'url': e.src})
	);
}

const REDDITS = {
	OLD_REDDIT: {
		getSubredditName: function() {
			return null;
		},

		getComments: function() {
			return document.querySelector('.commentarea .comment');
		},

		processComments: function(comments) {
			let subreddit_name = OLD_REDDIT.getSubredditName();
		},

		processMutations: function(mutations) {
			let added_comments = [];
			for (let mutation of mutations) {
				for (let node of mutation.addedNodes) {
					if (node.classList && node.classList.contains('comment')) {
						added_comments.add(node);
					}
				}
			}
			if (added_comments.length > 0) {
				processComments(added_comments);
			}
		}
	},

	NEW_REDDIT: {
		getSubredditName: function() {
			return null;
		},

		getComments: function() {
			return [];
		},

		processComments: function(comments) {
			let subreddit_name = NEW_REDDIT.getSubredditName();
		},

		processMutations: function(mutations) {
			let added_comments = [];
			for (let mutation of mutations) {
				for (let node of mutation.addedNodes) {
					if (false /* TODO */) {
						added_comments.add(node);
					}
				}
			}
			if (added_comments.length > 0) {
				processComments(added_comments);
			}
		}
	}
};

// Process comments that are already on the page.
for (let reddit of Object.values(REDDITS)) {
	reddit.processComments(reddit.getComments());
}

// The MutationObserver will be triggered when more comments are loaded on a
// page and when an SPA navigation happens (among many other unrelated things).
new MutationObserver(
	mutations => {
		for (let reddit of Object.values(REDDITS)) {
			reddit.processMutations(mutations);
		}
	}
).observe(document.body,{subtree:true,childList:true});
