import { PrismaClient } from '@prisma/client';
import { generateAgencyUid, isVvisaUid } from '../../src/lib/uid.ts';

const db = new PrismaClient();

async function migrateAgencyUids() {
  console.log('====================================================');
  console.log('      V-VISA PARTNER UID MIGRATION (CUID -> VVA)     ');
  console.log('====================================================\n');

  const agencies = await db.agency.findMany({
    select: {
      id: true,
      name: true,
      email: true,
      vvisaUid: true,
      zohoRecordId: true,
    },
    orderBy: { createdAt: 'asc' },
  });

  console.log(`Found ${agencies.length} total agencies in database.`);

  const needsMigration = agencies.filter((a) => !a.vvisaUid || !isVvisaUid(a.vvisaUid));
  console.log(`Agencies requiring UID assignment/migration: ${needsMigration.length}\n`);

  if (needsMigration.length === 0) {
    console.log('✓ All agencies already have valid VVA UIDs. Nothing to migrate.');
    for (const a of agencies) {
      console.log(`  - ${a.name} (${a.email}): ${a.vvisaUid}`);
    }
    return;
  }

  let migratedCount = 0;
  for (const agency of needsMigration) {
    let newUid = generateAgencyUid();
    // Ensure uniqueness
    let exists = await db.agency.findUnique({ where: { vvisaUid: newUid } });
    while (exists) {
      newUid = generateAgencyUid();
      exists = await db.agency.findUnique({ where: { vvisaUid: newUid } });
    }

    await db.agency.update({
      where: { id: agency.id },
      data: { vvisaUid: newUid },
    });

    console.log(`Migrated: "${agency.name}" (${agency.email})`);
    console.log(`  Old ID / CUID: ${agency.id}`);
    console.log(`  New Permanent UID: ${newUid}`);
    console.log(`  Zoho Record ID: ${agency.zohoRecordId ?? 'None'}`);

    // Queue outbox sync so Zoho Travel Agents receives the new UID
    try {
      await db.integrationEvent.create({
        data: {
          provider: 'ZOHO_CRM',
          agencyId: agency.id,
          eventType: 'TRAVEL_AGENT_UPSERT',
          entityType: 'Agency',
          entityId: agency.id,
          aggregateId: agency.id,
          idempotencyKey: `travel-agent:uid-migration:${agency.id}:${newUid}`,
          payload: {
            agencyId: agency.id,
            vvisaUid: newUid,
            agencyName: agency.name,
            email: agency.email,
            existingZohoRecordId: agency.zohoRecordId,
          },
        },
      });
      console.log(`  -> Queued IntegrationEvent for Zoho Travel Agent update.`);
    } catch (queueErr) {
      console.warn(`  -> Could not queue CRM sync:`, queueErr);
    }
    console.log('');
    migratedCount++;
  }

  console.log(`====================================================`);
  console.log(`✓ Migration Complete: ${migratedCount} agencies assigned VVA UIDs.`);
  console.log(`====================================================\n`);
}

migrateAgencyUids()
  .catch((err) => {
    console.error('Migration failed with error:', err);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
    process.exit(0);
  });
