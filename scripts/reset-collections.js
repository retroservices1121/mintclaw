const { PrismaClient } = require('@prisma/client');

async function main() {
  const prisma = new PrismaClient();

  try {
    // Delete all collections
    const deleted = await prisma.collection.deleteMany({});
    console.log(`Deleted ${deleted.count} collections`);

    // Also clear used payment transactions
    const deletedTx = await prisma.usedPaymentTx.deleteMany({});
    console.log(`Deleted ${deletedTx.count} used payment transactions`);

    console.log('Database reset complete!');
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
