type Identity = { email?: string | null; phone?: string | null };

/**
 * What a person's login is reached by: the email, or the phone when there is
 * no email. A record with neither stays without a login; najm-auth still
 * refuses an account without an identity.
 *
 * The phone stays off an account that has an email. `users.phone` is unique
 * across every account and families share numbers, so a student given a
 * parent's phone would otherwise be refused for no reason the form can show.
 */
export function loginIdentity({ email, phone }: Identity) {
  const address = email?.trim() || null;
  return { email: address, phone: address ? null : phone?.trim() || null };
}

/**
 * The same rule for an edit. Only an edit that names the email or the phone
 * touches the login; the one it leaves out is read from the stored record.
 */
export function loginIdentityUpdate(data: Identity, stored: Identity) {
  if (data.email === undefined && data.phone === undefined) return {};
  return loginIdentity({
    email: data.email !== undefined ? data.email : stored.email,
    phone: data.phone !== undefined ? data.phone : stored.phone,
  });
}
