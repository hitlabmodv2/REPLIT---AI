import chalk from 'chalk';

/**
 * Memilih dua warna acak dari daftar warna yang didukung oleh chalk.
 * @param {string} text - Teks yang akan diwarnai.
 * @returns {string} - Teks yang diwarnai dengan dua warna acak.
 */
export function randomColor(text) {
	const colors = [
		'red', 'green', 'yellow', 'blue', 'magenta', 'cyan', 'white',
		'gray', 'redBright', 'greenBright', 'yellowBright', 'blueBright',
		'magentaBright', 'cyanBright', 'whiteBright'
	];
	const randomColor1 = colors[Math.floor(Math.random() * colors.length)];
	const randomColor2 = colors[Math.floor(Math.random() * colors.length)];
	return chalk[randomColor1](chalk[randomColor2](text));
}
