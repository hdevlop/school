import { env } from '@sms/server/env';
import LoginForm from './LoginForm';

/**
 * Offers "Continue with Google" only where the server has Google's keys; the
 * server turns Google sign-in on from the same `env.auth.googleSignIn`.
 */
export default function LoginPage() {
  return <LoginForm google={env.auth.googleSignIn} />;
}
