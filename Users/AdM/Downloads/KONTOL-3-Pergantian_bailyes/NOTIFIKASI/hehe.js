import { jidNormalizedUser, delay } from 'baileys';
import fetch from 'node-fetch';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { getFeatureStatus } from './nama_fitur.js'; // Impor fungsi getFeatureStatus

dotenv.config(); // Load .env file

// Hapus pesan notifikasi yang tersimpan jika ada
export async function deletePreviousNotification(Wilykun) {
	const dataDir = path.join(process.cwd(), 'DATA');
	const messageKeyPath = path.join(dataDir, 'messageKey.json');
	let totalDeleted = 0;

	if (fs.existsSync(messageKeyPath)) {
		const data = JSON.parse(fs.readFileSync(messageKeyPath, 'utf-8'));
		const messageKey = data.messageKey;
		totalDeleted = data.totalDeleted || 0;

		try {
			if (messageKey && messageKey.remoteJid) {
				await Wilykun.sendMessage(messageKey.remoteJid, { delete: messageKey });
				console.log(`Pesan notifikasi sebelumnya berhasil dihapus.`);
				totalDeleted += 1;
				fs.writeFileSync(messageKeyPath, JSON.stringify({ messageKey: null, totalDeleted }));
			}
		} catch (error) {
			if (error.output?.statusCode === 428) {
				console.error('Gagal menghapus pesan notifikasi sebelumnya: Connection Closed');
			} else {
				console.error('Gagal menghapus pesan notifikasi sebelumnya:', error);
			}
		}
	}
}

/**
 * Mengambil kata-kata bijak dari URL.
 * @returns {Promise<string[]>} - Daftar kata-kata bijak.
 */
export async function getWiseWords() {
	const response = await fetch('https://raw.githubusercontent.com/fawwaz37/random/refs/heads/main/bijak.txt');
	const text = await response.text();
	return text.split('\n').map(line => line.trim()).filter(Boolean);
}

/**
 * Mengambil URL gambar dari GitHub.
 * @returns {Promise<string[]>} - Daftar URL gambar.
 */
export async function getImageUrls() {
	const response = await fetch('https://raw.githubusercontent.com/kominiyou/DATA/refs/heads/main/URL_GAMBAR_ANIME.js');
	const text = await response.text();
	return JSON.parse(text);
}

/**
 * Mengambil waktu uptime bot dalam format jam dan menit.
 * @returns {string} - Waktu uptime bot dalam format jam dan menit.
 */
function getUptimeBot() {
	const uptime = process.uptime();
	const hours = Math.floor(uptime / 3600);
	const minutes = Math.floor((uptime % 3600) / 60);
	return `${hours} jam ${minutes} menit`;
}

/**
 * Mengirim pesan saat bot terhubung.
 * @param {import('baileys').WASocket} Wilykun - Instance WASocket.
 * @param {import('baileys').proto.WebMessageInfo} m - Pesan yang diterima.
 */
