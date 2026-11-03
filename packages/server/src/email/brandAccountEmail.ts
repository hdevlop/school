import { load } from 'cheerio/slim';
import { accountInviteTemplate, passwordResetTemplate, escapeHtml, type EmailMessage } from 'najm-email';
import { fr } from '@sms/contracts/locales';
import { accountEmailLogo, accountEmailTheme as c } from './accountEmailBrand';
import { renderAccountEmail } from './renderAccountEmail';

/**
 * Presents Najm's account messages in one layout at its public delivery hook.
 * Live account invitations and password resets use French School copy. Other
 * account messages retain their copy. Every security link stays unchanged.
 */
export type AccountEmailContext = { appName: string; userName: string; logo?: ReturnType<typeof accountEmailLogo> };

export const isAccountEmail = (message: EmailMessage) => Boolean(message.html && readAccountEmail(message.html));

export function brandAccountEmail(message: EmailMessage, context?: AccountEmailContext): EmailMessage {
  if (!message.html) return message;
  let sections = readAccountEmail(message.html);
  if (!sections) return message;
  if (context) {
    message = frenchAccountEmail(message, sections, context);
    sections = readAccountEmail(message.html!);
    if (!sections) return message;
  }
  styleAccountEmail(sections);
  const { $, header, content, footer } = sections;
  const logo = embedAccountLogo(message, header.find('img').first().attr('src'), context?.logo);
  const title = header.find('h1').text();
  return { ...message, attachments: logo.attachments, html: renderAccountEmail({
    title, appName: context?.appName, documentTitle: $('title').text() || title, lang: $('html').attr('lang') || 'fr',
    dir: $('html').attr('dir') === 'rtl' ? 'rtl' : 'ltr', logoSrc: logo.src,
    contentHtml: content.html() || '', footerHtml: footer.html() || '',
  }) };
}

function frenchAccountEmail(message: EmailMessage, sections: NonNullable<ReturnType<typeof readAccountEmail>>, context: AccountEmailContext): EmailMessage {
  const href = sections.content.find('a.button, a.email-button').first().attr('href');
  if (!href) return message;
  const invitation = sections.invitation;
  if (!invitation && new URL(href, 'https://school.invalid').pathname !== '/reset-password') return message;
  const catalog = invitation ? fr.auth.emails.accountInvite : fr.auth.emails.passwordReset;
  const copy = Object.fromEntries(Object.entries(catalog).map(([key, value]) => [key,
    value.replace(/{{(name|appName)}}/g, (_match, key: 'name' | 'appName') => key === 'name' ? context.userName : context.appName),
  ]));
  const html = invitation
    ? accountInviteTemplate({ inviteLink: href, userName: context.userName, appName: context.appName, lang: 'fr', copy,
      theme: c, logoSrc: sections.header.find('img').first().attr('src'), logoAlt: context.appName })
    : passwordResetTemplate({ resetLink: href, userName: context.userName, lang: 'fr', copy });
  return { ...message, html, subject: invitation ? copy.subject : `${context.appName} : ${copy.subject}`,
    ...(message.text ? { text: load(html)('body').text().trim() } : {}) };
}

function readAccountEmail(html: string) {
  const $ = load(html);
  if ($('.school-account-email').length) return null;
  const invitation = $('.email-card').length > 0;
  const header = $(invitation ? '.email-header' : '.container > .header');
  const content = $(invitation ? '.email-content' : '.container > .content');
  const footer = invitation ? content.closest('tr').next().children('td') : $('.container > .footer');
  if (header.length !== 1 || content.length !== 1 || footer.length !== 1 || header.find('h1').length !== 1) return null;
  return { $, invitation, header, content, footer };
}

function styleAccountEmail({ $, invitation, content, footer }: NonNullable<ReturnType<typeof readAccountEmail>>) {
  const button = content.find('a.button, a.email-button').first();
  const href = button.attr('href');
  const buttonLabel = button.text().trim();
  content.children('p').attr('style', `margin:0 0 14px;font-size:15px;line-height:24px;color:${c.text};`);
  content.find('a').css('color', c.link);
  if (href) {
    const action = `<table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin:20px auto;"><tr><td bgcolor="${c.button}" style="border-radius:10px;background-color:${c.button};"><a class="school-email-button" href="${escapeHtml(href)}" style="display:inline-block;padding:12px 24px;border-radius:10px;background-color:${c.button};color:${c.buttonText} !important;font-size:15px;line-height:22px;font-weight:700;text-decoration:none;"><span style="color:${c.buttonText};">${escapeHtml(buttonLabel)}</span></a></td></tr></table>`;
    if (invitation) button.closest('table').replaceWith(action);
    else button.parent('p').replaceWith(action);

    // A readable fallback link avoids Gmail auto-linking a long token across the page.
    footer.find('p').each((_index, paragraph) => {
      if ($(paragraph).text().trim() === href) {
        $(paragraph).empty().append($('<a>').attr('href', href).text(buttonLabel));
      }
    });
  }
  footer.children('div').remove();
  footer.find('p').attr('style', `margin:0 0 10px;font-size:13px;line-height:21px;color:${c.muted};overflow-wrap:anywhere;`);
  footer.find('a').attr('style', `color:${c.link};text-decoration:underline;overflow-wrap:anywhere;`);
}

function embedAccountLogo(message: EmailMessage, originalLogo?: string, deliveryLogo?: ReturnType<typeof accountEmailLogo>) {
  const originalCid = originalLogo?.startsWith('cid:') ? originalLogo.slice(4) : undefined;
  const attachments = [...(message.attachments || [])]
    .filter(attachment => !deliveryLogo || !originalCid || attachment.cid !== originalCid);
  const existingInlineLogo = !deliveryLogo && originalLogo?.startsWith('cid:')
    && attachments.some(attachment => attachment.cid === originalLogo.slice(4));
  const logo = deliveryLogo ?? (existingInlineLogo ? undefined : accountEmailLogo());
  if (logo) attachments.push({ filename: logo.filename, content: logo.contentBase64, contentType: logo.contentType,
    encoding: 'base64', disposition: 'inline', cid: 'school-account-logo' });
  return { src: existingInlineLogo ? originalLogo : logo ? 'cid:school-account-logo' : undefined, attachments };
}
