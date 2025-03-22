import fs from 'fs';
import path from 'path';
import chalk from 'chalk';

export function autoClearSession() {
    const sessionDir = path.join(process.cwd(), process.env.SESSION_DIR || 'session'); // Sesuaikan dengan path session dari .env
    const clearInterval = parseInt(process.env.CLEAR_INTERVAL, 10) || 2 * 60 * 60 * 1000; // Interval dari .env
    
    setInterval(async () => {
        try {
            const files = fs.readdirSync(sessionDir);
            const filteredFiles = files.filter(file => 
                file.startsWith('pre-key') ||
                file.startsWith('sender-key') ||
                file.startsWith('session-') ||
                file.startsWith('app-state')
            );

            if (filteredFiles.length === 0) return;

            console.log(chalk.yellow('======================================================'));
            console.log(chalk.yellow('🧹 [AUTO CLEAN] Memulai pembersihan sesi otomatis...'));
            console.log(chalk.yellow('======================================================'));
            
            filteredFiles.forEach(file => {
                fs.unlinkSync(path.join(sessionDir, file));
            });

            console.log(chalk.green('======================================================'));
            console.log(chalk.green(`🗑️ [AUTO CLEAN] Menghapus ${filteredFiles.length} file sesi`));
            console.log(chalk.green('✅ Berhasil Menghapus sesi'));
            console.log(chalk.green('======================================================'));
        } catch (error) {
            console.error(chalk.red('======================================================'));
            console.error(chalk.red('❌ [AUTO CLEAN ERROR] Terjadi kesalahan saat pembersihan sesi otomatis'));
            console.error(chalk.red('======================================================'), error);
        }
    }, clearInterval);
}
