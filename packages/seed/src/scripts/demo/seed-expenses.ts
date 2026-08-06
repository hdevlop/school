#!/usr/bin/env bun

import { ExpenseService } from '@server/modules/seed';
import { runSeedTask } from '../shared/run-seed';
import expensesData from './data/expenses.json';

runSeedTask('expenses seed', async (server) => {
  const expenseService = await server.container.resolve(ExpenseService);

  console.log('🌱 Starting expenses seeding...');

  const created = await expenseService.seedDemoExpenses(expensesData);
  console.log(`✅ Expenses seeded (${created.length} records)`);

  console.log('\n✨ Expenses seed completed successfully!');
});
