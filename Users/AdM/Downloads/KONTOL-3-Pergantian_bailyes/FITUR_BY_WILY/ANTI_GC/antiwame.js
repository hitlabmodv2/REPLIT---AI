import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

dotenv.config(); // Load .env file

const warningsFilePath = path.join(process.cwd(), 'DATA/pelanggaran.txt');
let warnings = {};

// Muat jumlah peringatan dari file saat inisialisasi
if (fs.existsSync(warningsFilePath)) {
    warnings = JSON.parse(fs.readFileSync(warningsFilePath, 'utf-8'));
}

/**
 * Menyimpan jumlah peringatan ke file.
 */
function saveWarnings() {
    fs.writeFileSync(warningsFilePath, JSON.stringify(warnings, null, 2));
}

const warningMessages = [
	"Ini adalah peringatan pertama Anda. Jangan bagikan link wa.me lagi! ⚠️ (anti wa.me)",
	"Ini adalah peringatan kedua Anda. Tolong patuhi aturan grup! 🚫 (anti wa.me)",
	"Ini adalah peringatan ketiga Anda. Jangan ulangi lagi! ❗ (anti wa.me)",
	"Ini adalah peringatan keempat Anda. Hentikan membagikan link wa.me! ⛔ (anti wa.me)",
	"Ini adalah peringatan kelima Anda. Anda bisa dikeluarkan dari grup! ⚠️ (anti wa.me)",
	"Ini adalah peringatan keenam Anda. Jangan bagikan link wa.me lagi! 🚫 (anti wa.me)",
	"Ini adalah peringatan ketujuh Anda. Tolong patuhi aturan grup! ❗ (anti wa.me)",
	"Ini adalah peringatan kedelapan Anda. Jangan ulangi lagi! ⛔ (anti wa.me)",
	"Ini adalah peringatan kesembilan Anda. Ini peringatan terakhir! ⚠️ (anti wa.me)",
	"Anda telah mencapai batas peringatan 10 kali. Anda akan dikeluarkan dari grup. 🚫 (anti wa.me)"
];

const warningEmojis = [
	"⚠️", "🚫", "❗", "⛔", "⚠️", "🚫", "❗", "⛔", "⚠️", "🚫"
];

/**
 * Mengambil daftar pelanggar dengan jumlah pelanggaran mereka.
 * @param {string} groupId - ID grup.
 * @returns {string} - Daftar pelanggar dengan jumlah pelanggaran mereka.
 */
function getTopOffenders(groupId) {
	const groupWarnings = warnings[groupId] || {};
	const sortedWarnings = Object.entries(groupWarnings)
		.sort(([, a], [, b]) => b - a)
		.slice(0, 10);

	return sortedWarnings.map(([participant, count], index) => {
		const displayName = participant.split('@')[0];
		const emoji = count === 0 ? "✅" : warningEmojis[Math.min(count - 1, warningEmojis.length - 1)];
		return `${index + 1}. @${displayName} (${count} pelanggaran) ${emoji}`;
	}).join('\n');
}

async function handleViolation(Wilykun, groupId, user) {
    const autoKickEnabled = process.env.AUTO_KICK_ENABLED === 'true';

    if (autoKickEnabled) {
        // Logika auto kick
        const groupMetadata = await Wilykun.groupMetadata(groupId);
        const groupName = groupMetadata.subject;

        await Wilykun.groupParticipantsUpdate(groupId, [user], 'remove');
        console.log(`User ${user} telah dikeluarkan dari grup ${groupName} karena melanggar aturan.`);
    } else {
        // Tandai pengguna dan atur ulang jumlah pelanggaran
        resetViolationCount(groupId, user);
        await tagUser(Wilykun, groupId, user);
        console.log(`Waduh, fitur auto kick dimatikan. Kamu aman dan tidak di-kick. Pelanggaran kamu dihapus jadi 0.`);
    }
}

async function tagUser(Wilykun, groupId, user) {
    const groupMetadata = await Wilykun.groupMetadata(groupId);
    const groupName = groupMetadata.subject;
    const offenderCount = Object.keys(warnings[groupId]).length;
    const topOffenders = getTopOffenders(groupId);

    // Get Profile Picture User
    let ppuser;
    try {
        ppuser = await Wilykun.profilePictureUrl(user, 'image');
    } catch {
        ppuser = 'https://files.catbox.moe/nuz3yc.jpeg'; // Gambar default jika tidak ada
    }

    await Wilykun.sendMessage(groupId, {
        image: { url: ppuser },
        caption: `────────────────────\n👋 Halo @${user.split('@')[0]}, ⚠️ Waduh, fitur auto kick dimatikan. Kamu aman dan tidak di-kick. Pelanggaran kamu dihapus jadi 0.\n────────────────────\n*Nama Grup*: ${groupName}\n*Daftar Pelanggar: (${offenderCount} orang)*\n${topOffenders}\n────────────────────`,
        contextInfo: {
            mentionedJid: [user, ...Object.keys(warnings[groupId])],
            forwardingScore: 100,
            isForwarded: true,
            forwardedNewsletterMessageInfo: {
                newsletterJid: '120363312297133690@newsletter',
                newsletterName: 'Info Anime Dll 🌟',
                serverMessageId: 143
            }
        }
    });
}

