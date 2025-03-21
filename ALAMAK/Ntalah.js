import { Boom } from '@hapi/boom';
import fs from 'fs';
import { exec } from 'child_process';
import treeKill from '../lib/tree-kill.js';

/**
 * Menangani alasan disconnect.
 * @param {import('baileys').WASocket} Wilykun - Instance WASocket.
 * @param {number} reason - Alasan disconnect.
 * @param {Function} startSock - Fungsi untuk memulai ulang socket.
 */
export async function handleDisconnectReason(Wilykun, reason, startSock) {
	switch (reason) {
		case DisconnectReason.multideviceMismatch:
		case DisconnectReason.loggedOut:
		case 403:
			console.error(new Boom(reason)?.output.statusCode);
			await Wilykun.logout();
			fs.rmSync(`./${process.env.SESSION_NAME}`, { recursive: true, force: true });
			exec('npm run stop:pm2', err => {
				if (err) return treeKill(process.pid);
			});
			break;
		default:
			console.error(new Boom(reason)?.output.statusCode);
			await startSock();
	}
}
