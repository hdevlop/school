import 'reflect-metadata';
import { describe, expect, it } from 'bun:test';
import { load } from 'cheerio/slim';
import { email as emailPlugin, EmailService, accountInviteTemplate, emailVerificationTemplate, passwordResetTemplate, welcomeEmailTemplate, type EmailMessage } from 'najm-email';
import { Server } from 'najm-core';
import { brandAccountEmail } from '../../src/email/brandAccountEmail';
import { AccountEmailBranding } from '../../src/email/AccountEmailBranding';
import { accountEmailTheme } from '../../src/email/accountEmailBrand';
import { translations } from '@sms/contracts/locales';

const link = 'https://school.example/reset-password?token=private-token&purpose=password';
const message = (html: string): EmailMessage => ({ to: 'recipient@example.test', subject: 'Account access', html });

describe('one School layout for account emails', () => {
  it('defaults outgoing invitations to French with the saved school name and a compact header', () => {
    const context = { appName: 'École Al Amal & Avenir', userName: 'Hicham <Jebara>' };
    const original = message(accountInviteTemplate({ inviteLink: link, userName: 'Hicham', accountType: 'floor_manager', appName: 'MyScolAI', lang: 'en' }));
    const branded = brandAccountEmail(original, context);
    const $ = load(branded.html!);
    expect($('html').attr('lang')).toBe('fr');
    expect($('h1').text()).toBe(translations.fr.auth.emails.accountInvite.heading);
    expect($('.school-email-header').text()).toContain(context.appName);
    expect($('.school-email-logo').attr('height')).toBe('40');
    expect($('.school-email-button').attr('href')).toBe(link);
    expect($('.school-email-button').text()).toBe(translations.fr.auth.emails.accountInvite.button);
    expect($('body').text()).toContain(context.userName);
    expect($('body').text()).not.toContain('floor_manager');
    expect($('body').text()).not.toContain('MyScolAI');
    expect($('jebara')).toHaveLength(0);
    expect(branded.subject).toBe(`${context.appName} : activez votre compte`);
    expect(original.html).toContain('MyScolAI');
  });

  it('uses French password-reset copy and the school name without changing its token', () => {
    const branded = brandAccountEmail(message(passwordResetTemplate({ resetLink: link, userName: 'Fatima', lang: 'en' })),
      { appName: 'École Al Amal', userName: 'Fatima' });
    const $ = load(branded.html!);
    expect($('html').attr('lang')).toBe('fr');
    expect($('h1').text()).toBe(translations.fr.auth.emails.passwordReset.heading);
    expect(branded.subject).toContain('École Al Amal');
    expect($('.school-email-button').attr('href')).toBe(link);
    expect($('body').text()).toContain(translations.fr.auth.emails.passwordReset.expiry);
  });

  it.each([
    ['invitation', () => accountInviteTemplate({ inviteLink: link, userName: 'Fatima', lang: 'fr', theme: accountEmailTheme })],
    ['password reset', () => passwordResetTemplate({ resetLink: link, userName: 'Fatima', lang: 'fr' })],
    ['verification', () => emailVerificationTemplate({ verificationLink: link, userName: 'Fatima' })],
    ['welcome', () => welcomeEmailTemplate({ loginUrl: link, userName: 'Fatima' })],
  ] as const)('gives %s the shared header, logo and readable action without changing the link', (_kind, render) => {
    const original = message(render());
    const branded = brandAccountEmail(original);
    const $ = load(branded.html!);
    expect($('.school-account-email')).toHaveLength(1);
    expect($('.school-email-header').attr('bgcolor')).toBe('#1e3a5f');
    expect($('.school-email-button').attr('href')).toBe(link);
    expect($('.school-email-button').attr('style')).toContain('color:#ffffff !important');
    expect($('.school-email-button span').attr('style')).toContain('color:#ffffff');
    expect($('body').text()).not.toContain('private-token');
    expect(branded.html).not.toContain('#4F46E5');
    const cid = $('.school-email-logo').attr('src')?.replace('cid:', '');
    expect(branded.attachments?.some(attachment => attachment.cid === cid)).toBe(true);
    expect(branded.to).toBe(original.to);
    expect(branded.subject).toBe(original.subject);
  });

  it('preserves Arabic direction, translated copy, escaped names and the complete secure URL', () => {
    const original = passwordResetTemplate({ resetLink: link, userName: '<script>name</script>', lang: 'ar', copy: {
      heading: 'إعادة تعيين كلمة المرور', button: 'تعيين كلمة مرور جديدة', ignore: 'تجاهل هذه الرسالة إذا لم تطلبها.',
    } });
    const $ = load(brandAccountEmail(message(original)).html!);
    expect($('html').attr('lang')).toBe('ar');
    expect($('html').attr('dir')).toBe('rtl');
    expect($('h1').text()).toBe('إعادة تعيين كلمة المرور');
    expect($('.school-email-button').text().trim()).toBe('تعيين كلمة مرور جديدة');
    expect($('body').text()).toContain('تجاهل هذه الرسالة إذا لم تطلبها.');
    expect($('script')).toHaveLength(0);
    expect($('.school-email-button').attr('href')).toBe(link);
  });

  it.each(['en', 'fr', 'ar', 'es'] as const)('preserves the %s invitation and reset translations', language => {
    const { passwordReset, accountInvite } = translations[language].auth.emails;
    for (const [copy, html] of [
      [passwordReset, passwordResetTemplate({ resetLink: link, userName: 'Fatima', lang: language, copy: passwordReset })],
      [accountInvite, accountInviteTemplate({ inviteLink: link, userName: 'Fatima', lang: language, copy: accountInvite, theme: accountEmailTheme })],
    ] as const) {
      const $ = load(brandAccountEmail(message(html)).html!);
      expect($('h1').text()).toBe(copy.heading);
      expect($('.school-email-button').text().trim()).toBe(copy.button);
      expect($('body').text()).toContain(copy.expiry);
      expect($('html').attr('dir')).toBe(language === 'ar' ? 'rtl' : 'ltr');
    }
  });

  it('keeps existing attachments and plain text, and is safe to apply only once', () => {
    const original = { ...message(passwordResetTemplate({ resetLink: link, userName: 'Fatima' })),
      text: `Reset your password: ${link}`, attachments: [{ filename: 'note.txt', content: 'kept' }] };
    const branded = brandAccountEmail(original);
    expect(branded.attachments).toContainEqual(original.attachments[0]);
    expect(branded.text).toBe(original.text);
    expect(brandAccountEmail(branded)).toBe(branded);
    expect(original.attachments).toHaveLength(1);
  });

  it('reuses the invitation inline logo and keeps every security instruction', () => {
    const original = message(accountInviteTemplate({ inviteLink: link, userName: 'Fatima',
      logoSrc: 'cid:existing-logo', copy: { expiry: 'Expires tomorrow.', expiryNote: 'Never share your password.' } }));
    original.attachments = [{ filename: 'logo.png', cid: 'existing-logo', content: 'existing-inline-logo' }];
    const branded = brandAccountEmail(original);
    const $ = load(branded.html!);
    expect($('.school-email-logo').attr('src')).toBe('cid:existing-logo');
    expect(branded.attachments).toEqual(original.attachments);
    expect($('body').text()).toContain('Expires tomorrow.');
    expect($('body').text()).toContain('Never share your password.');
  });

  it('leaves unrelated messages and plain-text mail unchanged', () => {
    for (const original of [message('<p>A school announcement</p>'), { to: 'a@example.test', subject: 'Notice', text: 'Notice' }]) {
      expect(brandAccountEmail(original)).toBe(original);
    }
  });

  it('uses the branding hook in the real email pipeline with the memory provider', async () => {
    const server = new Server().use(emailPlugin({ provider: { provider: 'memory' } }));
    await server.init();
    const email = await server.container.resolve(EmailService);
    const branding = new AccountEmailBranding(email, {
      getContext: async () => ({ appName: 'École Al Amal', userName: 'Fatima' }),
    } as never);
    branding.configure();
    try {
      const delivered: EmailMessage[] = [];
      email.on('email:sent', ({ message }) => { delivered.push(message); });
      const result = await email.send(message(passwordResetTemplate({ resetLink: link, userName: 'Fatima' })));
      expect(result.success).toBe(true);
      expect(delivered).toHaveLength(1);
      expect(load(delivered[0].html!)('.school-account-email')).toHaveLength(1);
      expect(load(delivered[0].html!)('html').attr('lang')).toBe('fr');
      expect(delivered[0].subject).toContain('École Al Amal');
    } finally { branding.deactivate(); await server.stop(); }
  });
});
