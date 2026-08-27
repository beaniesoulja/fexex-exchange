// create-admin.js
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

async function main() {
  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const plainPassword = process.env.ADMIN_PASSWORD;

  if (!email || !plainPassword) {
    throw new Error("ADMIN_EMAIL and ADMIN_PASSWORD must be set.");
  }

  if (plainPassword.length < 10) {
    throw new Error("ADMIN_PASSWORD must be at least 10 characters long.");
  }

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
        email: email,
        passwordHash: hashedPassword,
        role: "ADMIN",
        kycVerified: true
      }
    });
    console.log("Admin account created or updated successfully.");
  } catch (error) {
    console.error("Error creating admin:", error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
