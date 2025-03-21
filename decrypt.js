function decryptMessage(encryptedMessage, sessionKey) {
    try {
        const decryptedMessage = someDecryptionFunction(encryptedMessage, sessionKey);
        return decryptedMessage;
    } catch (error) {
        if (error.message.includes("Bad MAC")) {
            // Handle the "Bad MAC" error specifically
            console.warn("Failed to decrypt message due to Bad MAC error.");
            return null; // or handle it in another appropriate way
        } else {
            // Re-throw other errors
            throw error;
        }
    }
}
