import { Meta, Service } from 'najm-core';
import { EmailService } from 'najm-email';
import { brandAccountEmail } from './brandAccountEmail';

@Service()
@Meta({ layer: 'plugin' })
export class AccountEmailBranding {
  private unsubscribe?: () => void;
  constructor(private email: EmailService) {}

  configure() {
    this.unsubscribe?.();
    this.unsubscribe = this.email.on('email:sending', ({ message }) => {
      Object.assign(message, brandAccountEmail(message));
    });
  }

  deactivate() { this.unsubscribe?.(); }
}
