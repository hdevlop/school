import { createHash } from 'node:crypto';
import { EncryptionService } from 'najm-auth';
import { Service } from '../../najm';

export const hashEndpoint = (endpoint: string) => createHash('sha256').update(endpoint).digest('hex');
export const fingerprintEndpoint = (endpoint: string) => hashEndpoint(endpoint).slice(0, 16);

@Service()
export class PushCryptoService {
  constructor(private readonly encryption: EncryptionService) {}
  encrypt(value: string) { return this.encryption.encrypt(value); }
  decrypt(value: string) { return this.encryption.decrypt(value); }
}