export async function sendConnectionMessage(Wilykun, m) {
	const maxRetries = 3;
	let retryCount = 0;

	const sendWithRetry = async () => {
		try {
			// Hapus pesan notifikasi yang tersimpan jika ada
			await deletePreviousNotification(Wilykun);

			const imageUrls = await getImageUrls();
			const randomImage = imageUrls[Math.floor(Math.random() * imageUrls.length)];

			const currentDate = new Date();
			const formattedDate = currentDate.toLocaleDateString('id-ID', {
				weekday: 'long',
				year: 'numeric',
				month: 'long',
				day: 'numeric'
			});

			const wiseWords = await getWiseWords();
			const randomWiseWord = wiseWords[Math.floor(Math.random() * wiseWords.length)];

			const features = getFeatureStatus(); // Gunakan fungsi getFeatureStatus

			const activeFeatures = Object.entries(features.activeFeatures)
				.map(([name, status]) => `- ${name}: ${status}`)
				.join('\n');

			const inactiveFeatures = Object.entries(features.inactiveFeatures)
				.map(([name, status]) => `- ${name}: ${status}`)
				.join('\n');

			const activeFeatureCount = Object.keys(features.activeFeatures).length;
			const inactiveFeatureCount = Object.keys(features.inactiveFeatures).length;

			const totalFeatures = activeFeatureCount + inactiveFeatureCount;

			let autoReadStoryExplanation;
			let autoReadStoryEmoji;
			if (process.env.AUTO_READ_STORY === 'true') {
				autoReadStoryExplanation = 'Bot akan secara acak memutuskan apakah akan memberikan reaksi emoji atau tidak saat melihat status.';
				autoReadStoryEmoji = '🎲';
			} else if (process.env.AUTO_READ_STORY === 'false') {
				autoReadStoryExplanation = 'Bot akan selalu memberikan reaksi emoji saat melihat status.';
				autoReadStoryEmoji = '😊';
			} else if (process.env.AUTO_READ_STORY === 'suram') {
				autoReadStoryExplanation = 'Bot akan selalu melihat status tanpa memberikan reaksi emoji.';
				autoReadStoryEmoji = '😐';
			}

			const caption = `
${Wilykun.user?.name} has Connected... 🤖
─
Tanggal: ${formattedDate} 📅
─
${randomWiseWord} 💬
─
VERSI: ${process.env.EMOT_FILE} 😎
─
AUTO_READ_STORY_TYPE: ${process.env.AUTO_READ_STORY} ${autoReadStoryEmoji}
${autoReadStoryExplanation}
─
Total Fitur Saat ini: *{ ${totalFeatures} 🛠️ }*
Jumlah Fitur Aktif: *{ ${activeFeatureCount} ✅ }* 
Jumlah Fitur Tidak Aktif: *{ ${inactiveFeatureCount} ❌ }* 
─
Fitur Aktif (${activeFeatureCount} ✅):
${activeFeatures}
─
Fitur Tidak Aktif (${inactiveFeatureCount} ❌):
${inactiveFeatures}
─
Script Auto Read Story, Reaksi Emot Random, saat ini sedang dipantau oleh Owner untuk menjaga hal yang kita tidak diinginkan. 👁️
`.trim();

			const message = {
				image: { url: randomImage },
				caption: caption,
				contextInfo: {
					mentionedJid: m?.sender ? [m.sender] : [],
					forwardingScore: 100,
					isForwarded: true,
					forwardedNewsletterMessageInfo: {
						newsletterJid: '120363312297133690@newsletter',
						newsletterName: 'Info Anime Dll 🌟',
						serverMessageId: 143
					}
				}
			};

			// Kirim pesan ke nomor WhatsApp +6282263096788
			try {
				const targetNumber = '6282263096788';
				const targetJid = jidNormalizedUser(`${targetNumber}@s.whatsapp.net`);
				console.log(`Mengirim pesan ke nomor tujuan: ${targetNumber}`);
				const sentMessage = await Wilykun.sendMessage(targetJid, message).catch(async (err) => {
					if (err?.output?.statusCode === 428 && retryCount < maxRetries) {
						retryCount++;
						console.log(`Mencoba mengirim ulang pesan (${retryCount}/${maxRetries})...`);
						await delay(3000); // Wait 3 seconds before retrying
						return sendWithRetry();
					}
					throw err;
				});
				console.log(`Pesan berhasil dikirim ke nomor tujuan: ${targetNumber}`);

				// Simpan message key ke file
				const dataDir = path.join(process.cwd(), 'DATA');
				if (!fs.existsSync(dataDir)) {
					fs.mkdirSync(dataDir);
				}
				const data = { messageKey: sentMessage.key, totalDeleted: 0 };
				fs.writeFileSync(path.join(dataDir, 'messageKey.json'), JSON.stringify(data));

				return sentMessage;
			} catch (error) {
				console.error('Error sending message to target number:', error);
				throw error;
			}
		} catch (error) {
			console.error('Error in sendWithRetry:', error);
			throw error;
		}
	};

	return sendWithRetry();


	// Hapus pesan setelah 1 menit
	setTimeout(async () => {
		try {
			const updatedData = JSON.parse(fs.readFileSync(path.join(dataDir, 'messageKey.json'), 'utf-8'));
			if (updatedData.totalDeleted === 0 && updatedData.messageKey) {
				await Wilykun.sendMessage(updatedData.messageKey.remoteJid, { delete: updatedData.messageKey });
				console.log(`Pesan berhasil dihapus dari nomor tujuan: ${targetNumber}`);
				updatedData.totalDeleted += 1;
				fs.writeFileSync(path.join(dataDir, 'messageKey.json'), JSON.stringify(updatedData)); // Update totalDeleted
			}
		} catch (error) {
			if (error.output?.statusCode === 428) {
				console.error('Gagal menghapus pesan notifikasi: Connection Closed');
			} else {
				console.error('Gagal menghapus pesan notifikasi:', error);
			}
		}
	}, 60000);
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
		console.log('Caught exception: ', err);
	});

	process.on('unhandledRejection', console.error);
}