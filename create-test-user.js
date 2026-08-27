// create-test-user.js
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

async function main() {
  const email = "customer@test.com";
  const plainPassword = "Customer123!";
  const hashedPassword = await bcrypt.hash(plainPassword, 10);

  try {
    const user = await prisma.user.upsert({
      where: { email: email },
      update: { 
        passwordHash: hashedPassword,
        role: "USER",
        kycVerified: true
      },
      create: {
        id: "customer_001", // Fixed ID for easy testing
        email: email,
        passwordHash: hashedPassword,
        role: "USER",
        kycVerified: true
      }
    });
    console.log("✅ Test customer created successfully!");
    console.log(`Email: ${email}`);
    console.log(`Password: ${plainPassword}`);
  } catch (error) {
    console.error("Error:", error);
  } finally {
    await prisma.$disconnect();
  }
}

main();