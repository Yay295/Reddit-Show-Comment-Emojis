// ==UserScript==
// @name          Reddit Show Comment Emojis
// @description   Shows comment emojis from New New Reddit on Old Reddit.
// @namespace     https://github.com/Yay295/Reddit-Show-Comment-Emojis
// @author        Yay295
// @match         *://*.reddit.com/*
// @version       0.5.12
// ==/UserScript==

'use strict';

const DOM_PARSER = new DOMParser();

const EMOJI_CACHE = {};
const FETCH_CACHE = {};

async function getEmojiData(subreddit_name) {
	let emoji_data = EMOJI_CACHE[subreddit_name];
	if (emoji_data) return emoji_data;

	let fetch_promise = FETCH_CACHE[subreddit_name];
	if (!fetch_promise) {
		console.log('fetching emoji data for ' + subreddit_name);
		fetch_promise = fetch(location.origin + '/svc/shreddit/composer/emotes?subredditName=' + subreddit_name);
		FETCH_CACHE[subreddit_name] = fetch_promise;
	}

	let response = await fetch_promise;

	// check for data again after awaiting
	emoji_data = EMOJI_CACHE[subreddit_name];
	if (emoji_data) return emoji_data;

	let emoji_document = DOM_PARSER.parseFromString(await response.text(),'text/html');

	// check for data again after awaiting
	emoji_data = EMOJI_CACHE[subreddit_name];
	if (emoji_data) return emoji_data;

	console.log('fetched emoji document for ' + subreddit_name);

	emoji_data = {};
	for (let e of emoji_document.querySelectorAll('img[data-media-id]')) {
		let emoji_id = e.getAttribute('data-media-id').split('|')[2];
		emoji_data[emoji_id] = e.src;
	}
	EMOJI_CACHE[subreddit_name] = emoji_data;

	console.log('got emoji data for ' + subreddit_name, emoji_data);

	return emoji_data;
}

const REDDITS = {
	'OLD_REDDIT': {
		'getComments': function() {
			return document.querySelectorAll('.commentarea .comment');
		},

		'processComments': function(comments) {
			let subreddit_name = document.querySelector('div[data-subreddit]').dataset.subreddit;
			getEmojiData(subreddit_name).then(emoji_data => {
				for (let comment of comments) {
					let comment_body_element = comment.querySelector(':scope > .entry > form > div');
					let comment_body = comment_body_element.innerHTML;
					let new_comment_body = comment_body.replaceAll(/:(\d+):/g, (match,id) => {
						let emoji_url = emoji_data[id];
						if (emoji_url) {
							return '<img alt="Comment Image" title="' + match + '" src="' + emoji_url + '" width="20" height="20" style="vertical-align:middle">';
						} else {
							return match;
						}
					});
					if (comment_body !== new_comment_body) {
						comment_body_element.innerHTML = new_comment_body;
					}
				}
			}).catch(error => console.error(error));
		},

		'processMutations': function(mutations) {
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

	'NEW_REDDIT': {
		'getComments': function() {
			return [];
		},

		'processComments': function(comments) {
			let subreddit_name = null;
		},

		'processMutations': function(mutations) {
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
