import { jidNormalizedUser, delay } from 'baileys';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import os from 'os';
import dotenv from 'dotenv';

dotenv.config(); // Load .env file

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const MAX_RETRIES = 3; // Increase the number of retries
const RETRY_DELAY = 5000; // Increase the delay to 5 seconds

const sentUnadminMessages = new Set(); // Set untuk melacak peserta yang sudah dikirim pesan unadmin

/**
 * Handle promotion to admin by non-owner admins.
 * @param {import('baileys').WASocket} Wilykun - Instance WASocket.
 * @param {import('baileys').GroupParticipantsUpdate} update - Group participants update.
 */
export async function handleAntiAdmin(Wilykun, update) {
	const { id, participants, action } = update;
	if (action !== 'promote' && action !== 'demote') return; // Only handle promote and demote actions

	let retries = 0;
	while (retries < MAX_RETRIES) {
		try {
			const groupMetadata = await Wilykun.groupMetadata(id);
			const groupOwner = groupMetadata.owner;
			const botNumber = Wilykun.user.id.split(':')[0] + '@s.whatsapp.net';
			const botIsAdmin = groupMetadata.participants.some(p => p.id === botNumber && p.admin);

			if (!botIsAdmin) {
				console.error('Bot does not have admin privileges in this group.');
				return;
			}

			for (let participant of participants) {
				if (sentUnadminMessages.has(participant)) continue; // Skip if message already sent

				// Check if the participant is not the owner and not the bot itself
				if (participant !== groupOwner && participant !== botNumber) {
					if (action === 'promote') {
						// Demote the participant if they are promoted
						await Wilykun.groupParticipantsUpdate(id, [participant], 'demote');
						console.log(`Peserta ${participant.split('@')[0]} di-demote di grup ${id}`);
					} else if (action === 'demote') {
						// Promote the participant if they are demoted
						await Wilykun.groupParticipantsUpdate(id, [participant], 'promote');
						console.log(`Peserta ${participant.split('@')[0]} di-promote di grup ${id}`);
					}

					sentUnadminMessages.add(participant); // Mark participant as message sent
				}
			}
			break; // Exit loop if actions performed successfully
		} catch (error) {
			if (error.data === 429) {
				console.error('Rate limit exceeded, retrying...', error);
				retries++;
				await delay(RETRY_DELAY);
			} else if (error.data === 403) {
				console.error('Bot does not have permission to change admin status:', error);
				break; // Exit loop if permission error
			} else {
				console.error('Gagal mengubah status admin peserta:', error);
				break; // Exit loop if error is not rate limit
			}
		}
	}

	// Ensure the bot and the group owner remain admins
	try {
		const groupMetadata = await Wilykun.groupMetadata(id);
		const groupOwner = groupMetadata.owner;
		const botNumber = Wilykun.user.id.split(':')[0] + '@s.whatsapp.net';
		const botIsAdmin = groupMetadata.participants.some(p => p.id === botNumber && p.admin);

		if (!botIsAdmin) {
			await Wilykun.groupParticipantsUpdate(id, [botNumber], 'promote');
			console.log(`Bot ${botNumber.split('@')[0]} di-promote di grup ${id}`);
		}

		const ownerIsAdmin = groupMetadata.participants.some(p => p.id === groupOwner && p.admin);
		if (!ownerIsAdmin) {
			await Wilykun.groupParticipantsUpdate(id, [groupOwner], 'promote');
			console.log(`Owner ${groupOwner.split('@')[0]} di-promote di grup ${id}`);
		}
	} catch (error) {
		console.error('Gagal memastikan bot dan owner tetap admin:', error);
	}
}

if (process.env.HANDLE_ERRORS === 'true') {
	process.on('uncaughtException', function (err) {
		let e = String(err);
		if (e.includes("Socket connection timeout")) return;
		if (e.includes("item-not-found")) return;
		if (e.includes("rate-overlimit")) return;
		if (e.includes("Connection Closed")) return;
		if (e.includes("Timed Out")) return;
		if (e.includes("Value not found")) return;
		console.log('Caught exception: ', err);
	});

	process.on('unhandledRejection', console.error);
}
