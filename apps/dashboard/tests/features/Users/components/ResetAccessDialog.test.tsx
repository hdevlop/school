import { expect, test } from 'bun:test';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { I18nProvider } from 'najm-i18n/react';
import { translations } from '@sms/contracts/locales';
import ResetAccessDialog from '@/features/Users/components/ResetAccessDialog';

function render(status: string, invitationApproval = true) {
  const queryClient = new QueryClient();
  try {
    return renderToStaticMarkup(
      <QueryClientProvider client={queryClient}>
        <I18nProvider translations={translations} initialLanguage="en">
          <ResetAccessDialog
            user={{ id: 'staff-user', name: 'Fatima Zahra', email: 'fatima@example.ma', role: 'secretary', status }}
            invitationApproval={invitationApproval}
          />
        </I18nProvider>
      </QueryClientProvider>,
    );
  } finally { queryClient.clear(); }
}

test('pending staff approval explains the invitation before offering to send it', () => {
  const markup = render('pending');
  expect(markup).toContain('Approve &amp; send invitation');
  expect(markup).toContain(translations.en.staff.invitation.approveDescription);
  expect(markup).toContain('type="submit"');
  expect(markup).toContain('name="reason"');
});

test('an account activated since opening the staff menu cannot be reset through approval', () => {
  expect(render('active')).not.toContain('type="submit"');
  expect(render('inactive')).not.toContain('type="submit"');
});

test('ordinary recovery remains available for an active staff login', () => {
  const markup = render('active', false);
  expect(markup).toContain('type="submit"');
  expect(markup).not.toContain('Approve &amp; send invitation');
});
