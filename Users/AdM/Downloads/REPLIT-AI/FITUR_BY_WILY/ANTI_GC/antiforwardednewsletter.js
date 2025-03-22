import dotenv from 'dotenv';
import { jidNormalizedUser } from 'baileys';

dotenv.config(); // Load .env file

/**
 * Handle forwarded newsletter messages.
 * @param {import('baileys').WASocket} Wilykun - Instance WASocket.
 * @param {import('baileys').proto.WebMessageInfo} m - Message object.
 */
export async function handleAntiForwardedNewsletter(Wilykun, m) {
	if (!m.message || !m.message.extendedTextMessage) return;

	const { extendedTextMessage } = m.message;
	const { contextInfo } = extendedTextMessage;

	if (contextInfo && contextInfo.forwardingScore && contextInfo.isForwarded) {
		const sender = m.key.remoteJid;
		const contact = Wilykun.contacts ? Wilykun.contacts[sender] : null;

		if (contact) {
			const name = contact.notify || contact.vname || contact.name || sender.split('@')[0];
			const warningMessage = `⚠️ Pesan yang diteruskan terdeteksi dari ${name}. Mohon tidak meneruskan pesan dari sumber yang tidak dikenal.`;

			await Wilykun.sendMessage(m.key.remoteJid, { text: warningMessage });
			console.log(`Peringatan dikirim ke ${name} (${sender}) karena meneruskan pesan.`);
		} else {
			console.warn(`Kontak tidak ditemukan untuk ${sender}`);
		}
	}
}
