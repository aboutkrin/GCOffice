import { prisma } from "@/lib/prisma";
import { serialize } from "@/lib/utils";

const EMPTY_SHOP_INFO = {
  address: "",
  logoUrl: "",
  phone: "",
  lineOa: "",
  instagram: "",
  facebook: "",
  tiktok: "",
};

/** The single shared shop-info row shown on the "print delivery note" page. */
export async function getPrintOrderSettings() {
  try {
    const data = await prisma.printOrderSettings.findUnique({
      where: { id: "default" },
    });
    if (!data) return EMPTY_SHOP_INFO;
    return serialize({
      address: data.address ?? "",
      logoUrl: data.logoUrl ?? "",
      phone: data.phone ?? "",
      lineOa: data.lineOa ?? "",
      instagram: data.instagram ?? "",
      facebook: data.facebook ?? "",
      tiktok: data.tiktok ?? "",
    });
  } catch {
    return EMPTY_SHOP_INFO;
  }
}
