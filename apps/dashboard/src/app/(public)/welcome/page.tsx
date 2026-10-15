import { permanentRedirect } from 'next/navigation';

/** Preserve existing website bookmarks while the public homepage lives at `/`. */
export default function Welcome() {
  permanentRedirect('/');
}
