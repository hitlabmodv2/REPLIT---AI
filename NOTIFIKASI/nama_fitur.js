export function getFeatureStatus() {
	const features = {
		'📺 Anti Channel Link': process.env.ENABLE_ANTI_CHANNEL_LINK === 'true' ? 'Aktif' : 'Tidak Aktif',
		'🔗 Anti Group Link': process.env.ENABLE_ANTI_GROUP_LINK === 'true' ? 'Aktif' : 'Tidak Aktif',
		'📰 Anti Forwarded Newsletter': process.env.ENABLE_ANTI_FORWARDED_NEWSLETTER === 'true' ? 'Aktif' : 'Tidak Aktif',
		'🔗 Anti WaMe Link': process.env.ENABLE_ANTI_WAME_LINK === 'true' ? 'Aktif' : 'Tidak Aktif',
		'🧹 Auto Clear Session': process.env.AUTO_CLEAR_SESSION_ENABLED === 'true' ? 'Aktif' : 'Tidak Aktif',
		'👢 Auto Kick': process.env.AUTO_KICK_ENABLED === 'true' ? 'Aktif' : 'Tidak Aktif',
		'📶 Auto Online': process.env.AUTO_ONLINE_AUTO_READ_PESAN === 'true' ? 'Aktif' : 'Tidak Aktif',
		'🎥 Auto Recording': process.env.ENABLE_RECORDING === 'true' ? 'Aktif' : 'Tidak Aktif',
		'⌨️ Auto Typing': process.env.ENABLE_TYPING === 'true' ? 'Aktif' : 'Tidak Aktif',
		'🖼️ Auto Sticker Mode': ['group', 'private', 'all'].includes(process.env.AUTO_STICKER_MODE) ? 'Aktif' : 'Tidak Aktif',
		'👋 Goodbye Group': process.env.ENABLE_GOODBYE_MESSAGE === 'true' ? 'Aktif' : 'Tidak Aktif',
		'⚠️ Handle Errors': process.env.HANDLE_ERRORS === 'true' ? 'Aktif' : 'Tidak Aktif',
		'👑 Owner Welcome Message': process.env.ENABLE_OWNER_WELCOME_MESSAGE === 'true' ? 'Aktif' : 'Tidak Aktif',
		'🔒 Self Mode': process.env.SELF === 'true' ? 'Aktif' : 'Tidak Aktif',
		'📤 Telegram Backup': process.env.ENABLE_TELEGRAM_BACKUP === 'true' ? 'Aktif' : 'Tidak Aktif',
		'👋 Welcome Group': process.env.ENABLE_WELCOME_MESSAGE === 'true' ? 'Aktif' : 'Tidak Aktif',
		'💾 Write Store': process.env.WRITE_STORE === 'true' ? 'Aktif' : 'Tidak Aktif',
		'📩 Private Welcome Message': process.env.ENABLE_PRIVATE_WELCOME_MESSAGE === 'true' ? 'Aktif' : 'Tidak Aktif',
		'📨 Private Goodbye Message': process.env.ENABLE_PRIVATE_GOODBYE_MESSAGE === 'true' ? 'Aktif' : 'Tidak Aktif',
		'🔄 Auto Restart': process.env.ENABLE_AUTO_RESTART === 'true' ? 'Aktif' : 'Tidak Aktif'
	};

	const sortedFeatures = Object.keys(features).sort().reduce((acc, key) => {
		acc[key] = features[key];
		return acc;
	}, {});

	const activeFeatures = Object.entries(sortedFeatures)
		.filter(([_, status]) => status === 'Aktif')
		.sort(([a], [b]) => a.localeCompare(b))
		.reduce((acc, [key, value]) => {
			acc[key] = value;
			return acc;
		}, {});

	const inactiveFeatures = Object.entries(sortedFeatures)
		.filter(([_, status]) => status === 'Tidak Aktif')
		.sort(([a], [b]) => a.localeCompare(b))
		.reduce((acc, [key, value]) => {
			acc[key] = value;
			return acc;
		}, {});

	return { activeFeatures, inactiveFeatures };
}
