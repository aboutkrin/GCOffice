// Clears stock movement history and zeroes stock quantities ahead of a
// full warehouse recount. Product/variant catalog rows are untouched.
// Usage: npm run reset-stock
import { prisma } from "../src/lib/prisma.ts";

async function main() {
  const result = await prisma.$transaction(async (tx) => {
    const deletedMovements = await tx.stockMovement.deleteMany({});
    const updatedVariants = await tx.productColorVariant.updateMany({
      data: { stockQuantity: 0 },
    });
    const updatedProducts = await tx.product.updateMany({
      data: { stockQuantity: 0 },
    });

    return { deletedMovements, updatedVariants, updatedProducts };
  });

  console.log(`Deleted ${result.deletedMovements.count} stock movements`);
  console.log(`Reset ${result.updatedVariants.count} color variants to 0`);
  console.log(`Reset ${result.updatedProducts.count} products to 0`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
