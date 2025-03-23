import path from 'path';
import { spawn } from 'child_process';
import { watchFile, unwatchFile } from 'fs';
import { config } from 'dotenv';
import chalk from 'chalk';
import os from 'os';

import treeKill from './lib/tree-kill.js';
import { askQuestion } from './utils/askQuestion.js';
import { randomColor } from './utils/randomColor.js';
import { checkCredentials, checkForCredentialChanges, saveCredentials, getSavedCredentials } from './utils/credentials.js';

config(); // Load .env file

let activeProcess = null;
let currentUsername = null;
let currentPassword = null;
let credentialCheckInterval = null;
let intervalStartTime = null;

/**
 * Memeriksa username dan password dari URL.
 * @param {Function} callback - Fungsi yang akan dipanggil setelah autentikasi selesai.
 */
async function authenticate(callback) {
	const { username: validUsername, password: validPassword } = await checkCredentials();
	const savedCredentials = getSavedCredentials();

	// Hapus log kredensial
	// console.log('Valid credentials from URL:', { validUsername, validPassword });
	// console.log('Current credentials:', { currentUsername, currentPassword });
	// console.log('Saved credentials:', savedCredentials);

	if (savedCredentials && savedCredentials.username === validUsername && savedCredentials.password === validPassword) {
		currentUsername = validUsername;
		currentPassword = validPassword;
		console.log('--------------------------------------------------');
		console.log(chalk.black(chalk.bgGreen('✅ Autentikasi berhasil menggunakan kredensial yang tersimpan.')));
		console.log('--------------------------------------------------');
		callback();
	} else {
		currentUsername = validUsername;
		currentPassword = validPassword;

		console.log('--------------------------------------------------'); // Tambahkan garis pemisah
		console.log('Meminta input username...');
		const username = await askQuestion(chalk.black(chalk.bgGreen('USERNAME: ')));
		console.log('--------------------------------------------------'); // Tambahkan garis pemisah
		console.log('Meminta input password...');
		const password = await askQuestion(chalk.black(chalk.bgGreen('PASSWORD: ')), true);

		console.log(''); // Tambahkan baris baru untuk memisahkan prompt dan pesan kesalahan

		if (username === validUsername && password === validPassword) {
			saveCredentials(username, password); // Simpan kredensial yang valid
			currentUsername = validUsername; // Perbarui currentUsername
			currentPassword = validPassword; // Perbarui currentPassword
			callback();
		} else {
			console.error(randomColor('AUTENTIKASI GAGAL. USERNAME ATAU PASSWORD TIDAK VALID.'));
			process.exit(1); // Bot mati jika autentikasi gagal
		}
	}
}

/**
 * Memulai proses baru atau menghentikan proses yang sedang berjalan dan memulai ulang.
 * @param {string} file - Nama file yang akan dijalankan.
 */
