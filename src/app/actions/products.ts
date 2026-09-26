"use server";

import { revalidatePath } from "next/cache";
import { requireStaff } from "@/lib/auth/require-staff";
import { createClient } from "@/lib/supabase/server";

export async function createProduct(formData: FormData) {
  await requireStaff();

  const name = String(formData.get("name") ?? "");
  const slug = String(formData.get("slug") ?? "");
  const description = String(formData.get("description") ?? "");
  const productType = String(
    formData.get("product_type") ?? "software"
  );
  const status = String(
    formData.get("status") ?? "active"
  );
  const websiteUrl = String(
    formData.get("website_url") ?? ""
  );

  const supabase = await createClient();

  const { error } = await supabase.rpc(
    "create_crm_product",
    {
      product_name: name,
      product_slug: slug,
      product_description: description || null,
      product_type_value: productType,
      product_status: status,
      product_website_url: websiteUrl || null,
    }
  );

  if (error) {
    throw new Error(
      `Kunne ikke oprette produkt: ${error.message}`
    );
  }

  revalidatePath("/");
}
