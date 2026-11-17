import { defaultCredentialSetupPasswordSchema } from 'najm-auth';
import { auth } from '../auth';
import { ACCOUNT_EMAIL_APP_NAME, accountEmailLogo, accountEmailTheme } from '../email/accountEmailBrand';
import { env } from '../env';

/**
 * Sign-in; its variables are `env.auth` and `env.app.frontendUrl`. The default
 * guard is set in `server.ts`, which the preset registers before auth.
 *
 * auth uses the cache, email and rate-limit plugins the preset registers
 * before it. Passing their config here as well would be ignored, and the
 * server warns when it is.
 */

/** Google sign-in is offered only where its keys are configured. */
export const googleSignInEnabled = () => env.auth.googleSignIn;

export const authConfig = () =>
  auth({
    appName: ACCOUNT_EMAIL_APP_NAME,
    accountInviteLogo: accountEmailLogo(),
    accountInviteTheme: accountEmailTheme,
    frontendUrl: env.app.frontendUrl,
    dialect: 'pg',
    encryptionKey: env.auth.encryptionKey,
    // A self-registered account waits for an administrator, who activates it
    // and gives it a role. It used to be active at once, with no role, and
    // could sign in and call every route that asks only for sign-in. Accounts
    // School creates for staff, families and users pass an explicit status.
    registrationMode: 'pending',
    // Every new password (invitation and reset links, change password, admin-
    // created accounts): 8 characters, a letter and a number, in any case.
    // Staff and families type them on phones, where the uppercase rule najm-auth
    // asks for by default kept them out. The same rule as the first-login
    // replacement of a temporary password.
    passwordSchema: defaultCredentialSetupPasswordSchema,
    // "Continue with Google" for accounts the school created: a Google account
    // joins the School account with its Google-verified email. Google creates
    // no account. An invited account still pending is activated by it when the
    // Google email is the invited one and the invitation is the latest unused
    // one (najm-auth OAuthService.acceptInvitation); that uses up the emailed
    // link, which then says it is no longer valid. Any other pending or
    // inactive account still cannot sign in.
    ...(googleSignInEnabled() ? { oauth: { google: { allowSignup: false, autoLinkVerifiedEmail: true } } } : {}),
  });
