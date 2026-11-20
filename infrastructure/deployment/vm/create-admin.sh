#!/usr/bin/env bash
# =============================================================================
# Create (or reset) ONE admin-panel account on the dev VM. No demo data is seeded
# by this kit, so this is how the first SUPER_ADMIN is made.
#
# Run ON THE VM as the app user, after the first deploy:
#   bash /opt/astro-sushil/app/create-admin.sh            # asks for e-mail + password
#   ADMIN_ROLE=SUPPORT bash /opt/astro-sushil/app/create-admin.sh
#
# The password is read without echo and handed to Node through the
# environment (never on the command line, never logged). It is stored as a
# bcrypt hash, like apps/api/src/utils/hash.ts does.
# =============================================================================
set -euo pipefail

APP_DIR="${APP_DIR:-/opt/astro-sushil/app}"
ADMIN_ROLE="${ADMIN_ROLE:-SUPER_ADMIN}"
case "$ADMIN_ROLE" in SUPER_ADMIN|ADMIN|SUPPORT) ;; *) echo "ADMIN_ROLE must be SUPER_ADMIN, ADMIN or SUPPORT" >&2; exit 1 ;; esac
[ -d "$APP_DIR/node_modules/@prisma/client" ] || { echo "Run deploy.sh first ($APP_DIR/node_modules missing)." >&2; exit 1; }

read -rp "Admin e-mail: " email
read -rsp "Password (min 12 characters): " pass1; echo
read -rsp "Repeat password: " pass2; echo
[ "$pass1" = "$pass2" ] || { echo "Passwords do not match." >&2; exit 1; }
[ "${#pass1}" -ge 12 ] || { echo "Password too short." >&2; exit 1; }

cd "$APP_DIR/apps/api"
ADMIN_EMAIL="$email" ADMIN_PASSWORD="$pass1" ADMIN_ROLE="$ADMIN_ROLE" node - <<'JS'
require('dotenv').config({ path: '.env' });
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

(async () => {
  const prisma = new PrismaClient();
  const email = process.env.ADMIN_EMAIL.toLowerCase().trim();
  const role = process.env.ADMIN_ROLE;
  const passwordHash = await bcrypt.hash(process.env.ADMIN_PASSWORD, 12);
  const user = await prisma.user.upsert({
    where: { email },
    create: { email, role, passwordHash, emailVerifiedAt: new Date(), fullName: 'Administrator' },
    update: { role, passwordHash },
    select: { id: true, email: true, role: true },
  });
  console.log(`Admin account ready: ${user.email} (${user.role})`);
  await prisma.$disconnect();
})().catch((err) => {
  console.error('Failed:', err.message);
  process.exit(1);
});
JS
