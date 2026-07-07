// One-time cleanup: re-normalizes every existing Provider row through the
// same logic new writes go through (see src/common/utils/provider-name.util.ts),
// so any title baked into firstName/lastName before that normalization
// existed gets pulled out, and any doubled title ("Dr. Dr.") collapses.
//
// Safe to re-run: only rows whose normalized values differ from what's
// stored get updated, and normalizing already-clean data is a no-op.
//
// Usage:
//   ts-node scripts/cleanup-provider-titles.ts            # dry run, prints planned changes
//   ts-node scripts/cleanup-provider-titles.ts --apply     # actually writes the changes

import { PrismaClient } from '@prisma/client';
import { normalizeProviderName } from '../src/common/utils/provider-name.util';

const prisma = new PrismaClient();

async function main() {
  const apply = process.argv.includes('--apply');
  console.log(apply ? 'Running in APPLY mode — rows will be updated.' : 'Running in DRY-RUN mode — no writes will happen. Pass --apply to write.');

  const providers = await prisma.provider.findMany({
    select: { id: true, firstName: true, lastName: true, title: true },
  });

  let changed = 0;

  for (const provider of providers) {
    const normalized = normalizeProviderName(provider.firstName, provider.lastName, provider.title);
    const isDifferent =
      normalized.firstName !== provider.firstName ||
      normalized.lastName !== provider.lastName ||
      normalized.title !== provider.title;

    if (!isDifferent) continue;

    changed++;
    console.log(
      `Provider ${provider.id}: ` +
        `"${provider.title}" "${provider.firstName}" "${provider.lastName}" -> ` +
        `"${normalized.title}" "${normalized.firstName}" "${normalized.lastName}"`,
    );

    if (apply) {
      await prisma.provider.update({
        where: { id: provider.id },
        data: {
          firstName: normalized.firstName,
          lastName: normalized.lastName,
          title: normalized.title,
        },
      });
    }
  }

  console.log(`\n${changed} of ${providers.length} provider row(s) ${apply ? 'updated' : 'would be updated'}.`);
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
