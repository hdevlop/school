import LoginForm from './LoginForm';

/**
 * Offers "Continue with Google" only where the server has Google's keys; the
 * server turns Google sign-in on from the same two variables (authConfig.ts).
 */
export default function LoginPage() {
  return <LoginForm google={!!process.env.GOOGLE_CLIENT_ID && !!process.env.GOOGLE_CLIENT_SECRET} />;
}
