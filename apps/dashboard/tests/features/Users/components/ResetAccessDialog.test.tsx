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

const { approve, approveDescription } = translations.en.staff.invitation;

test('pending staff approval names the recipient before offering to send the invitation', () => {
  const markup = render('pending');
  expect(markup).toContain(approve);
  for (const part of approveDescription.split('{{recipient}}')) expect(markup).toContain(part);
  expect(markup).toContain('Fatima Zahra');
  expect(markup).toContain('fatima@example.ma');
  expect(markup).not.toContain('{recipient}');
  expect(markup).not.toContain('name="reason"');
});

test('an account activated since opening the staff menu cannot be reset through approval', () => {
  for (const status of ['active', 'inactive']) {
    const markup = render(status);
    expect(markup).not.toContain(approve);
    expect(markup).toContain(translations.en.users.accessReset.unsupported);
  }
});

test('ordinary recovery remains available for an active staff login', () => {
  const markup = render('active', false);
  expect(markup).toContain(translations.en.users.accessReset.confirmButton);
  expect(markup).toContain('Fatima Zahra');
  expect(markup).not.toContain(approve);
});
