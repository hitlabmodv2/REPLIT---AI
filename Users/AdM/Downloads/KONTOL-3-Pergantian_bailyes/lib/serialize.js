import baileys, { jidNormalizedUser, extractMessageContent, areJidsSameUser, downloadMediaMessage } from 'baileys';
import path from 'path';
import fs from 'fs';
import pino from 'pino';
import { parsePhoneNumber } from 'libphonenumber-js';
import { fileTypeFromBuffer } from 'file-type';

import { escapeRegExp } from './function.js';

export const getContentType = content => {
	if (content) {
		const keys = Object.keys(content);
		const key = keys.find(k => (k === 'conversation' || k.endsWith('Message') || k.includes('V2') || k.includes('V3')) && k !== 'senderKeyDistributionMessage');
		return key;
	}
};

export function Client({ Wilykun, store }) {
	const client = Object.defineProperties(Wilykun, {
		getName: {
			value(jid) {
				let id = jidNormalizedUser(jid);
				if (id.endsWith('g.us')) {
					let metadata = store.groupMetadata?.[id];
					return metadata.subject;
				} else {
					let metadata = store.contacts[id];
					return metadata?.name || metadata?.verifiedName || metadata?.notify || parsePhoneNumber('+' + id.split('@')[0]).format('INTERNATIONAL');
				}
			},
		},

		sendContact: {
			async value(jid, number, quoted, options = {}) {
				let list = [];
				for (let v of number) {
					if (v.endsWith('g.us')) continue;
					v = v.replace(/\D+/g, '');
					list.push({
						displayName: Wilykun.getName(v + '@s.whatsapp.net'),
						vcard: `BEGIN:VCARD\nVERSION:3.0\nN:${Wilykun.getName(v + '@s.whatsapp.net')}\nFN:${Wilykun.getName(v + '@s.whatsapp.net')}\nitem1.TEL;waid=${v}:${v}\nEND:VCARD`,
					});
				}
				return Wilykun.sendMessage(
					jid,
					{
						contacts: {
							displayName: `${list.length} Contact`,
							contacts: list,
						},
					},
					{ quoted, ...options }
				);
			},
			enumerable: true,
		},

		parseMention: {
			value(text) {
				return [...text.matchAll(/@([0-9]{5,16}|0)/g)].map(v => v[1] + '@s.whatsapp.net') || [];
			},
		},

		downloadMediaMessage: {
			async value(message, filename) {
				let media = await downloadMediaMessage(
					message,
					'buffer',
					{},
					{
						logger: pino({ timestamp: () => `,"time":"${new Date().toJSON()}"`, level: 'fatal' }).child({ class: 'Wilykun' }),
						reuploadRequest: Wilykun.updateMediaMessage,
					}
				);

				if (filename) {
					let mime = await fileTypeFromBuffer(media);
					let filePath = path.join(process.cwd(), `${filename}.${mime.ext}`);
					fs.promises.writeFile(filePath, media);
					return filePath;
				}

				return media;
			},
			enumerable: true,
		},

		cMod: {
			value(jid, copy, text = '', sender = Wilykun.user.id, options = {}) {
				let mtype = getContentType(copy.message);
				let content = copy.message[mtype];
				if (typeof content === 'string') copy.message[mtype] = text || content;
				else if (content.caption) content.caption = text || content.caption;
				else if (content.text) content.text = text || content.text;
				if (typeof content !== 'string') {
					copy.message[mtype] = { ...content, ...options };
					copy.message[mtype].contextInfo = {
						...(content.contextInfo || {}),
						mentionedJid: options.mentions || content.contextInfo?.mentionedJid || [],
					};
				}
				if (copy.key.participant) sender = copy.key.participant = sender || copy.key.participant;
				if (copy.key.remoteJid.includes('@s.whatsapp.net')) sender = sender || copy.key.remoteJid;
				else if (copy.key.remoteJid.includes('@broadcast')) sender = sender || copy.key.remoteJid;
				copy.key.remoteJid = jid;
				copy.key.fromMe = areJidsSameUser(sender, Wilykun.user.id);
				return baileys.proto.WebMessageInfo.fromObject(copy);
			},
			enumerable: false,
		},
	});

	return client;
}

export default async function serialize(Wilykun, message, store) {
    // Ensure the message is properly serialized
    const m = {
        ...message,
        key: message.key,
        message: message.message,
        participant: message.key.participant,
        isGroup: message.key.remoteJid.endsWith('@g.us'),
        sender: message.key.fromMe ? Wilykun.user.id : message.key.participant || message.key.remoteJid,
        from: message.key.remoteJid,
        isOwner: store.contacts[message.key.participant || message.key.remoteJid]?.isOwner || false,
    };

    // Add additional properties if needed
    m.isBot = m.sender === Wilykun.user.id;
    m.isAdmin = store.contacts[m.sender]?.isAdmin || false;

    return m;
}

function parseMessage(content) {
	content = extractMessageContent(content);

	if (content && content.viewOnceMessageV2Extension) {
		content = content.viewOnceMessageV2Extension.message;
	}
	if (content && content.protocolMessage && content.protocolMessage.type == 14) {
		let type = getContentType(content.protocolMessage);
		content = content.protocolMessage[type];
	}
	if (content && content.message) {
		let type = getContentType(content.message);
		content = content.message[type];
	}

	return content;
}
