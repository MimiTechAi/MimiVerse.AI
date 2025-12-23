import bcrypt from 'bcrypt';

const SALT_ROUNDS = 12; // OWASP recommended minimum

/**
 * Hash a password using bcrypt
 * @param password - Plain text password
 * @returns Hashed password
 */
export async function hashPassword(password: string): Promise<string> {
    if (!password || password.length < 8) {
        throw new Error('Password must be at least 8 characters long');
    }
    return await bcrypt.hash(password, SALT_ROUNDS);
}

/**
 * Verify a password against a hash
 * @param password - Plain text password to verify
 * @param hash - Hashed password to compare against
 * @returns True if password matches, false otherwise
 */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
    try {
        return await bcrypt.compare(password, hash);
    } catch (error) {
        console.error('Password verification error:', error);
        return false;
    }
}
