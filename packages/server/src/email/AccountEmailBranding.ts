import { Meta, Service } from 'najm-core';
import { EmailService } from 'najm-email';
import { brandAccountEmail, isAccountEmail } from './brandAccountEmail';
import { AccountEmailRepository } from './AccountEmailRepository';
import { accountEmailDeliveryLogo } from './accountEmailBrand';

@Service()
@Meta({ layer: 'plugin' })
export class AccountEmailBranding {
  private unsubscribe?: () => void;
  constructor(private email: EmailService, private repository: AccountEmailRepository) {}

  configure() {
    this.unsubscribe?.();
    this.unsubscribe = this.email.on('email:sending', async ({ message }) => {
      if (!isAccountEmail(message)) return;
      const [context, logo] = await Promise.all([
        this.repository.getContext(message.to),
        accountEmailDeliveryLogo(),
      ]);
      Object.assign(message, brandAccountEmail(message, { ...context, logo }));
    });
  }

  deactivate() { this.unsubscribe?.(); }
}
