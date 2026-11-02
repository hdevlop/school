import { load } from 'cheerio/slim';
import { escapeHtml, type EmailMessage } from 'najm-email';
import { accountEmailLogo, accountEmailTheme as c } from './accountEmailBrand';
import { renderAccountEmail } from './renderAccountEmail';

/**
 * Presents Najm's account messages in one layout at its public delivery hook.
 * Copy and links come from the original localized message; this owns presentation
 * only. Tests use the actual pinned template generators to catch markup changes.
 */
export function brandAccountEmail(message: EmailMessage): EmailMessage {
  if (!message.html) return message;
  const sections = readAccountEmail(message.html);
  if (!sections) return message;
  styleAccountEmail(sections);
  const { $, header, content, footer } = sections;
  const logo = embedAccountLogo(message, header.find('img').first().attr('src'));
  const title = header.find('h1').text();
  return { ...message, attachments: logo.attachments, html: renderAccountEmail({
    title, documentTitle: $('title').text() || title, lang: $('html').attr('lang') || 'en',
    dir: $('html').attr('dir') === 'rtl' ? 'rtl' : 'ltr', logoSrc: logo.src,
    contentHtml: content.html() || '', footerHtml: footer.html() || '',
  }) };
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
  content.find('p').attr('style', `margin:0 0 18px;font-size:16px;line-height:26px;color:${c.text};`);
  content.find('a').css('color', c.link);
  if (href) {
    const action = `<table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin:28px auto;"><tr><td bgcolor="${c.button}" style="border-radius:12px;background-color:${c.button};"><a class="school-email-button" href="${escapeHtml(href)}" style="display:inline-block;padding:16px 28px;border-radius:12px;background-color:${c.button};color:${c.buttonText} !important;font-size:16px;line-height:24px;font-weight:700;text-decoration:none;"><span style="color:${c.buttonText};">${escapeHtml(buttonLabel)}</span></a></td></tr></table>`;
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

function embedAccountLogo(message: EmailMessage, originalLogo?: string) {
  const attachments = [...(message.attachments || [])];
  const existingInlineLogo = originalLogo?.startsWith('cid:')
    && attachments.some(attachment => attachment.cid === originalLogo.slice(4));
  const logo = existingInlineLogo ? undefined : accountEmailLogo();
  if (logo) attachments.push({ filename: logo.filename, content: logo.contentBase64, contentType: logo.contentType,
    encoding: 'base64', disposition: 'inline', cid: 'school-account-logo' });
  return { src: existingInlineLogo ? originalLogo : logo ? 'cid:school-account-logo' : undefined, attachments };
}
