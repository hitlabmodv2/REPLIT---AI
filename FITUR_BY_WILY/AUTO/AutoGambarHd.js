
import serialize from '../../lib/serialize.js';
import { writeFile } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';
import sharp from 'sharp';

const autoImageHdMode = process.env.AUTO_IMAGE_HD_MODE || 'off';
const processedMessages = new Set();

export const handleImageToHD = (Wilykun, store) => {
    if (autoImageHdMode === 'off') {
        console.log('Auto HD Image feature is turned off.');
        return;
    }

    console.log(`Auto HD Image mode is set to: ${autoImageHdMode}`);

    Wilykun.ev.on('messages.upsert', async ({ messages }) => {
        if (!messages[0].message) return;
        let m = await serialize(Wilykun, messages[0], store);

        const isGroup = m.key.remoteJid.endsWith('@g.us');
        if ((autoImageHdMode === 'group' && !isGroup) || (autoImageHdMode === 'private' && isGroup)) return;

        if (m.message.imageMessage) {
            const messageId = m.key.id;
            if (processedMessages.has(messageId)) return;
            processedMessages.add(messageId);

            try {
                await Wilykun.sendMessage(m.key.remoteJid, { react: { text: '⏳', key: m.key } });
                const loadingMessage = await Wilykun.sendMessage(m.key.remoteJid, { text: '⏳ Sedang mengubah gambar menjadi HD...' }, { quoted: m });

                const media = await Wilykun.downloadMediaMessage(m);
                const enhancedImage = await sharp(media)
                    .resize(2560, 1440, {
                        fit: 'inside',
                        withoutEnlargement: true,
                        kernel: 'lanczos3'
                    })
                    .sharpen({
                        sigma: 1.2,
                        m1: 2.0,
                        m2: 0.5
                    })
                    .modulate({
                        brightness: 1.05,
                        saturation: 1.1,
                        hue: 1
                    })
                    .jpeg({ 
                        quality: 95,
                        chromaSubsampling: '4:4:4'
                    });

                const imageBuffer = await enhancedImage.toBuffer();
                const tempFile = join(tmpdir(), `${Date.now()}_hd.jpg`);
                await writeFile(tempFile, imageBuffer);

                const metadata = await sharp(imageBuffer).metadata();
                const fileSizeKB = (imageBuffer.length / 1024).toFixed(2);

                const imageMessage = await Wilykun.sendMessage(m.key.remoteJid, { 
                    image: { url: tempFile },
                    caption: `✨ Gambar telah dioptimalkan\n📏 Resolusi: ${metadata.width}x${metadata.height}px\n🔍 Kualitas: Ultra HD\n📦 Size: ${fileSizeKB} KB`
                }, { quoted: loadingMessage });

                await Wilykun.sendMessage(m.key.remoteJid, { react: { text: '✅', key: imageMessage.key } });
                console.log(`Image enhanced to HD in ${isGroup ? 'group' : 'private chat'}: ${m.key.remoteJid}`);
            } catch (error) {
                console.error('Failed to enhance image:', error);
                await Wilykun.sendMessage(m.key.remoteJid, { text: '❌ Gagal mengubah gambar menjadi HD.' }, { quoted: m });
                await Wilykun.sendMessage(m.key.remoteJid, { react: { text: '❌', key: m.key } });
            }
        }
    });
};
