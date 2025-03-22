import serialize from '../lib/serialize.js';

const respondedMessages = new Set(); // Set untuk melacak pesan yang sudah direspon

export async function handleGroupChat(Wilykun, store, messages) {
    if (!messages[0].message) return;
    let m = await serialize(Wilykun, messages[0], store);

    if (m.key.fromMe || !m.isGroup) return;

    const groupMetadata = store.groupMetadata[m.key.remoteJid];
    const isAdmin = groupMetadata.participants.some(participant => participant.id === m.sender && participant.admin);
    const botIsAdmin = groupMetadata.participants.some(participant => participant.id === Wilykun.user.id && participant.admin);

    const messageText = m.message.conversation || m.message.extendedTextMessage?.text;

    if (messageText && !respondedMessages.has(m.key.id)) {
        respondedMessages.add(m.key.id); // Tambahkan pesan ke Set setelah merespon

        if (isAdmin) {
            let responseText;
            if (messageText.toLowerCase() === 'buka gc') {
                await Wilykun.groupSettingUpdate(m.key.remoteJid, 'not_announcement');
                responseText = `Group chat telah dibuka. Terima kasih @${m.sender.split('@')[0]}! 🎉\n\nSekarang semua anggota dapat mengirim pesan.`;
            } else if (messageText.toLowerCase() === 'tutup gc') {
                await Wilykun.groupSettingUpdate(m.key.remoteJid, 'announcement');
                responseText = `Group chat telah ditutup. Terima kasih @${m.sender.split('@')[0]}! 🔒\n\nHanya admin yang dapat mengirim pesan sekarang.`;
            }

            if (responseText) {
                // Get Profile Picture User
                let ppuser;
                try {
                    ppuser = await Wilykun.profilePictureUrl(m.sender, 'image');
                } catch {
                    ppuser = 'https://files.catbox.moe/nuz3yc.jpeg'; // Gambar default jika tidak ada
                }

                await Wilykun.sendMessage(m.key.remoteJid, {
                    image: { url: ppuser },
                    caption: `────────────────────\n👋 Halo, ${responseText}\n────────────────────`,
                    contextInfo: {
                        mentionedJid: [m.sender],
                        forwardingScore: 100,
                        isForwarded: true,
                        forwardedNewsletterMessageInfo: {
                            newsletterJid: '120363312297133690@newsletter',
                            newsletterName: 'Info Anime Dll 🌟',
                            serverMessageId: 143
                        }
                    }
                }, { quoted: m });
                console.log(responseText);
            }
        } else {
            if (messageText.toLowerCase() === 'buka gc' || messageText.toLowerCase() === 'tutup gc') {
                await Wilykun.sendMessage(m.key.remoteJid, { text: `Maaf @${m.sender.split('@')[0]}, hanya admin yang bisa menggunakan perintah ini.`, mentions: [m.sender] }, { quoted: m });
                console.log(`Non-admin ${m.sender} mencoba menggunakan perintah ${messageText}`);
            }
        }
    }
}