function resetViolationCount(groupId, user) {
    if (warnings[groupId] && warnings[groupId][user]) {
        warnings[groupId][user] = 0;
        saveWarnings();
    }
}

const processedMessages = new Set();

export async function handleAntiWaMeLink(Wilykun, m, store) {
	if (process.env.ENABLE_ANTI_WAME_LINK === 'true' && m.key.remoteJid.endsWith('@g.us') && (m.message.conversation || m.message.extendedTextMessage?.text) && !m.key.fromMe) {
		const messageText = m.message.conversation || m.message.extendedTextMessage?.text;
		const waMeRegex = /wa\.me/i;
		if (waMeRegex.test(messageText)) {
			const messageId = m.key.id;
			if (processedMessages.has(messageId)) return; // Skip if already processed
			processedMessages.add(messageId);

			const participant = m.key.participant || m.key.remoteJid;
			const contact = store.contacts[participant] || {};
			const displayName = contact.notify || contact.vname || contact.name || participant.split('@')[0];
			const groupMetadata = await Wilykun.groupMetadata(m.key.remoteJid);
			const groupName = groupMetadata.subject;
			const groupOwner = groupMetadata.owner;
			const admins = groupMetadata.participants.filter(p => p.admin).map(p => p.id);

			// Cek apakah pengirim adalah admin atau bot
			if (admins.includes(participant) || participant === groupOwner) {
				console.log(`Message with wa.me link from admin or bot ${displayName} in group: ${m.key.remoteJid} not deleted`);
				return;
			}

			// Tambahkan atau perbarui jumlah peringatan
			if (!warnings[m.key.remoteJid]) {
				warnings[m.key.remoteJid] = {};
			}
			if (!warnings[m.key.remoteJid][participant]) {
				warnings[m.key.remoteJid][participant] = 0;
			}
			warnings[m.key.remoteJid][participant] += 1;
			saveWarnings();

			// Get Profile Picture User
			let ppuser;
			try {
				ppuser = await Wilykun.profilePictureUrl(participant, 'image');
			} catch {
				ppuser = 'https://files.catbox.moe/nuz3yc.jpeg'; // Gambar default jika tidak ada
			}

			await Wilykun.readMessages([m.key]); // Tandai pesan sebagai telah dibaca

			const warningCount = warnings[m.key.remoteJid][participant];
			const warningMessage = warningMessages[warningCount - 1];
			const topOffenders = getTopOffenders(m.key.remoteJid);
			const offenderCount = Object.keys(warnings[m.key.remoteJid]).length;
			const autoKickEnabled = process.env.AUTO_KICK_ENABLED === 'true' ? 'Aktif ✅' : 'Tidak Aktif ❌';

			if (warningCount < 10) {
				await Wilykun.sendMessage(m.key.remoteJid, { 
					image: { url: ppuser },
					caption: `────────────────────\n👋 Halo @${participant.split('@')[0]}, ${warningMessage}\n────────────────────\n*Fitur Auto Kick*: ${autoKickEnabled}\n────────────────────\n*Nama Grup*: ${groupMetadata.subject} 🤗🤗🤗\n*Daftar Pelanggar: (${offenderCount} orang)*\n${topOffenders}\n────────────────────`,
					contextInfo: {
						mentionedJid: [participant, groupOwner, ...Object.keys(warnings[m.key.remoteJid])],
						forwardingScore: 100,
						isForwarded: true,
						forwardedNewsletterMessageInfo: {
							newsletterJid: '120363312297133690@newsletter',
							newsletterName: 'Info Anime Dll 🌟',
							serverMessageId: 143
						}
					}
				}, { quoted: m });
			} else {
				resetViolationCount(m.key.remoteJid, participant);
				await Wilykun.sendMessage(m.key.remoteJid, { 
					image: { url: ppuser },
					caption: `────────────────────\n👋 Halo @${participant.split('@')[0]}, ${warningMessage}\n────────────────────\n*Fitur Auto Kick*: ${autoKickEnabled}\n────────────────────\n*Nama Group*: ${groupMetadata.subject} 🤗🤗🤗\n*Daftar Pelanggar (${offenderCount} Orang):*\n${topOffenders}\n────────────────────`,
					contextInfo: {
						mentionedJid: [participant, groupOwner, ...Object.keys(warnings[m.key.remoteJid])],
						forwardingScore: 100,
						isForwarded: true,
						forwardedNewsletterMessageInfo: {
							newsletterJid: '120363312297133690@newsletter',
							newsletterName: 'Info Anime Dll 🌟',
							serverMessageId: 143
						}
					}
				}, { quoted: m });
				handleViolation(Wilykun, m.key.remoteJid, participant);
			}

			await Wilykun.sendMessage(m.key.remoteJid, { delete: m.key });
			console.log(`Deleted message with wa.me link from ${displayName} in group: ${m.key.remoteJid}`);
		}
	}
}