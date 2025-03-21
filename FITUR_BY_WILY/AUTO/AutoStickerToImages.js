import { Sticker } from 'wa-sticker-formatter';
import serialize from '../../lib/serialize.js';
import { writeFile } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';
import webp from 'node-webpmux';

const autoStickerToImageMode = process.env.AUTO_STICKER_TO_IMAGE_MODE || 'off';
const processedMessages = new Set();

export const handleStickerToImage = (Wilykun, store) => {
    if (autoStickerToImageMode === 'off') {
        console.log('Auto Sticker to Image feature is turned off.');
        return;
    }

    console.log(`Auto Sticker to Image mode is set to: ${autoStickerToImageMode}`);

    Wilykun.ev.on('messages.upsert', async ({ messages }) => {
        if (!messages[0].message) return;
        let m = await serialize(Wilykun, messages[0], store);

        const isGroup = m.key.remoteJid.endsWith('@g.us');
        if ((autoStickerToImageMode === 'group' && !isGroup) || (autoStickerToImageMode === 'private' && isGroup)) return;

        // Check if the message contains a sticker
        if (m.message.stickerMessage) {
            const messageId = m.key.id;
            if (processedMessages.has(messageId)) return;
            processedMessages.add(messageId);
            try {
                // React to the original sticker message with a loading emoji
                await Wilykun.sendMessage(m.key.remoteJid, { react: { text: '⏳', key: m.key } });

                // Send a loading message
                const loadingMessage = await Wilykun.sendMessage(m.key.remoteJid, { text: '⏳ Mengubah sticker menjadi gambar...' }, { quoted: m });

                // Download the sticker
                const media = await Wilykun.downloadMediaMessage(m);

                // Convert WebP to PNG
                const webpImage = new webp.Image();
                await webpImage.load(media);
                // Convert to PNG with maximum quality settings
                const pngBuffer = await webpImage.save(null, {
                    type: 'png',
                    lossless: true,
                    quality: 100,
                    effort: 6,
                    exact: true,
                    preserveAlpha: true
                });

                // Get image dimensions
                const width = webpImage.width;
                const height = webpImage.height;

                // Save high quality PNG
                const tempFile = join(tmpdir(), `${Date.now()}_hq.png`);
                await writeFile(tempFile, pngBuffer);

                // Send the image with resolution info
                const imageMessage = await Wilykun.sendMessage(m.key.remoteJid, { 
                    image: { url: tempFile },
                    caption: `✨ Berhasil diubah dari sticker\n📏 Resolusi: ${width}x${height}px\n🔍 Kualitas: Ultra HD\n📦 Size: ${(pngBuffer.length / 1024).toFixed(2)} KB`
                }, { quoted: loadingMessage });

                // React to the image message with a checkmark emoji
                await Wilykun.sendMessage(m.key.remoteJid, { react: { text: '✅', key: imageMessage.key } });

                console.log(`Sticker converted to image in ${isGroup ? 'group' : 'private chat'}: ${m.key.remoteJid}`);
            } catch (error) {
                console.error('Failed to convert sticker to image:', error);
                // Send a failure message
                await Wilykun.sendMessage(m.key.remoteJid, { text: '❌ Gagal mengubah sticker menjadi gambar.' }, { quoted: m });
                // React to the original sticker message with an error emoji
                await Wilykun.sendMessage(m.key.remoteJid, { react: { text: '❌', key: m.key } });
            }
        }
    });
};