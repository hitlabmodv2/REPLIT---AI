import { delay, jidNormalizedUser } from 'baileys';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import os from 'os';
import { getWiseWords } from '../NOTIFIKASI/hehe.js'; // Impor fungsi getWiseWords
import { getMusicUrls } from '../MP3_URL/music_url.js'; // Impor fungsi getMusicUrls
import dotenv from 'dotenv'; // Tambahkan ini untuk mengimpor dotenv

dotenv.config(); // Load .env file

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const MAX_RETRIES = 3;
const RETRY_DELAY = 5000; // 5 detik

const sentGoodbyeMessages = new Set(); // Set untuk melacak peserta yang sudah dikirim pesan selamat tinggal
const BLURRED_IMAGE_URL = 'https://files.catbox.moe/nuz3yc.jpeg'; // Default blurred image

function getUptimeBot() {
	const uptime = os.uptime();
	const hours = Math.floor(uptime / 3600);
	const minutes = Math.floor((uptime % 3600) / 60);
	return `${hours} jam ${minutes} menit`;
}

function formatDate() {
	const options = { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' };
	return new Date().toLocaleDateString('id-ID', options).replace(/\./g, '');
}

export const handleGoodbyeMessage = async (Wilykun, update) => {
	const { id, participants, action } = update;
	if (action !== 'remove') return; // Hanya tangani peserta yang keluar

	let retries = 0;
	while (retries < MAX_RETRIES) {
		try {
			const groupMetadata = await Wilykun.groupMetadata(id);
			const groupOwner = groupMetadata.owner;
			const groupCreationDate = new Date(groupMetadata.creation * 1000).toLocaleDateString('id-ID', {
				year: 'numeric',
				month: 'long',
				day: 'numeric'
			});
			const adminCount = groupMetadata.participants.filter(p => p.admin).length;
			const memberCount = groupMetadata.participants.length;

			const wiseWords = await getWiseWords();
			const randomWiseWord = wiseWords[Math.floor(Math.random() * wiseWords.length)];

			for (let participant of participants) {
				if (sentGoodbyeMessages.has(participant)) continue; // Skip if message already sent

				let ppuser = BLURRED_IMAGE_URL; // Use blurred image as default
				try {
					ppuser = await Wilykun.profilePictureUrl(participant, 'image');
				} catch {
					// Keep the default blurred image if fetching fails
				}

				// Mengirim pesan selamat tinggal dengan gambar
				const goodbyeMessage = {
					image: { url: ppuser },
					caption: `Selamat tinggal @${participant.split('@')[0]}! Terima kasih telah menjadi bagian dari grup ini. Semoga sukses di tempat yang baru! 👋
─
*{ Kata-kata dari saya, untuk orang yang meninggalkan group ini }*
${randomWiseWord} 💬
─
*📢 INFORMASI GROUP 📢*
PEMBUAT GROUP : *{ @${groupOwner.split('@')[0]} 👤 }*
GROUP DI BUAT PADA : *{ ${groupCreationDate} 📅 }*
JUMLAH ADMIN SAAT INI : *{ ${adminCount} 👮 }*
JUMLAH ANGGOTA SAAT INI : *{ ${memberCount} 👥 }*`,
					contextInfo: {
						mentionedJid: [participant, groupOwner],
						forwardingScore: 100,
						isForwarded: true,
						forwardedNewsletterMessageInfo: {
							newsletterJid: '120363312297133690@newsletter',
							newsletterName: 'Info Anime Dll 🌟',
							serverMessageId: 143
						}
					}
				};

				try {
					// Send goodbye message to group
					await Wilykun.sendMessage(id, goodbyeMessage);
					console.log(`Pesan selamat tinggal dikirim ke ${participant.split('@')[0]} di grup ${id}`);
				} catch (error) {
					console.error(`Gagal mengirim pesan selamat tinggal ke grup ${id}:`, error);
				}

				sentGoodbyeMessages.add(participant); // Mark participant as message sent

				// Mengambil URL musik dari GitHub
				const musicUrls = await getMusicUrls();
				const randomMusicUrl = musicUrls[Math.floor(Math.random() * musicUrls.length)];
				const audioMessage = {
					audio: { url: randomMusicUrl },
					mimetype: 'audio/mpeg',
					ptt: false,
					contextInfo: {
						mentionedJid: [participant, groupOwner],
						forwardingScore: 100,
						isForwarded: true,
						forwardedNewsletterMessageInfo: {
							newsletterJid: '120363312297133690@newsletter',
							newsletterName: 'Info Anime Dll 🌟',
							serverMessageId: 143
						}
					}
				};

				try {
					// Send audio message to group
					await Wilykun.sendMessage(id, audioMessage);
					console.log(`Pesan audio selamat tinggal dikirim ke ${participant.split('@')[0]} di grup ${id}`);
				} catch (error) {
					console.error(`Gagal mengirim pesan audio selamat tinggal ke grup ${id}:`, error);
				}
			}
			break; // Keluar dari loop jika berhasil mengirim pesan
		} catch (error) {
			if (error.data === 429) {
				console.error('Rate limit exceeded, retrying...', error);
				retries++;
				await delay(RETRY_DELAY);
			} else {
				console.error('Gagal mengirim pesan selamat tinggal:', error);
				break; // Keluar dari loop jika kesalahan bukan karena rate limit
			}
		}
	}
};

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