function start(file) {
	if (activeProcess) {
		clearInterval(credentialCheckInterval); // Hentikan interval pemeriksaan kredensial
		treeKill(activeProcess.pid, 'SIGTERM', err => {
			if (err) {
				console.error('Error stopping process:', err);
			} else {
				console.log('--------------------------------------------------');
				console.log('Process stopped.');
				console.log('--------------------------------------------------');
				activeProcess = null;
				start(file);
			}
		});
	} else {
		console.log('--------------------------------------------------');
		console.log('Starting . . .');
		console.log('--------------------------------------------------');
		let args = [path.join(process.cwd(), file), ...process.argv.slice(2)];
		let p = spawn(process.argv[0], args, { stdio: ['inherit', 'inherit', 'inherit', 'ipc'] })
			.on('message', data => {
				console.log('--------------------------------------------------');
				console.log('[RECEIVED]', data);
				console.log('--------------------------------------------------');
				switch (data) {
					case 'reset':
						start(file);
						break;
					case 'uptime':
						p.send(process.uptime());
						break;
				}
			})
			.on('exit', code => {
				console.log('--------------------------------------------------');
				console.error('Exited with code:', code);
				console.log('--------------------------------------------------');
				if (Number(code) && code === 0) return;
				if (code === 1) {
					console.log('--------------------------------------------------');
					console.log('Restarting due to exit code 1...');
					console.log('--------------------------------------------------');
					setTimeout(() => start(file), 5000); // Restart after 5 seconds
					return;
				}
				watchFile(args[0], () => {
					unwatchFile(args[0]);
					start(file);
				});
			})
			.on('error', err => {
				console.log('--------------------------------------------------');
				console.error('Failed to start process:', err);
				console.log('--------------------------------------------------');
				if (err.message.includes('Failed to decrypt message with any known session') || err.message.includes('Bad MAC')) {
					console.log('--------------------------------------------------');
					console.error('Session error detected:', err.message);
					console.log('Restarting due to session error...');
					console.log('--------------------------------------------------');
					setTimeout(() => start(file), 5000); // Restart after 5 seconds
					return;
				}
				console.log('--------------------------------------------------');
				console.error('An unexpected error occurred:', err);
				console.log('--------------------------------------------------');
				setTimeout(() => start(file), 5000); // Restart after 5 seconds
			});

		activeProcess = p;

		// Periksa perubahan kredensial setiap 1 menit
		const checkCredentials = async () => {
			const credentialsChanged = await checkForCredentialChanges(currentUsername, currentPassword);
			if (credentialsChanged) {
				console.log('--------------------------------------------------');
				console.log(chalk.black(chalk.bgGreen('⚠️ Maaf, username dan password telah diubah oleh owner Wilykun. Terima kasih. 🙏')));
				treeKill(activeProcess.pid, 'SIGTERM', err => {
					if (err) {
						console.error('Error stopping process:', err);
					} else {
						console.log('--------------------------------------------------');
						console.log(chalk.black(chalk.bgGreen('Process stopped due to credential change.')));
						console.log('--------------------------------------------------');
						process.exit(1);
					}
				});
			}
		};

		if (!intervalStartTime) {
			intervalStartTime = Date.now();
		}

		const elapsedTime = Date.now() - intervalStartTime;
		const remainingTime = 60000 - (elapsedTime % 60000);

		setTimeout(() => {
			checkCredentials();
			credentialCheckInterval = setInterval(checkCredentials, 60000);
		}, remainingTime);
	}
}

// Panggil fungsi authenticate sebelum memulai proses
authenticate(() => start('Wilykun.js'));

// Tambahkan penanganan untuk uncaughtException dan unhandledRejection
if (process.env.HANDLE_ERRORS === 'true') {
	process.on('uncaughtException', function (err) {
		let e = String(err);
		if (e.includes("Socket connection timeout")) return;
		if (e.includes("item-not-found")) return;
		if (e.includes("rate-overlimit")) return;
		if (e.includes("Connection Closed")) return;
		if (e.includes("Timed Out")) return;
		if (e.includes("Value not found")) return;
		if (e.includes("Failed to decrypt message with any known session") || e.includes("Bad MAC")) return;
		if (e.includes("Closing open session in favor of incoming prekey bundle")) return;
		if (e.includes("Closing session: SessionEntry")) return;
		console.log('Caught exception: ', err);
	});

	process.on('unhandledRejection', function (reason, promise) {
		let e = String(reason);
		if (e.includes("Socket connection timeout")) return;
		if (e.includes("item-not-found")) return;
		if (e.includes("rate-overlimit")) return;
		if (e.includes("Connection Closed")) return;
		if (e.includes("Timed Out")) return;
		if (e.includes("Value not found")) return;
		if (e.includes("Failed to decrypt message with any known session") || e.includes("Bad MAC")) return;
		if (e.includes("Closing open session in favor of incoming prekey bundle")) return;
		if (e.includes("Closing session: SessionEntry")) return;
		console.error('Unhandled rejection at:', promise, 'reason:', reason);
	});
}