// create-admin.js
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

async function main() {
  const email = "admin@exchange.com";
  const plainPassword = "AdminPassword123!"; // You can change this if you want
  const hashedPassword = await bcrypt.hash(plainPassword, 10);

  try {
    const admin = await prisma.user.upsert({
      where: { email: email },
      update: { 
        passwordHash: hashedPassword,
        role: "ADMIN",
        kycVerified: true
      },
      create: {
        id: "admin_001",
        email: email,
        passwordHash: hashedPassword,
        role: "ADMIN",
        kycVerified: true
      }
    });
    console.log("✅ Admin account created/updated successfully!");
    console.log(`Email: ${email}`);
    console.log(`Password: ${plainPassword}`);
  } catch (error) {
    console.error("Error creating admin:", error);
  } finally {
    await prisma.$disconnect();
  }
}

main();