import { Injectable, Logger } from '@nestjs/common';
import { createCipheriv, createHash, randomBytes } from 'node:crypto';

type EncryptedSecret = {
  ciphertext: string;
  iv: string;
  tag: string;
};

@Injectable()
export class TransportadoraApiCryptoService {
  private readonly logger = new Logger(TransportadoraApiCryptoService.name);
  private readonly key: Buffer;

  constructor() {
    this.key = this.resolveKey();
  }

  encryptApiKey(plaintext: string): EncryptedSecret {
    const iv = randomBytes(12);
    const cipher = createCipheriv('aes-256-gcm', this.key, iv);
    const ciphertext = Buffer.concat([
      cipher.update(plaintext, 'utf8'),
      cipher.final(),
    ]);
    const tag = cipher.getAuthTag();

    return {
      ciphertext: ciphertext.toString('base64'),
      iv: iv.toString('base64'),
      tag: tag.toString('base64'),
    };
  }

  private resolveKey(): Buffer {
    const configuredKey = process.env.TRANSPORTADORA_API_CRYPTO_KEY_BASE64?.trim();
    if (configuredKey) {
      try {
        const decoded = Buffer.from(configuredKey, 'base64');
        if (decoded.length !== 32) {
          throw new Error('TRANSPORTADORA_API_CRYPTO_KEY_BASE64 debe tener 32 bytes');
        }
        return decoded;
      } catch (error) {
        this.logger.error(
          'La clave TRANSPORTADORA_API_CRYPTO_KEY_BASE64 es invalida',
          error instanceof Error ? error.stack : undefined,
        );
        throw error;
      }
    }

    const fallbackSeed = process.env.AUTH_SECRET ?? 'dev-secret-change-me-in-production';
    return createHash('sha256')
      .update(`transportadora-api:${fallbackSeed}`)
      .digest();
  }
}
