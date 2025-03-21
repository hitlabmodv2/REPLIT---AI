import { Boom } from '@hapi/boom';
import fs from 'fs';
import { exec } from 'child_process';
import axios from 'axios';
import treeKill from '../lib/tree-kill.js';
import { jidNormalizedUser } from 'baileys';
import { runtime } from '../lib/function.js'; // Impor fungsi runtime

// Definisikan variabel yang diperlukan
const botname = 'BotName'; // Ganti dengan nama bot Anda
const versi = '1.0.0'; // Ganti dengan versi bot Anda
global.idSaluran = '120363312297133690@newsletter'; // Ganti dengan ID saluran yang sesuai
global.namaSaluran = 'Info Anime Dll 🌟'; // Ganti dengan nama saluran yang sesuai
global.image = { menu: 'https://files.catbox.moe/wdmwak.jpg' }; // Ganti dengan URL gambar yang sesuai

/**
 * Mengubah status member grup.
 * @param {Object} store - Store untuk menyimpan metadata grup.
 * @param {Object} update - Pembaruan peserta grup.
 */
export function handleGroupParticipantsUpdate(store, { id, participants, action }) {
	const metadata = store.groupMetadata[id];
	if (metadata) {
		switch (action) {
			case 'add':
			case 'revoked_membership_requests':
				metadata.participants.push(...participants.map(id => ({ id: jidNormalizedUser(id), admin: null })));
				break;
			case 'demote':
			case 'promote':
				for (const participant of metadata.participants) {
					let id = jidNormalizedUser(participant.id);
					if (participants.includes(id)) {
						participant.admin = action === 'promote' ? 'admin' : null;
					}
				}
				break;
			case 'remove':
				metadata.participants = metadata.participants.filter(p => !participants.includes(jidNormalizedUser(p.id)));
				break;
		}
	}
}

/**
 * Menangani alasan disconnect.
 * @param {import('baileys').WASocket} Wilykun - Instance WASocket.
 * @param {number} reason - Alasan disconnect.
 * @param {Function} startSock - Fungsi untuk memulai ulang socket.
 */
export async function handleDisconnectReason(Wilykun, reason, startSock) {
	switch (reason) {
		case DisconnectReason.multideviceMismatch:
		case DisconnectReason.loggedOut:
		case 403:
			console.error(new Boom(reason)?.output.statusCode);
			await Wilykun.logout();
			fs.rmSync(`./${process.env.SESSION_NAME}`, { recursive: true, force: true });
			exec('npm run stop:pm2', err => {
				if (err) return treeKill(process.pid);
			});
			break;
		default:
			console.error(new Boom(reason)?.output.statusCode);
			await startSock();
	}
}

/**
 * Menangani pesan "hallo" di grup maupun chat pribadi.
 * @param {import('baileys').WASocket} Wilykun - Instance WASocket.
 * @param {import('baileys').WAMessage} m - Pesan yang diterima.
 */
export async function handleHalloMessage(Wilykun, m) {
	const messageText = m.message?.conversation || m.message?.extendedTextMessage?.text;
	if (messageText && messageText.toLowerCase() === 'hallo') {
		const participant = m.key.participant || m.key.remoteJid;
		const contact = (await Wilykun.onWhatsApp(participant))[0];
		const displayName = contact.notify || contact.vname || contact.name || participant.split('@')[0];
		const profilePictureUrl = await Wilykun.profilePictureUrl(participant, 'image').catch(() => null);

		// Cek pengaturan SELF dan pastikan hanya owner yang dapat memicu respons
		const isOwner = process.env.OWNER.includes(participant.split('@')[0]);
		if (process.env.SELF === 'true' && !isOwner) {
			console.log(`Pesan dari ${displayName} (${participant}) diabaikan karena mode bot diatur ke pribadi`);
			return;
		}

		console.log(`Pesan 'hallo' diterima dari: ${displayName} (${participant})`);
		console.log(`Bot merespon dengan gambar dari: ${profilePictureUrl}`);

		let profilePictureBuffer = null;
		if (profilePictureUrl) {
			const response = await axios.get(profilePictureUrl, { responseType: 'arraybuffer' });
			profilePictureBuffer = Buffer.from(response.data, 'binary');
		}

		await Wilykun.sendMessage(m.key.remoteJid, {
			image: profilePictureBuffer,
			caption: `👋 *Hallo @${displayName}!* \n\n✨ Apa kabar? Semoga harimu menyenangkan! 😊`,
			headerType: 1,
			viewOnce: true,
			document: fs.readFileSync("./package.json"),
			fileName: 'sunshine.jpeg',
			mimetype: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
			fileLength: 9999999,
			contextInfo: {
				isForwarded: true,
				mentionedJid: [m.sender],
				forwardedNewsletterMessageInfo: {
					newsletterJid: global.idSaluran,
					newsletterName: global.namaSaluran
				},
				externalAdReply: {
					title: `${botname} - ${versi}`,
					body: `📍 Runtime : ${runtime(process.uptime())}`,
					thumbnail: profilePictureBuffer,
					sourceUrl: 'https://whatsapp.com/channel/0029VaiyhS37IUYSuDJoJj1L',
					mediaType: 1,
					renderLargerThumbnail: true,
				},
			},
		}, { quoted: m });
	}
}
