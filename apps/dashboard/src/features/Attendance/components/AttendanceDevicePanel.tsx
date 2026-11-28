'use client';

import { useMemo } from 'react';
import { Fingerprint } from 'lucide-react';
import { ComboboxInput, NBadge, NEmptyState, NErrorState, NSkeleton } from 'najm-kit';
import { useTranslation } from 'najm-i18n/react';
import { useSchoolFormat } from '@/hooks/useSchoolFormat';
import { useStaff } from '@/features/Staff/hooks/useStaff';
import { useAttendanceDevices, useLinkDeviceUser } from '../hooks/useAttendanceDevices';

const NOT_LINKED = '';

/**
 * The fingerprint terminals that push scans to School, and which device PIN
 * belongs to which staff member. A PIN no one holds is listed first: its scans
 * are kept and counted as soon as it is linked.
 */
export default function AttendanceDevicePanel({ canEdit }: { canEdit: boolean }) {
  const { t } = useTranslation();
  const { displayDateOnly, displayDateTime } = useSchoolFormat();
  // A scan's time is the school's wall clock as the device sent it, with no
  // zone: its date is formatted as a calendar day and its time kept as is.
  const scanTime = (punchedAt: string) => `${displayDateOnly(punchedAt.slice(0, 10))} ${punchedAt.slice(11, 16)}`;
  const { devices, waiting, people, isLoading, error } = useAttendanceDevices();
  const { staff } = useStaff();
  const link = useLinkDeviceUser();

  const staffItems = useMemo(() => [
    { value: NOT_LINKED, label: t('attendanceDevices.people.notLinked') },
    ...(staff ?? [])
      .filter((person: any) => person.status !== 'inactive' && person.status !== 'terminated')
      .map((person: any) => ({ value: person.id, label: person.name })),
  ], [staff, t]);

  if (error) return <NErrorState surface="panel" />;
  if (isLoading) {
    return (
      <div className="flex flex-col gap-2">
        <NSkeleton className="h-14 w-full" />
        <NSkeleton className="h-40 w-full" />
      </div>
    );
  }

  const unlinked = people.filter((person) => !person.staffId).length;

  return (
    <div className="flex flex-col gap-4">
      <section className="flex flex-col gap-2">
        <h3 className="text-sm font-semibold">{t('attendanceDevices.devices.title')}</h3>
        {devices.length === 0 && waiting.length === 0 && (
          <p className="rounded-md border border-dashed p-3 text-sm text-muted-foreground">
            {t('attendanceDevices.devices.noneConfigured')}
          </p>
        )}
        {devices.map((device) => {
          const { online } = device;
          return (
            <div key={device.id} className="flex flex-wrap items-center justify-between gap-2 rounded-md border px-3 py-2">
              <div className="flex items-center gap-2">
                <Fingerprint className="h-4 w-4 text-muted-foreground" aria-hidden />
                <span className="font-mono text-sm">{device.serialNumber}</span>
                <NBadge color={online ? 'success' : 'neutral'} label={t(online ? 'attendanceDevices.devices.online' : 'attendanceDevices.devices.offline')} />
              </div>
              <div className="text-xs text-muted-foreground">
                {device.lastPunchAt
                  ? t('attendanceDevices.devices.lastScan', { time: scanTime(device.lastPunchAt) })
                  : t('attendanceDevices.devices.noScanYet')}
                {device.lastSeenAt && <> · {t('attendanceDevices.devices.lastContact', { time: displayDateTime(device.lastSeenAt) })}</>}
              </div>
            </div>
          );
        })}
        {waiting.map((serial) => (
          <div key={serial} className="flex items-center gap-2 rounded-md border border-dashed px-3 py-2 text-sm">
            <Fingerprint className="h-4 w-4 text-muted-foreground" aria-hidden />
            <span className="font-mono">{serial}</span>
            <span className="text-muted-foreground">{t('attendanceDevices.devices.waiting')}</span>
          </div>
        ))}
      </section>

      <section className="flex flex-col gap-2">
        <div className="flex items-baseline justify-between gap-2">
          <h3 className="text-sm font-semibold">{t('attendanceDevices.people.title')}</h3>
          {unlinked > 0 && <span className="text-xs text-amber-700">{t('attendanceDevices.people.unlinkedCount', { count: unlinked })}</span>}
        </div>
        <p className="text-xs text-muted-foreground">{t('attendanceDevices.people.help')}</p>
        {people.length === 0
          ? (
            <NEmptyState
              surface="panel"
              icon={Fingerprint}
              title={t('attendanceDevices.people.emptyTitle')}
              description={t('attendanceDevices.people.emptyDescription')}
            />
          )
          : (
            <div className="divide-y rounded-md border">
              {people.map((person) => (
                <div key={person.deviceUserId} className="grid grid-cols-1 items-center gap-2 px-3 py-2 sm:grid-cols-[5rem_1fr_16rem]">
                  <div className="font-mono text-sm">#{person.deviceUserId}</div>
                  <div className="min-w-0 text-sm">
                    <div className="truncate">{person.deviceName || <span className="text-muted-foreground">{t('attendanceDevices.people.noDeviceName')}</span>}</div>
                    <div className="text-xs text-muted-foreground">
                      {person.staffId && (
                        <span className="me-1 font-medium text-foreground/80">
                          {t(person.staffCompensationMode === 'hourly' ? 'attendanceDevices.people.ruleVacataire' : 'attendanceDevices.people.rulePermanent')} ·
                        </span>
                      )}
                      {person.lastPunchAt
                        ? t('attendanceDevices.people.scans', { count: person.punchCount, time: scanTime(person.lastPunchAt) })
                        : t('attendanceDevices.people.noScans')}
                    </div>
                  </div>
                  <ComboboxInput
                    ariaLabel={t('attendanceDevices.people.staffFor', { id: person.deviceUserId })}
                    placeholder={t('attendanceDevices.people.chooseStaff')}
                    items={staffItems}
                    value={person.staffId ?? NOT_LINKED}
                    disabled={!canEdit || link.isPending}
                    onChange={(value: string) => {
                      const staffId = value || null;
                      if (staffId === (person.staffId ?? null)) return;
                      link.mutate({ deviceUserId: person.deviceUserId, staffId });
                    }}
                    showIcon={false}
                    className="w-full"
                  />
                </div>
              ))}
            </div>
          )}
      </section>
    </div>
  );
}
