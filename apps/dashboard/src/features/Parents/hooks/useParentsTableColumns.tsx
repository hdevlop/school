import { useMemo } from 'react';
import { NAvatar, NBadge, SimpleTooltip } from 'najm-kit';
import { useTranslation } from 'najm-i18n/react';
import { personAvatarClassNames } from '@/lib/avatar';

export const useParentsTableColumns = () => {
  const { t } = useTranslation();
  const orphanMessage = t('parents.tooltips.orphaned');

  return useMemo(() => [
    {
      accessorKey: "name",
      header: t('parents.table.name'),
      cell: ({ row }) => {
        const parent = row.original;
        const isOrphaned = parent.isOrphaned === true || Number(parent.totalChildren) === 0;
        const avatar = (
          <NAvatar
            src={parent?.image}
            title={parent.name}
            size='sm'
            version={parent?.updatedAt}
            className={isOrphaned ? 'opacity-70 grayscale' : undefined}
            classNames={personAvatarClassNames}
          />
        );

        if (!isOrphaned) return avatar;

        return (
          <SimpleTooltip content={orphanMessage} side="top">
            {avatar}
          </SimpleTooltip>
        );
      },
      enableSorting: true,
    },
    {
      accessorKey: 'email',
      header: t('parents.table.email'),
      enableSorting: false,
      cell: ({ getValue }) => {
        const email = getValue();
        return email || <span className="text-gray-400">{t('common.notAvailable')}</span>;
      },
    },
    {
      accessorKey: 'phone',
      header: t('parents.table.phone'),
      enableSorting: false,
      cell: ({ getValue }) => {
        const phone = getValue();
        return phone || <span className="text-gray-400">{t('common.notAvailable')}</span>;
      },
    },
    {
      accessorKey: "relationshipType",
      header: t('parents.table.relationship'),
      enableSorting: true,
      enableColumnFilter: true,
      cell: ({ getValue }) => {
        const relationship = getValue();
        if (!relationship) {
          return <span className="text-gray-400">{t('common.notSpecified')}</span>;
        }

        return (
          <NBadge look="dash" >
            {t(`parents.relationships.${relationship}`)}
          </NBadge>
        );
      },
    },
    {
      accessorKey: "gender",
      header: t('parents.table.gender'),
      enableSorting: true,
      cell: ({ getValue }) => {
        const gender = getValue();
        if (!gender) return <span className="text-gray-400">{t('common.notSpecified')}</span>;
        return gender === 'M' ? t('common.male') : gender === 'F' ? t('common.female') : gender;
      },
    },
    {
      accessorKey: "cin",
      header: t('parents.table.cin'),
      enableSorting: false,
      cell: ({ getValue }) => {
        const cin = getValue();
        return cin || <span className="text-gray-400">{t('common.notAvailable')}</span>;
      },
    },
    {
      accessorKey: "occupation",
      header: t('parents.table.occupation'),
      enableSorting: false,
      cell: ({ getValue }) => {
        const occupation = getValue();
        return occupation || <span className="text-gray-400">{t('common.notAvailable')}</span>;
      },
    },
  ], [t, orphanMessage]);
};
