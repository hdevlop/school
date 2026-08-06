#!/usr/bin/env bun

import { db } from '@server/database/db';
import { staffRoles } from '@server/database/schema';

const ROLES = [
  { code: 'teacher',      label: 'Teacher',         labels: { fr: 'Enseignant', ar: 'أستاذ', es: 'Profesor' },                       category: 'teaching',       sortOrder: 10, isSystem: true  },
  { code: 'driver',       label: 'Driver',          labels: { fr: 'Chauffeur', ar: 'سائق', es: 'Conductor' },                         category: 'transport',      sortOrder: 20, isSystem: true  },
  { code: 'busAssistant', label: 'Bus Assistant',   labels: { fr: 'Assistant de bus', ar: 'مساعد الحافلة', es: 'Auxiliar de bus' },      category: 'transport',      sortOrder: 21, isSystem: false },
  { code: 'principal',    label: 'Principal',       labels: { fr: 'Directeur', ar: 'مدير', es: 'Director' },                          category: 'administration', sortOrder: 30, isSystem: false },
  { code: 'secretary',    label: 'Secretary',       labels: { fr: 'Secrétaire', ar: 'سكرتير', es: 'Secretario' },                     category: 'administration', sortOrder: 31, isSystem: false },
  { code: 'receptionist', label: 'Receptionist',    labels: { fr: 'Réceptionniste', ar: 'موظف الاستقبال', es: 'Recepcionista' },      category: 'administration', sortOrder: 32, isSystem: false },
  { code: 'accountant',   label: 'Accountant',      labels: { fr: 'Comptable', ar: 'محاسب', es: 'Contable' },                         category: 'administration', sortOrder: 33, isSystem: false },
  { code: 'librarian',    label: 'Librarian',       labels: { fr: 'Bibliothécaire', ar: 'أمين المكتبة', es: 'Bibliotecario' },         category: 'support',        sortOrder: 40, isSystem: false },
  { code: 'itSupport',    label: 'IT Support',      labels: { fr: 'Support informatique', ar: 'دعم تقني', es: 'Soporte informático' }, category: 'support',        sortOrder: 41, isSystem: false },
  { code: 'assistant',    label: 'Assistant',       labels: { fr: 'Assistant', ar: 'مساعد', es: 'Asistente' },                        category: 'support',        sortOrder: 42, isSystem: false },
  { code: 'cleaner',      label: 'Cleaner',         labels: { fr: "Agent d'entretien", ar: 'عامل النظافة', es: 'Personal de limpieza' }, category: 'operations',  sortOrder: 50, isSystem: false },
  { code: 'security',     label: 'Security',        labels: { fr: 'Agent de sécurité', ar: 'حارس الأمن', es: 'Seguridad' },           category: 'operations',     sortOrder: 51, isSystem: false },
  { code: 'other',        label: 'Other',           labels: { fr: 'Autre', ar: 'آخر', es: 'Otro' },                                   category: 'support',        sortOrder: 99, isSystem: false },
];

async function main() {
  console.log('🌱 Seeding staff_roles (idempotent upsert)...');

  for (const role of ROLES) {
    await db
      .insert(staffRoles)
      .values({
        code: role.code,
        label: role.label,
        labels: role.labels,
        category: role.category,
        sortOrder: role.sortOrder,
        isSystem: role.isSystem,
        active: true,
      })
      .onConflictDoUpdate({
        target: staffRoles.code,
        set: {
          label: role.label,
          labels: role.labels,
          category: role.category,
          sortOrder: role.sortOrder,
          isSystem: role.isSystem,
          active: true,
        },
      });
  }

  console.log(`✅ Upserted ${ROLES.length} staff role(s)`);
  console.log('\n✨ Staff roles seed completed.');
  process.exit(0);
}

main().catch((error) => {
  console.error('\n❌ Staff roles seed failed:', error);
  process.exit(1);
});
