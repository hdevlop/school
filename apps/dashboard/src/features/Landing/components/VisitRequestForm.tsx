'use client';
import { useState } from 'react';
import { FormInput, NForm } from 'najm-kit';
import { useTranslation } from 'najm-i18n/react';
import type { LandingCycle } from '@sms/contracts';
import type { SchoolLocale } from '@sms/contracts/locales';
import { visitRequestSchema } from '../config/landingSchemas';

export function VisitRequestForm({ cycles, language }: { cycles: LandingCycle[]; language: SchoolLocale }) {
  const { t } = useTranslation();
  const [received, setReceived] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  if (received) return <p role="status" className="landing-form-message">{t('visitRequests.form.thanks')}</p>;
  return <NForm schema={visitRequestSchema} className="landing-visit-form" defaultValues={{ parentName: '', phone: '', email: '', cycleId: '', message: '', website: '' }}
    onSubmit={async data => {
      setPending(true); setError('');
      try {
        const response = await fetch('/api/visit-requests', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Language': language }, body: JSON.stringify({ ...data, cycleId: data.cycleId || undefined }) });
        if (!response.ok) { setError(t(response.status === 429 ? 'visitRequests.form.rateLimited' : 'visitRequests.form.failed')); return; }
        setReceived(true);
      } catch { setError(t('visitRequests.form.failed')); } finally { setPending(false); }
    }}>
    <div className="landing-form-grid"><FormInput name="parentName" type="text" formLabel={t('visitRequests.form.name')} required maxLength={120} />
      <FormInput name="phone" type="phone" formLabel={t('visitRequests.form.phone')} required defaultCountry="ma" />
    </div>
    <div className={cycles.length > 0 ? 'landing-form-grid' : undefined}>
      {cycles.length > 0 && <FormInput name="cycleId" type="select" formLabel={t('visitRequests.form.level')} placeholder={t('visitRequests.form.chooseLevel')} items={cycles.map(cycle => ({ value: cycle.id, label: cycle.labels?.[language] || cycle.name }))} />}
      <FormInput name="email" type="text" formLabel={t('visitRequests.form.email')} maxLength={254} />
    </div>
    <FormInput name="message" type="textarea" formLabel={t('visitRequests.form.message')} maxLength={1000} />
    <div className="landing-honeypot" aria-hidden="true"><FormInput name="website" type="text" formLabel={t('visitRequests.form.website')} tabIndex={-1} autoComplete="off" /></div>
    {error && <p id="visit-request-error" role="alert" className="landing-form-error">{error}</p>}
    <button type="submit" disabled={pending} className="landing-button" aria-describedby={error ? 'visit-request-error' : undefined}>{t(pending ? 'visitRequests.form.sending' : 'visitRequests.form.send')}</button>
  </NForm>;
}
