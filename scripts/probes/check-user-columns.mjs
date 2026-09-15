import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const cols = await prisma.$queryRawUnsafe(`
    SELECT column_name, data_type, is_nullable 
    FROM information_schema.columns 
    WHERE table_name = 'User'
    ORDER BY ordinal_position;
  `);
  console.log('User columns in current DB:');
  console.table(cols);

  try {
    const user = await prisma.user.findFirst({
      select: {
        id: true,
        email: true,
        aadhaarNumber: true,
        aadhaarName: true,
        aadhaarAddress: true,
      }
    });
    console.log('Successfully executed prisma.user.findFirst with aadhaar fields! Result:', user);
  } catch (err) {
    console.error('prisma.user.findFirst failed:', err);
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
