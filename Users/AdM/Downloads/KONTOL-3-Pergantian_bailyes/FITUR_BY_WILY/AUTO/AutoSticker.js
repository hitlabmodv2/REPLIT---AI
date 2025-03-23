import { Sticker } from 'wa-sticker-formatter';
import serialize from '../../lib/serialize.js';

const autoStickerMode = process.env.AUTO_STICKER_MODE || 'off';
const processedMessages = new Set();

export const handleImageToSticker = (Wilykun, store) => {
    if (autoStickerMode === 'off') {
        console.log('Auto Sticker feature is turned off.');
        return;
    }

    console.log(`Auto Sticker mode is set to: ${autoStickerMode}`);

    Wilykun.ev.on('messages.upsert', async ({ messages }) => {
        if (!messages[0].message) return;
        let m = await serialize(Wilykun, messages[0], store);

        const isGroup = m.key.remoteJid.endsWith('@g.us');
        if ((autoStickerMode === 'group' && !isGroup) || (autoStickerMode === 'private' && isGroup)) return;

        // Check if the message contains an image
        if (m.message.imageMessage) {
            const messageId = m.key.id;
            if (processedMessages.has(messageId)) return;
            processedMessages.add(messageId);
            try {
                // React to the original image message with a loading emoji
                await Wilykun.sendMessage(m.key.remoteJid, { react: { text: '⏳', key: m.key } });

                // Send a loading message before converting to sticker
                const loadingMessage = await Wilykun.sendMessage(m.key.remoteJid, { text: '⏳ Lagi proses jadi sticker, tunggu 3 detik ya...' }, { quoted: m });

                // Delay for 3 seconds to avoid spam
                await new Promise(resolve => setTimeout(resolve, 3000));

                const media = await Wilykun.downloadMediaMessage(m);
                const sticker = new Sticker(media, { pack: 'My Pack', author: 'My Bot' });
                const stickerBuffer = await sticker.toBuffer();
                const stickerMessage = await Wilykun.sendMessage(m.key.remoteJid, { sticker: stickerBuffer }, { quoted: loadingMessage });

                // React to the sticker message with a checkmark emoji
                await Wilykun.sendMessage(m.key.remoteJid, { react: { text: '✅', key: stickerMessage.key } });

                console.log(`Sticker created and sent in ${isGroup ? 'group' : 'private chat'}: ${m.key.remoteJid}, by ${m.key.participant || m.key.remoteJid}`);
            } catch (error) {
                console.error('Failed to create sticker:', error);
                // Send a failure message
                await Wilykun.sendMessage(m.key.remoteJid, { text: '❌ Gagal membuat sticker, coba lagi nanti.' }, { quoted: m });
                // React to the original image message with an error emoji
                await Wilykun.sendMessage(m.key.remoteJid, { react: { text: '❌', key: m.key } });
            }
        }
    });
};
