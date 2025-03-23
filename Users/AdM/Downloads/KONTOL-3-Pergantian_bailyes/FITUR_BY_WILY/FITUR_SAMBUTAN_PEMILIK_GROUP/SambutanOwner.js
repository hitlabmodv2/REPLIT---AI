import serialize from '../../lib/serialize.js';
import fs from 'fs';
import path from 'path';

let lastOwnerMessageTime = {};
let groupResponseQueue = {};

const lastOwnerMessageTimeFile = path.join(process.cwd(), 'lastOwnerMessageTime.json');

// Load lastOwnerMessageTime from file
if (fs.existsSync(lastOwnerMessageTimeFile)) {
	try {
		const data = fs.readFileSync(lastOwnerMessageTimeFile, 'utf-8');
		lastOwnerMessageTime = data ? JSON.parse(data) : {};
	} catch (error) {
		console.error('Failed to load lastOwnerMessageTime:', error);
		lastOwnerMessageTime = {};
	}
}

// Save lastOwnerMessageTime to file
function saveLastOwnerMessageTime() {
	fs.writeFileSync(lastOwnerMessageTimeFile, JSON.stringify(lastOwnerMessageTime, null, 2));
}

export async function handleOwnerWelcomeMessage(Wilykun, store, messages, delay) {
	if (!messages[0].message) return;
	let m = await serialize(Wilykun, messages[0], store);

	// Ensure group metadata is available
	if (!store.groupMetadata[m.key.remoteJid]) {
		store.groupMetadata[m.key.remoteJid] = await Wilykun.groupMetadata(m.key.remoteJid);
	}

	// Check if the message is from the group owner
	const groupMetadata = store.groupMetadata[m.key.remoteJid];
	const groupOwner = groupMetadata?.owner;
	const now = Date.now();

	if (groupOwner && m.key.participant === groupOwner) {
		if (!lastOwnerMessageTime[m.key.remoteJid] || (now - lastOwnerMessageTime[m.key.remoteJid].timestamp) > delay) {
			if (!groupResponseQueue[m.key.remoteJid]) {
				groupResponseQueue[m.key.remoteJid] = Promise.resolve();
			}

			groupResponseQueue[m.key.remoteJid] = groupResponseQueue[m.key.remoteJid].then(async () => {
				console.log(`Owner detected in group: ${m.key.remoteJid} (Group ID: ${groupMetadata.id})`);
				await Wilykun.sendMessage(m.key.remoteJid, { 
					text: `Wah ada owner nih! 👑 @${groupOwner.split('@')[0]}`, 
					mentions: [groupOwner] 
				}, { quoted: m });
				lastOwnerMessageTime[m.key.remoteJid] = {
					timestamp: now,
					groupName: groupMetadata.subject,
					owner: groupOwner
				};
				saveLastOwnerMessageTime(); // Save the updated time to file
			});
		}
	}
}
