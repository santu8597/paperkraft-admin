import crypto from 'crypto';

const ALPHANUMERIC_CHARACTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

export function generatePassword(length: number = 6): string {
  let password = '';

  for (let index = 0; index < length; index += 1) {
    const characterIndex = crypto.randomInt(ALPHANUMERIC_CHARACTERS.length);
    password += ALPHANUMERIC_CHARACTERS[characterIndex];
  }

  return password;
}
