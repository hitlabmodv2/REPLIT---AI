import chalk from 'chalk';
import dotenv from 'dotenv';

dotenv.config();

export async function handlePrivateWelcomeMessage(Wilykun, update) {
    if (process.env.ENABLE_PRIVATE_WELCOME_MESSAGE !== 'true') return;

    const { id, participants, action } = update;

    if (action === 'add') {
        const groupMetadata = await Wilykun.groupMetadata(id);
        const groupName = groupMetadata.subject;
        const groupParticipants = groupMetadata.participants;
        const groupOwner = groupMetadata.owner;
        const groupAdmins = groupParticipants.filter(participant => participant.admin !== null);
        const groupCreation = new Date(groupMetadata.creation * 1000);

        for (const participant of participants) {
            const participantTag = `@${participant.split('@')[0]}`;
            const memberCount = groupParticipants.length;
            const joinTime = new Date();

            // Get Profile Picture User
            let ppuser;
            try {
                ppuser = await Wilykun.profilePictureUrl(participant, 'image');
            } catch {
                ppuser = 'https://files.catbox.moe/nuz3yc.jpeg'; // Default image if not available
            }

            const randomMessages = [
                "Jangan lupa baca deskripsi grup ya! 📜",
                "Semoga harimu menyenangkan! 🌟",
                "Ayo kenalan dengan member lain! 🤝",
                "Selamat bergabung dan semoga betah! 😊",
                "Jangan lupa aktif di grup ya! 💬"
            ];
            const randomMessage = randomMessages[Math.floor(Math.random() * randomMessages.length)];

            const message = `┌─⭓「 W E L C O M E 」\n` +
                            `│ • Telah Bergabung Di Group : ${groupName}\n` +
                            `│ • Nama : ${participantTag}\n` +
                            `│ • Member Ke : ${memberCount}\n` +
                            `│ • Waktu Join Pukul : ${joinTime.toLocaleTimeString()}\n` +
                            `│ • Tanggal/Bulan/Tahun : ${joinTime.toLocaleDateString()}\n` +
                            `│ • Pemilik Group : @${groupOwner.split('@')[0]}\n` +
                            `│ • Total Admin Group : ${groupAdmins.length}\n` +
                            `│ • Group Di Buat Pada : ${groupCreation.toLocaleDateString()}\n` +
                            `└───────────────⭓\n` +
                            `*Selamat datang! Semoga betah ya* 😊\n` +
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
            console.log(chalk.green(`Pesan selamat datang dikirim ke ${participantTag} secara pribadi.`));
        }
    }
}
