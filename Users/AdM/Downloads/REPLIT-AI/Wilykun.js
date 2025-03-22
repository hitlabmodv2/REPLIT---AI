import 'dotenv/config';

import makeWASocket, {
	delay,
	useMultiFileAuthState,
	fetchLatestBaileysVersion,
	makeInMemoryStore,
	jidNormalizedUser,
	DisconnectReason,
	Browsers,
	makeCacheableSignalKeyStore,
} from 'baileys';
import pino from 'pino';
import { Boom } from '@hapi/boom';
import fs from 'fs';
import os from 'os';
import { exec } from 'child_process';
import chalk from 'chalk'; // Pastikan chalk diimpor
import path from 'path'; // Pastikan path diimpor
import readline from 'readline'; // Tambahkan impor readline
// Hapus impor fungsi dari helpers.js
// import { handleConnectionUpdate } from './ALAMAK/helpers.js'; // Impor fungsi handleConnectionUpdate
import { handleDisconnectReason, handleGroupParticipantsUpdate, handleHalloMessage } from './ALAMAK/case.js'; // Impor fungsi handleDisconnectReason, handleGroupParticipantsUpdate, dan handleHalloMessage
// Hapus impor fungsi dari statusViewCounter.js
// import { incrementStatusViewCount, incrementNoReactViewCount } from './lib/statusViewCounter.js';
import { autoReactStatus, checkUnreadStatuses } from './Random_Emot/Code_Auto_Read_Story.js';
import { handleAutoTyping } from './FITUR_BY_WILY/Auto_Typing_Ricord_Ceklis_2_no_read.js'; // Impor fungsi handleAutoTyping
import { handleWelcomeMessage } from './FITUR_BY_WILY/welcome.js'; // Impor fungsi handleWelcomeMessage
import { handleGoodbyeMessage } from './FITUR_BY_WILY/goodbay.js'; // Impor fungsi handleGoodbyeMessage
import { handleAntiWaMeLink } from './FITUR_BY_WILY/ANTI_GC/antiwame.js'; // Impor fungsi handleAntiWaMeLink
import { handleAntiForwardedNewsletter } from './FITUR_BY_WILY/ANTI_GC/antiforwardednewsletter.js'; // Impor fungsi handleAntiForwardedNewsletter
import { handleAntiChannelLink } from './FITUR_BY_WILY/ANTI_GC/antisaluran.js'; // Impor fungsi handleAntiChannelLink
import { handleAntiGroupLink } from './FITUR_BY_WILY/ANTI_GC/antigroup.js'; // Import the new function
import { handleGroupChat } from './FITUR_BY_WILY/buka_tutup_gc.js'; // Impor fungsi handleGroupChat
import { handlePrivateWelcomeMessage } from './FITUR_BY_WILY/welcometopribadi.js'; // Impor fungsi handlePrivateWelcomeMessage
import { handlePrivateGoodbyeMessage } from './FITUR_BY_WILY/goodbaytopribadi.js'; // Impor fungsi handlePrivateGoodbyeMessage
import { handleAntiAdmin } from './FITUR_BY_WILY/antiadmin_kecuali_owner_gc.js'; // Impor fungsi handleAntiAdmin
import { handleOwnerWelcomeMessage } from './FITUR_BY_WILY/FITUR_SAMBUTAN_PEMILIK_GROUP/SambutanOwner.js'; // Import the new function
import { handleImageToSticker } from './FITUR_BY_WILY/AUTO/AutoSticker.js'; // Import the AutoSticker function
import { handleStickerToImage } from './FITUR_BY_WILY/AUTO/AutoStickerToImages.js'; // Import the AutoStickerToImages function


import treeKill from './lib/tree-kill.js';
import serialize, { Client } from './lib/serialize.js';
// Hapus impor sendTelegram
// import { formatSize, parseFileSize, sendTelegram } from './lib/function.js';

import { sendConnectionMessage } from './NOTIFIKASI/hehe.js'; // Impor fungsi sendConnectionMessage
import { sendTelegram } from './lib/function.js'; // Impor fungsi sendTelegram
import { autoClearSession } from './CLEAR_SESSION/autoclearsession.js'; // Impor fungsi autoClearSession
import { Sticker, createSticker } from 'wa-sticker-formatter'; // Import the Sticker and createSticker functions
// Remove ytdl-core and ffmpeg imports
// import ytdl from 'ytdl-core';
// import ffmpeg from 'fluent-ffmpeg';

const logger = pino({ timestamp: () => `,"time":"${new Date().toJSON()}"` }).child({ class: 'Wilykun' });
logger.level = 'fatal';

