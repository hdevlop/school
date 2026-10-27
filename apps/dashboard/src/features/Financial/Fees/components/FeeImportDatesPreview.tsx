import type { FinancialImportDatePreview } from '@sms/contracts';
import { useTranslation } from 'najm-i18n/react';

export function FeeImportDatesPreview({ changes }: { changes: FinancialImportDatePreview[] }) {
  const { t } = useTranslation();
  const dates = (before: string, after: string) => before === after ? after : <>
    <span className="block text-muted-foreground line-through">{before}</span>
    <span>{after}</span>
  </>;
  return <div className="max-h-72 overflow-auto rounded-lg border">
    <table className="w-full text-start text-sm">
      <thead className="sticky top-0 bg-muted">
        <tr><th className="p-3 text-start">{t('fees.import.student')}</th>
          <th className="p-3 text-start">{t('students.form.enrollmentDate')}</th>
          <th className="p-3 text-start">{t('fees.import.yearStart')}</th></tr>
      </thead>
      <tbody>{changes.map(change => <tr key={change.studentId} className="border-t">
        <td className="p-3">{change.name}<span className="block text-xs text-muted-foreground">{change.studentCode}</span></td>
        <td className="p-3 whitespace-nowrap">{dates(change.correction.expectedAdmissionDate, change.admissionDate)}</td>
        <td className="p-3 whitespace-nowrap">{dates(change.correction.expected.enrolledOn, change.yearEnrolledOn)}</td>
      </tr>)}</tbody>
    </table>
  </div>;
}
