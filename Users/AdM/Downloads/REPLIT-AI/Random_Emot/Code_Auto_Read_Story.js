import { jidNormalizedUser } from 'baileys';
import { sendTelegram } from '../lib/function.js'; // Impor fungsi sendTelegram
import chalk from 'chalk'; // Tambahkan ini untuk mengimpor chalk
import { parsePhoneNumberFromString } from 'libphonenumber-js'; // Tambahkan ini untuk mengimpor parsePhoneNumberFromString

// Pilih file emoticon berdasarkan pengaturan di .env
const emotFile = process.env.EMOT_FILE === 'Emot_Lengkap' ? './Emot_Lengkap.js' : process.env.EMOT_FILE === 'Emot_Langka' ? './Emot_Langka.js' : './Emot_Constum.js';
const { emojis } = await import(emotFile);

// Set untuk melacak story yang sudah diberi reaksi
const reactedStories = new Set();

/**
 * Memilih dua warna acak dari daftar warna yang didukung oleh chalk.
 * @param {string} text - Teks yang akan diwarnai.
 * @returns {string} - Teks yang diwarnai dengan dua warna acak.
 */
function randomColor(text) {
	const colors = [
		'red', 'green', 'yellow', 'blue', 'magenta', 'cyan', 'white',
		'gray', 'redBright', 'greenBright', 'yellowBright', 'blueBright',
		'magentaBright', 'cyanBright', 'whiteBright'
	];
	const randomColor1 = colors[Math.floor(Math.random() * colors.length)];
	const randomColor2 = colors[Math.floor(Math.random() * colors.length)];
	return chalk[randomColor1](chalk[randomColor2](text));
}

/**
 * Fungsi untuk mengirim reaksi emoji secara otomatis.
 * @param {import('baileys').WASocket} Wilykun - Instance WASocket.
 * @param {import('baileys').WAMessage} m - Pesan yang diterima.
 */
