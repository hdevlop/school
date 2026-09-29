export function getDemoResumeFrom(args = process.argv.slice(2)): 'announcements' | undefined {
  const index = args.findIndex((arg) => arg === '--resume-from' || arg.startsWith('--resume-from='));
  if (index < 0) return;
  const value = args[index] === '--resume-from' ? args[index + 1] : args[index].slice('--resume-from='.length);
  if (value !== 'announcements') throw new Error('Supported demo recovery: --resume-from=announcements');
  return value;
}