const usePairingCode = process.env.PAIRING_NUMBER;
const store = makeInMemoryStore({ logger });

if (process.env.WRITE_STORE === 'true') store.readFromFile(path.join(process.cwd(), process.env.SESSION_DIR, 'store.json'));

// check available file
const pathContacts = path.join(process.cwd(), process.env.SESSION_DIR, 'contacts.json');
const pathMetadata = path.join(process.cwd(), process.env.SESSION_DIR, 'groupMetadata.json');

const enableTyping = process.env.ENABLE_TYPING === 'true';
const enableRecording = process.env.ENABLE_RECORDING === 'true';
const autoOnlineAutoReadPesan = process.env.AUTO_ONLINE_AUTO_READ_PESAN === 'true';
const enableWelcomeMessage = process.env.ENABLE_WELCOME_MESSAGE === 'true';
const enableGoodbyeMessage = process.env.ENABLE_GOODBYE_MESSAGE === 'true';
const enableAntiChannelLink = process.env.ENABLE_ANTI_CHANNEL_LINK === 'true';
const enableAntiGroupLink = process.env.ENABLE_ANTI_GROUP_LINK === 'true';
const enableOwnerWelcomeMessage = process.env.ENABLE_OWNER_WELCOME_MESSAGE === 'true';
const ownerWelcomeMessageDelay = parseInt(process.env.OWNER_WELCOME_MESSAGE_DELAY, 10) || 600000;
const autoStickerMode = process.env.AUTO_STICKER_MODE;

// Jalankan saat panel start jika diaktifkan
if (process.env.AUTO_CLEAR_SESSION_ENABLED === 'true') {
    autoClearSession();
}

const rl = readline.createInterface({
	input: process.stdin,
	output: process.stdout
});

async function getPairingNumber() {
	return new Promise((resolve) => {
		console.log(chalk.blue.bold('\n==================== PAIRING SETUP ===================='));
		console.log(chalk.yellow('📱 Masukkan nomor WhatsApp Anda: ')); // Tambahkan log ini
		rl.question(chalk.yellow('📱 Nomer Whatsappmu '), (answer) => {
			console.log(chalk.blue.bold('======================================================\n'));
			resolve(answer);
		});
	});
}

async function validatePhoneNumber(phoneNumber) {
	// Logika validasi nomor telepon bisa ditambahkan di sini
	// Misalnya, memeriksa apakah nomor hanya berisi angka dan panjangnya sesuai
	const isValid = /^\d+$/.test(phoneNumber) && phoneNumber.length >= 10 && phoneNumber.length <= 15;
	return isValid;
}

const browserType = process.env.BROWSER_TYPE || 'ubuntu';
const browserNameMap = {
	ubuntu: 'Chrome',
	macOS: 'Safari',
	windows: 'Edge',
	chrome: 'Chrome',
	firefox: 'Firefox',
	safari: 'Safari',
	opera: 'Opera',
	brave: 'Brave'
};
const browserName = browserNameMap[browserType] || 'Chrome';