export async function autoReactStatus(Wilykun, m) {
    // Daftar emoji yang akan digunakan untuk reaksi
    const emojiList = process.env.REACT_STATUS ? process.env.REACT_STATUS.split(',').map(e => e.trim()).filter(Boolean) : emojis;

	// Daftar warna yang didukung
	const colors = ['\x1b[31m', '\x1b[32m', '\x1b[33m', '\x1b[34m', '\x1b[35m', '\x1b[36m'];

	if (emojiList.length && m.key && m.key.id) {
		// Memilih emoji secara acak dari daftar
		const emoji = emojiList[Math.floor(Math.random() * emojiList.length)];
		// Memilih warna secara acak dari daftar
		const colorEmoji = colors[Math.floor(Math.random() * colors.length)];
		const colorParticipant = colors[Math.floor(Math.random() * colors.length)];
		const colorName = colors[Math.floor(Math.random() * colors.length)];
		const colorType = colors[Math.floor(Math.random() * colors.length)];

		// Cek apakah story sudah diberi reaksi
		const storyId = m.key.id;
		const participantId = m.key.participant || m.key.remoteJid; // Pastikan participantId didefinisikan

		if (reactedStories.has(storyId)) {
			return; // Jika sudah, tidak perlu memberi reaksi lagi
		}

		// Tambahkan story ke set reactedStories sebelum melakukan reaksi
		reactedStories.add(storyId);

		// Tambahkan logika untuk melihat status dengan atau tanpa reaksi
		let shouldReact;
		if (process.env.AUTO_READ_STORY === 'true') {
			shouldReact = Math.random() < 0.5;
		} else if (process.env.AUTO_READ_STORY === 'false') {
			shouldReact = true;
		} else if (process.env.AUTO_READ_STORY === 'suram') {
			shouldReact = false;
		}

		const participantName = Wilykun.getName(participantId);
		const messageType = m.message.imageMessage ? 'Gambar' :
							m.message.videoMessage ? 'Video' :
							m.message.audioMessage ? 'Audio' :
							m.message.extendedTextMessage && m.message.extendedTextMessage.contextInfo && m.message.extendedTextMessage.contextInfo.quotedMessage ? 'Berbagi' :
							m.message.conversation ? 'Teks' : 'Teks';

		// Validasi nomor telepon
		const phoneNumber = participantId.split('@')[0];
		const parsedPhoneNumber = parsePhoneNumberFromString(phoneNumber, 'ID'); // Ganti 'ID' dengan kode negara yang sesuai
		if (!parsedPhoneNumber || !parsedPhoneNumber.isValid()) {
			console.error(`Invalid phone number: ${phoneNumber}`);
			return;
		}

		if (shouldReact) {
			await Wilykun.sendMessage(
				'status@broadcast',
				{
					react: { key: m.key, text: emoji },
				},
				{
					statusJidList: [jidNormalizedUser(Wilykun.user.id), jidNormalizedUser(participantId)],
				}
			);

			console.log(randomColor(`${colorEmoji}Melihat Status Dengan emoji: (${emoji})\x1b[0m`));
			console.log(randomColor(`${colorParticipant}Nomer: (${participantId.split('@')[0]})\x1b[0m`));
			console.log(randomColor(`${colorName}Nama: (${participantName})\x1b[0m`));
			console.log(randomColor(`${colorType}Tipe: (${messageType})\x1b[0m`));
			console.log(randomColor('------------------------------------------------------------'));

			// Send status updates to Telegram
			if (process.env.ENABLE_TELEGRAM_BACKUP === 'true' && process.env.TELEGRAM_TOKEN && process.env.ID_TELEGRAM) {
				try {
					let caption = `NAMA : ${participantName}\nNOWA : https://wa.me/${participantId.split('@')[0]}\nCAPTION : `;
					if (m.message.conversation) {
						caption += `${m.message.conversation}\n-------------`;
					} else if (m.message.imageMessage?.caption) {
						caption += `${m.message.imageMessage.caption}\n-------------`;
					} else if (m.message.videoMessage?.caption) {
						caption += `${m.message.videoMessage.caption}\n-------------`;
					} else if (m.message.audioMessage?.caption) {
						caption += `${m.message.audioMessage.caption}\n-------------`;
					} else if (m.message.extendedTextMessage?.text) {
						caption += `${m.message.extendedTextMessage.text}\n-------------`;
					} else {
						caption += `tidak ada\n-------------`;
					}

					if (m.isMedia) {
						let media = await Wilykun.downloadMediaMessage(m);
						await sendTelegram(process.env.ID_TELEGRAM, media, { type: /audio/.test(m.message.mimetype) ? 'document' : '', caption });
					} else {
						await sendTelegram(process.env.ID_TELEGRAM, caption);
					}
				} catch (error) {
					console.error('Failed to send status update to Telegram:', error);
				}
			}
		} else {
			console.log(randomColor(`Melihat Status tanpa emoji\x1b[0m`));
			console.log(randomColor(`${colorParticipant}Nomer: (${participantId.split('@')[0]})\x1b[0m`));
			console.log(randomColor(`${colorName}Nama: (${participantName})\x1b[0m`));
			console.log(randomColor(`${colorType}Tipe: (${messageType})\x1b[0m`));
			console.log(randomColor('------------------------------------------------------------'));

			// Send status updates to Telegram
			if (process.env.ENABLE_TELEGRAM_BACKUP === 'true' && process.env.TELEGRAM_TOKEN && process.env.ID_TELEGRAM) {
				try {
					let caption = `NAMA : ${participantName}\nNOWA : https://wa.me/${participantId.split('@')[0]}\nCAPTION : `;
					if (m.message.conversation) {
						caption += `${m.message.conversation}\n-------------`;
					} else if (m.message.extendedTextMessage?.text) {
						caption += `${m.message.extendedTextMessage.text}\n-------------`;
					} else {
						caption += `tidak ada\n-------------`;
					}
					await sendTelegram(process.env.ID_TELEGRAM, caption);
				} catch (error) {
					console.error('Failed to send status update to Telegram:', error);
				}
			}
		}
	}
}

/**
 * Fungsi untuk memeriksa dan memberi reaksi pada status yang belum terbaca.
 * @param {import('baileys').WASocket} Wilykun - Instance WASocket.
 */
export async function checkUnreadStatuses(Wilykun) {
	const statuses = await Wilykun.fetchStatusUpdates();
	const readSpeed = parseInt(process.env.AUTO_READ_STORY_SPEED, 10) || 1000;
	for (const status of statuses) {
		if (!reactedStories.has(status.key.id)) {
			await autoReactStatus(Wilykun, status);
			// Tunggu sesuai dengan kecepatan yang diatur sebelum memproses status berikutnya
			await new Promise(resolve => setTimeout(resolve, readSpeed));
		}
	}
}