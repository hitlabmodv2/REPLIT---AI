import fetch from 'node-fetch';

export async function getMusicUrls() {
	const response = await fetch('https://raw.githubusercontent.com/kominiyou/DATA/refs/heads/main/URL_MUSIK_NARUTO.js');
	const text = await response.text();
	return JSON.parse(text);
}
