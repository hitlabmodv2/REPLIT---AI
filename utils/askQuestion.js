import readline from 'readline';

/**
 * Membaca input dari pengguna.
 * @param {string} query - Pertanyaan yang akan ditampilkan kepada pengguna.
 * @param {boolean} isPassword - Apakah input adalah password.
 * @returns {Promise<string>} - Input dari pengguna.
 */
export function askQuestion(query, isPassword = false) {
	const rl = readline.createInterface({
		input: process.stdin,
		output: process.stdout,
		terminal: true
	});

	if (isPassword) {
		rl.stdoutMuted = true;
		rl._writeToOutput = function _writeToOutput(stringToWrite) {
			if (rl.stdoutMuted) {
				rl.output.write("\x1B[2K\x1B[200D" + query + "*".repeat(rl.line.length));
			} else {
				rl.output.write(stringToWrite);
			}
		};
	}

	return new Promise(resolve => rl.question(query, ans => {
		rl.close();
		resolve(ans.trim()); // Gunakan trim() untuk menghapus spasi yang tidak diinginkan
	}));
}
