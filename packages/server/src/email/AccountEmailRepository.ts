import { desc, sql } from 'drizzle-orm';
import type { EmailMessage } from 'najm-email';
import { DB } from '../database/db';
import { settings, users } from '../database/schema';
import { Repository } from '../najm';
import { ACCOUNT_EMAIL_APP_NAME } from './accountEmailBrand';

/** Installation branding and the recipient's name, read when the message leaves. */
@Repository()
export class AccountEmailRepository {
  declare db: DB;

  async getContext(to: EmailMessage['to']) {
    const recipient = Array.isArray(to) ? to[0] : to;
    const email = typeof recipient === 'string' ? recipient : recipient?.email;
    const [school, account] = await Promise.all([
      this.db.select({ name: settings.schoolName }).from(settings).orderBy(desc(settings.createdAt)).limit(1),
      email
        ? this.db.select({ name: users.name }).from(users)
          .where(sql`lower(${users.email}) = ${email.trim().toLowerCase()}`).limit(1)
        : Promise.resolve([]),
    ]);
    return {
      appName: school[0]?.name?.trim() || ACCOUNT_EMAIL_APP_NAME,
      userName: account[0]?.name?.trim() || (typeof recipient === 'object' && recipient?.name) || email || '',
    };
  }
}
