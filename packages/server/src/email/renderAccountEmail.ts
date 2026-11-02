import { escapeHtml } from 'najm-email';
import { ACCOUNT_EMAIL_APP_NAME, accountEmailTheme as c } from './accountEmailBrand';

type AccountEmailLayout = {
  title: string; documentTitle: string; lang: string; dir: 'rtl' | 'ltr';
  logoSrc?: string; contentHtml: string; footerHtml: string;
};

/** The only outer layout for School account messages. Essential styles stay inline for mail clients. */
export function renderAccountEmail(layout: AccountEmailLayout) {
  const logoHtml = layout.logoSrc
    ? `<table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin-bottom:24px;"><tr><td bgcolor="#ffffff" style="padding:12px 16px;border-radius:14px;"><img class="school-email-logo" src="${escapeHtml(layout.logoSrc)}" alt="${ACCOUNT_EMAIL_APP_NAME}" height="${c.logoHeight}" style="display:block;height:${c.logoHeight}px;width:auto;max-width:240px;border:0;"></td></tr></table>`
    : `<p style="color:${c.headerText};font-weight:700;">${ACCOUNT_EMAIL_APP_NAME}</p>`;
  return `<!doctype html>
<html lang="${escapeHtml(layout.lang)}" dir="${layout.dir}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light"><title>${escapeHtml(layout.documentTitle)}</title>
<style>@media(max-width:620px){.school-email-shell{padding:16px 10px!important}.school-email-header,.school-email-content,.school-email-footer{padding-left:24px!important;padding-right:24px!important}.school-email-button{display:block!important;text-align:center!important}h1{font-size:25px!important;line-height:33px!important}}</style></head>
<body style="margin:0;background-color:${c.pageBackground};font-family:Arial,Helvetica,sans-serif;color:${c.ink};-webkit-text-size-adjust:100%;">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" bgcolor="${c.pageBackground}"><tr><td class="school-email-shell" align="center" style="padding:40px 16px;">
<table role="presentation" class="school-account-email" width="100%" cellspacing="0" cellpadding="0" border="0" bgcolor="#ffffff" style="width:100%;max-width:600px;border:1px solid ${c.border};border-radius:24px;overflow:hidden;">
<tr><td bgcolor="${c.accent}" height="6" style="font-size:0;line-height:0;">&nbsp;</td></tr>
<tr><td class="school-email-header" bgcolor="${c.headerBackground}" style="padding:32px 40px;color:${c.headerText};">${logoHtml}<h1 style="margin:0;font-size:28px;line-height:36px;color:${c.headerText};font-weight:700;">${escapeHtml(layout.title)}</h1></td></tr>
<tr><td class="school-email-content" style="padding:32px 40px 12px;">${layout.contentHtml}</td></tr>
<tr><td class="school-email-footer" style="padding:24px 40px 28px;border-top:1px solid ${c.border};">${layout.footerHtml}</td></tr>
</table></td></tr></table></body></html>`;
}
