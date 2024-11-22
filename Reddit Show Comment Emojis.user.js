// ==UserScript==
// @name          Reddit Show Comment Emojis
// @description   Shows comment emojis from New New Reddit on Old Reddit.
// @namespace     https://github.com/Yay295/Reddit-Show-Comment-Emojis
// @author        Yay295
// @match         *://*.reddit.com/*
// @version       1.1.1
// ==/UserScript==

'use strict';

const DOM_PARSER = new DOMParser();

const EMOJI_CACHE = {};
const FETCH_CACHE = {};

/**
 * Gets the comment emoji data for the given subreddit as an object mapping IDs to URLs.
 * Returns null if there are no emojis.
 */
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
	let img_elements = emoji_document.querySelectorAll('img[data-media-id]');
	for (let e of img_elements) {
		let emoji_id = e.getAttribute('data-media-id').split('|')[2];
		emoji_data[emoji_id] = e.src;
	}
	EMOJI_CACHE[subreddit_name] = img_elements.length === 0 ? null : emoji_data;

	console.log('got emoji data for ' + subreddit_name, emoji_data);

	return emoji_data;
}

async function processComments(comments) {
	if (comments.length === 0) return;
	let start = Date.now();
	let emojis_replaced = 0;
	for (let comment of comments) {
		let comment_body_element = comment.querySelector(':scope > .entry > form > div');
		if (comment_body_element === null) continue; // if the comment has been deleted

		let comment_body = comment_body_element.innerHTML;
		if (!/:(\d+):/.test(comment_body)) continue; // if the comment doesn't have any emoji

		let emoji_data = await getEmojiData(comment.dataset.subreddit);
		if (emoji_data === null) return; // if this comment's subreddit doesn't have any emoji

		let new_comment_body = comment_body.replaceAll(/:(\d+):/g, (match,id) => {
			let emoji_url = emoji_data[id];
			if (emoji_url) {
				++emojis_replaced;
				// This looks better with "vertical-align:text-bottom;margin:0 .25rem" (what it is on New New Reddit),
				// but Old Reddit doesn't do that, so these emoji would look misaligned next to default emoji.
				return '<img alt="Comment Image" title="' + match + '" src="' + emoji_url + '" width="20" height="20" style="vertical-align:middle">';
			} else {
				return match;
			}
		});
		if (comment_body !== new_comment_body) {
			comment_body_element.innerHTML = new_comment_body;
		}
	}
	if (emojis_replaced) {
		console.log('replaced %i emoji in %i comments in %ims', emojis_replaced, comments.length, Date.now() - start);
	}
}

function processMutations(mutations) {
	let added_comments = [];
	for (let mutation of mutations) {
		for (let node of mutation.addedNodes) {
			if (node.classList && node.classList.contains('comment')) {
				added_comments.add(node);
			}
		}
	}
	if (added_comments.length > 0) {
		processComments(added_comments).catch(error => console.error(error));
	}
}

// Process comments that are already on the page.
processComments(document.querySelectorAll('.comment')).catch(error => console.error(error));

if (document.querySelector('.morecomments')) {
	// The MutationObserver will be triggered when more comments are loaded on a page.
	new MutationObserver(processMutations).observe(document.body,{subtree:true,childList:true});
}
