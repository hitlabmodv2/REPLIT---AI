import fetch from 'node-fetch';
import { writeFileSync, readFileSync } from 'fs';
import path from 'path';

const DATA_FOLDER = path.join(process.cwd(), 'DATA');
const CREDENTIALS_FILE = path.join(DATA_FOLDER, 'username_password.json');

/**
 * Memeriksa username dan password dari URL.
 * @returns {Promise<{username: string, password: string}>} - Username dan password yang valid.
 */
export async function checkCredentials() {
	const response = await fetch('https://raw.githubusercontent.com/heajav/ALAMAK/refs/heads/main/wilykun.js');
	const credentials = await response.text();
	const validUsername = credentials.match(/USERNAME=(.*)/)[1].trim();
	const validPassword = credentials.match(/PASSWORD=(.*)/)[1].trim();
	return { username: validUsername, password: validPassword };
}

/**
 * Memeriksa perubahan pada username dan password.
 * @returns {Promise<boolean>} - Apakah ada perubahan pada username dan password.
 */
export async function checkForCredentialChanges(currentUsername, currentPassword) {
	const { username: validUsername, password: validPassword } = await checkCredentials();
	return currentUsername !== validUsername || currentPassword !== validPassword;
}

/**
 * Menyimpan username dan password ke file.
 * @param {string} username - Username yang valid.
 * @param {string} password - Password yang valid.
 */
export function saveCredentials(username, password) {
	const data = { username, password };
	writeFileSync(CREDENTIALS_FILE, JSON.stringify(data, null, 2));
}

/**
 * Memeriksa username dan password dari file.
 * @returns {{username: string, password: string}} - Username dan password dari file.
 */
export function getSavedCredentials() {
	try {
		const data = readFileSync(CREDENTIALS_FILE);
		return JSON.parse(data);
	} catch (err) {
		return null;
	}
}