const startSock = async () => {
	const { state, saveCreds } = await useMultiFileAuthState(path.join(process.cwd(), process.env.SESSION_DIR));
	const { version, isLatest } = await fetchLatestBaileysVersion();

	console.log(`using WA v${version.join('.')}, isLatest: ${isLatest}`);

	/**
	 * @type {import('baileys').WASocket}
	 */
	const Wilykun = makeWASocket.default({
		version,
		logger,
		printQRInTerminal: false, // Ubah menjadi false agar default ke pairing code
		auth: {
			creds: state.creds,
			keys: makeCacheableSignalKeyStore(state.keys, logger),
		},
		browser: Browsers[browserType](browserName),
		markOnlineOnConnect: false,
		generateHighQualityLinkPreview: true,
		syncFullHistory: true,
		retryRequestDelayMs: 10,
		transactionOpts: { maxCommitRetries: 10, delayBetweenTriesMs: 10 },
		defaultQueryTimeoutMs: undefined,
		maxMsgRetryCount: 15,
		appStateMacVerification: {
			patch: true,
			snapshot: true,
		},
		getMessage: async key => {
			const jid = jidNormalizedUser(key.remoteJid);
			const msg = await store.loadMessage(jid, key.id);

			return msg?.message || '';
		},
		shouldSyncHistoryMessage: msg => {
			console.log(`\x1b[32mMemuat Chat [${msg.progress}%]\x1b[39m`);
			return !!msg.syncType;
		},
	});

	store.bind(Wilykun.ev);
	await Client({ Wilykun, store });



	// login dengan pairing
	if (!Wilykun.authState.creds.registered) {
		let phoneNumber;
		let isValid = false;

		while (!isValid) {
			phoneNumber = await getPairingNumber();
			isValid = await validatePhoneNumber(phoneNumber);

			if (!isValid) {
				console.log(chalk.red('❌ Nomor tidak valid. Silakan masukkan nomor yang benar.'));
				console.log(chalk.yellow('📋  Cara memasukkan nomor yang valid:'));
				console.log(chalk.yellow('1️⃣  Pastikan nomor hanya berisi angka.'));
				console.log(chalk.yellow('2️⃣  Jangan sertakan karakter selain angka (misalnya, tanda plus atau spasi).'));
				console.log(chalk.yellow('3️⃣  Panjang nomor harus antara 10 hingga 15 digit.'));
				console.log(chalk.yellow('📞  Contoh nomor yang valid: 6281234567890'));
			}
		}

		// Buat folder sesi hanya setelah nomor yang valid dimasukkan
		const sessionDir = path.join(process.cwd(), process.env.SESSION_DIR);
		if (fs.existsSync(sessionDir)) {
			fs.rmSync(sessionDir, { recursive: true, force: true });
			console.log(chalk.green(`📁 Folder sesi dihapus di: ${sessionDir}`));
		}
		fs.mkdirSync(sessionDir, { recursive: true });
		console.log(chalk.green(`📁 Folder sesi dibuat di: ${sessionDir}`));

		try {
			await delay(3000);
			let code = await Wilykun.requestPairingCode(phoneNumber);
			console.log(chalk.green.bold('\n==================== PAIRING CODE ===================='));
			console.log(chalk.cyan.bold(`${code?.match(/.{1,4}/g)?.join('-') || code}`));
			console.log(chalk.green.bold('======================================================\n'));
			console.log(chalk.yellow('🔗 Gunakan kode di atas untuk menghubungkan bot dengan WhatsApp Anda.'));
			console.log(chalk.yellow('📋  Cara memasukkan pairing code di WhatsApp terbaru:'));
			console.log(chalk.yellow('1️⃣  Buka aplikasi WhatsApp di ponsel Anda.'));
			console.log(chalk.yellow('2️⃣  Ketuk ikon tiga titik di pojok kanan atas untuk membuka menu.'));
			console.log(chalk.yellow('3️⃣  Pilih "Perangkat Tertaut" dari menu.'));
			console.log(chalk.yellow('4️⃣  Ketuk "Tautkan Perangkat" dan masukkan pairing code yang ditampilkan di atas.'));
			console.log(chalk.yellow('5️⃣  Ikuti instruksi di layar untuk menyelesaikan proses pairing.'));
		} catch {
			console.error(chalk.red('❌ Gagal mendapatkan kode pairing'));
			process.exit(1);
		}
	}

	// ngewei info, restart or close
	Wilykun.ev.on('connection.update', async update => {
		// Pindahkan penanganan pembaruan koneksi ke sini
		const { connection, lastDisconnect } = update;
		if (connection === 'close') {
			const error = lastDisconnect.error;
			const statusCode = error instanceof Boom ? error.output.statusCode : null;
			const shouldReconnect = statusCode !== DisconnectReason.loggedOut && statusCode !== 401;
			if (statusCode !== 515) {
				console.log('Connection closed due to', error, ', reconnecting', shouldReconnect);
			}
			// Handle WebSocket errors
			if (error?.message?.includes('WebSocket Error')) {
				console.log('WebSocket error detected:', error.message);
				setTimeout(() => startSock(), 5000); // Restart after 5 seconds
				return;
			}
			// Coba untuk memulai ulang socket jika tidak logout atau otentikasi gagal
			if (shouldReconnect) {
				startSock();
			} else {
				console.log('Tidak dapat memulai ulang koneksi karena alasan:', statusCode);
				// Tambahkan log untuk alasan spesifik
				if (statusCode === 401) {
					console.log('Otentikasi gagal. Silakan periksa kredensial Anda.');
					 // Hapus file sesi jika otentikasi gagal
					try {
						fs.rmSync(path.join(process.cwd(), process.env.SESSION_DIR), { recursive: true, force: true });
						console.log('File sesi dihapus. Silakan buat ulang sesi.');
					} catch (err) {
						console.error('Gagal menghapus file sesi:', err);
					}
					// Tambahkan tindakan untuk menangani otentikasi gagal
					// Misalnya, Anda dapat mengirim notifikasi atau menghentikan proses
				} else if (statusCode === DisconnectReason.loggedOut) {
					console.log('Anda telah logout. Silakan login kembali.');
					// Tambahkan tindakan untuk menangani logout
					// Misalnya, Anda dapat menghapus sesi yang ada dan meminta login ulang
				} else if (statusCode === 515) {
					// Restart setelah 5 detik tanpa menampilkan pesan error
					setTimeout(() => startSock(), 5000);
				}
			}
		} else if (connection === 'open') {
			console.log('Connection opened');
			// Kirim pesan saat bot terhubung
			await sendConnectionMessage(Wilykun, null);
		}
	});

	// write session kang
	Wilykun.ev.on('creds.update', saveCreds);

	// contacts
	if (fs.existsSync(pathContacts)) {
		store.contacts = JSON.parse(fs.readFileSync(pathContacts, 'utf-8'));
	} else {
		fs.writeFileSync(pathContacts, JSON.stringify({}));
	}
	// group metadata
	if (fs.existsSync(pathMetadata)) {
		store.groupMetadata = JSON.parse(fs.readFileSync(pathMetadata, 'utf-8'));
	} else {
		fs.writeFileSync(pathMetadata, JSON.stringify({}));
	}
	// nambah perubahan grup ke store
	Wilykun.ev.on('groups.update', updates => {
		for (const update of updates) {
			const id = update.id;
			if (store.groupMetadata[id]) {
				store.groupMetadata[id] = { ...(store.groupMetadata[id] || {}), ...(update || {}) };
			}
		}
	});
	// merubah status member
	Wilykun.ev.on('group-participants.update', async update => {
		handleGroupParticipantsUpdate(store, update); // Gunakan fungsi handleGroupParticipantsUpdate
		if (enableWelcomeMessage) {
			await handleWelcomeMessage(Wilykun, update); // Gunakan fungsi handleWelcomeMessage
		}
		if (enableGoodbyeMessage) {
			await handleGoodbyeMessage(Wilykun, update); // Gunakan fungsi handleGoodbyeMessage
		}
		await handlePrivateWelcomeMessage(Wilykun, update); // Tambahkan panggilan ke handlePrivateWelcomeMessage
		await handlePrivateGoodbyeMessage(Wilykun, update); // Tambahkan panggilan ke handlePrivateGoodbyeMessage
		// Handle promotion to admin
		await handleAntiAdmin(Wilykun, update); // Gunakan fungsi handleAntiAdmin
	});
	// bagian pepmbaca status ono ng kene
	Wilykun.ev.on('messages.upsert', async ({ messages }) => {
		if (!messages[0].message) return;
		let m = await serialize(Wilykun, messages[0], store);
		// Handle auto typing, recording, and auto online/auto read pesan
		await handleAutoTyping(Wilykun, m);
		// nambah semua metadata ke store
		if (store.groupMetadata && Object.keys(store.groupMetadata).length === 0) store.groupMetadata = await Wilykun.groupFetchAllParticipating();
		// untuk membaca pesan status
		if (m.key && !m.key.fromMe && m.key.remoteJid === 'status@broadcast') {
			if (m.type === 'protocolMessage' && m.message.protocolMessage.type === 0) return;
			await Wilykun.readMessages([m.key]);
			await autoReactStatus(Wilykun, m);
			// Hapus bagian yang menambah jumlah status yang dilihat
			// incrementStatusViewCount();
			// incrementNoReactViewCount();
		}
		// Hubungkan fitur anti forwarded newsletter message
		await handleAntiForwardedNewsletter(Wilykun, m);
		// Hubungkan fitur anti wa.me link
		await handleAntiWaMeLink(Wilykun, m, store);
		// Hubungkan fitur anti channel link jika diaktifkan
		if (enableAntiChannelLink) {
			await handleAntiChannelLink(Wilykun, m, store);
		}
		// Hubungkan fitur anti group link jika diaktifkan
		if (enableAntiGroupLink) {
			await handleAntiGroupLink(Wilykun, m, store);
		}
		// Hubungkan fitur hallo message
		await handleHalloMessage(Wilykun, m);
		if (process.env.SELF === 'true' && !m.isOwner) return;
		// kanggo kes
		await (await import(`./message.js?v=${Date.now()}`)).default(Wilykun, store, m);
		// Handle group chat
		await handleGroupChat(Wilykun, store, messages);
		// Handle welcome message for group owner
		await handleOwnerWelcomeMessage(Wilykun, store, messages);
	});
	setInterval(async () => {
		// write contacts and metadata
		if (store.groupMetadata) fs.writeFileSync(pathMetadata, JSON.stringify(store.groupMetadata));
		if (store.contacts) fs.writeFileSync(pathContacts, JSON.stringify(store.contacts));
		// write store
		if (process.env.WRITE_STORE === 'true') store.writeToFile(path.join(process.cwd(), process.env.SESSION_DIR, 'store.json'));

		// Auto restart based on remaining RAM and disk space
		if (process.env.ENABLE_AUTO_RESTART === 'true') {
			const freeMemory = os.freemem() / 1024 / 1024; // Convert to MB
			const freeDiskSpace = await new Promise((resolve, reject) => {
				exec('df -k --output=avail / | tail -n1', (err, stdout) => {
					if (err) {
						reject(err);
					} else {
						resolve(parseInt(stdout.trim()) / 1024); // Convert to MB
					}
				});
			});

			if (freeMemory < parseInt(process.env.RESTART_THRESHOLD_RAM, 10)) {
				console.log(`Low memory detected: ${freeMemory} MB. Restarting...`);
				process.exit(1);
			}

			if (freeDiskSpace < parseInt(process.env.RESTART_THRESHOLD_DISK, 10)) {
				console.log(`Low disk space detected: ${freeDiskSpace} MB. Restarting...`);
				process.exit(1);
			}
		}
	}, 10 * 1000); // tiap 10 detik
	// Handle welcome message for group owner
	let lastOwnerMessageTime = {};

	Wilykun.ev.on('messages.upsert', async ({ messages }) => {
		if (!messages[0].message) return;
		let m = await serialize(Wilykun, messages[0], store);
		// Ensure group metadata is available
		if (!store.groupMetadata[m.key.remoteJid]) {
			store.groupMetadata[m.key.remoteJid] = await Wilykun.groupMetadata(m.key.remoteJid);
		}

		// Call handleOwnerWelcomeMessage function if enabled
		if (enableOwnerWelcomeMessage) {
			await handleOwnerWelcomeMessage(Wilykun, store, messages, ownerWelcomeMessageDelay);
		}

		// Other message handling logic...
		await handleAutoTyping(Wilykun, m);
		if (store.groupMetadata && Object.keys(store.groupMetadata).length === 0) store.groupMetadata = await Wilykun.groupFetchAllParticipating();
		if (m.key && !m.key.fromMe && m.key.remoteJid === 'status@broadcast') {
			if (m.type === 'protocolMessage' && m.message.protocolMessage.type === 0) return;
			await Wilykun.readMessages([m.key]);
			await autoReactStatus(Wilykun, m);
		}
		await handleAntiForwardedNewsletter(Wilykun, m);
		await handleAntiWaMeLink(Wilykun, m, store);
		if (enableAntiChannelLink) {
			await handleAntiChannelLink(Wilykun, m, store);
		}
		if (enableAntiGroupLink) {
			await handleAntiGroupLink(Wilykun, m, store);
		}
		await handleHalloMessage(Wilykun, m);
		if (process.env.SELF === 'true' && !m.isOwner) return;
		await (await import(`./message.js?v=${Date.now()}`)).default(Wilykun, store, m);
		await handleGroupChat(Wilykun, store, messages);
		await handleOwnerWelcomeMessage(Wilykun, store, messages);
	});

	if (autoStickerMode !== 'off') {
		handleImageToSticker(Wilykun, store);
	}

	const autoStickerToImageMode = process.env.AUTO_STICKER_TO_IMAGE_MODE || 'off';
	if (autoStickerToImageMode !== 'off') {
		handleStickerToImage(Wilykun, store);
	}



	if (process.env.HANDLE_ERRORS === 'true') {
		process.on('uncaughtException', function (err) {
			let e = String(err);
			if (e.includes("Socket connection timeout")) return;
			if (e.includes("item-not-found")) return;
			if (e.includes("rate-overlimit")) return;
			if (e.includes("Connection Closed")) return;
			if (e.includes("Timed Out")) return;
			if (e.includes("Value not found")) return;
			if (e.includes("Failed to decrypt message with any known session") || e.includes("Bad MAC")) {
				console.log('--------------------------------------------------');
				console.error('Session error detected:', e);
				console.log('Restarting due to session error...');
				console.log('--------------------------------------------------');
				setTimeout(() => startSock(), 5000); // Restart after 5 seconds
				return;
			}
			console.log('Caught exception: ', err);
		});
		process.on('unhandledRejection', console.error);
	}
};
startSock();