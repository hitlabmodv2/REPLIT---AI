import chalk from 'chalk';
import dotenv from 'dotenv';

dotenv.config();

export async function handlePrivateGoodbyeMessage(Wilykun, update) {
    if (process.env.ENABLE_PRIVATE_GOODBYE_MESSAGE !== 'true') return;

    const { id, participants, action } = update;

    if (action === 'remove') {
        const groupMetadata = await Wilykun.groupMetadata(id);
        const groupName = groupMetadata.subject;
        const groupParticipants = groupMetadata.participants;
        const groupOwner = groupMetadata.owner;
        const groupAdmins = groupParticipants.filter(participant => participant.admin !== null);

        for (const participant of participants) {
            const participantTag = `@${participant.split('@')[0]}`;
            const memberCount = groupParticipants.length;
            const leaveTime = new Date().toLocaleTimeString('id-ID', { timeZone: 'Asia/Jakarta' });

            // Get Profile Picture User
            let ppuser;
            try {
                ppuser = await Wilykun.profilePictureUrl(participant, 'image');
            } catch {
                ppuser = 'https://files.catbox.moe/nuz3yc.jpeg'; // Default image if not available
            }

            const randomMessages = [
                "Semoga sukses di tempat yang baru! 🌟",
                "Jangan lupa mampir lagi ya! 😊",
                "Terima kasih sudah menjadi bagian dari grup ini! 🙏",
                "Selamat tinggal dan semoga sukses! 👋",
                "Kami akan merindukanmu! 😢"
            ];
            const randomMessage = randomMessages[Math.floor(Math.random() * randomMessages.length)];

            const message = `┌─⭓「 G O O D B Y E 」\n` +
                            `│ • Telah Keluar Dari Group : ${groupName}\n` +
                            `│ • Nama : ${participantTag}\n` +
                            `│ • Member Tersisa : ${memberCount}\n` +
                            `│ • Waktu Keluar Pukul : ${leaveTime}\n` +
                            `│ • Pemilik Group : @${groupOwner.split('@')[0]}\n` +
                            `│ • Total Admin Group : ${groupAdmins.length}\n` +
                            `└───────────────⭓\n` +
                            `*Selamat tinggal! Semoga sukses di tempat yang baru* 😊\n` +
                            `${randomMessage}`;

            await Wilykun.sendMessage(participant, {
                image: { url: ppuser },
                caption: message,
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
            });
            console.log(chalk.green(`Pesan selamat tinggal dikirim ke ${participantTag} secara pribadi.`));
        }
    }
}
