import { createProduct } from "@/app/actions/products";
import { createClient } from "@/lib/supabase/server";

type CrmProduct = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  product_type: string;
  status: string;
  website_url: string | null;
  created_at: string;
  updated_at: string;
};

export async function ProductsSection() {
  const supabase = await createClient();

  const { data: products, error } = await supabase.rpc(
    "list_crm_products"
  );

  if (error) {
    throw new Error(
      `Kunne ikke hente produkter: ${error.message}`
    );
  }

  const crmProducts = (products ?? []) as CrmProduct[];

  return (
    <section>
      <hr />

      <h2>Produkter</h2>

      <p>
        Produkter: <strong>{crmProducts.length}</strong>
      </p>

      <h3>Opret produkt</h3>

      <form action={createProduct}>
        <div>
          <label htmlFor="product_name">Navn</label>
          <input
            id="product_name"
            name="name"
            required
          />
        </div>

        <div>
          <label htmlFor="product_slug">Slug</label>
          <input
            id="product_slug"
            name="slug"
            placeholder="favn360"
            pattern="[a-z0-9]+(?:-[a-z0-9]+)*"
            required
          />
        </div>

        <div>
          <label htmlFor="product_description">
            Beskrivelse
          </label>
          <textarea
            id="product_description"
            name="description"
          />
        </div>

        <div>
          <label htmlFor="product_type">
            Produkttype
          </label>

          <select
            id="product_type"
            name="product_type"
            defaultValue="software"
          >
            <option value="software">Software</option>
            <option value="service">Service</option>
            <option value="platform">Platform</option>
            <option value="other">Andet</option>
          </select>
        </div>

        <div>
          <label htmlFor="product_status">
            Status
          </label>

          <select
            id="product_status"
            name="status"
            defaultValue="active"
          >
            <option value="draft">Kladde</option>
            <option value="active">Aktiv</option>
            <option value="inactive">Inaktiv</option>
          </select>
        </div>

        <div>
          <label htmlFor="product_website_url">
            Website
          </label>

          <input
            id="product_website_url"
            name="website_url"
            type="url"
            placeholder="https://favn360.dk"
          />
        </div>

        <button type="submit">
          Opret produkt
        </button>
      </form>

      <h3>Produktkatalog</h3>

      {crmProducts.length > 0 ? (
        <ul>
          {crmProducts.map((product) => (
            <li key={product.id}>
              <strong>{product.name}</strong>
              {" — "}
              {product.product_type}
              {" — "}
              {product.status}
              {" — "}
              <code>{product.slug}</code>

              {product.description && (
                <> — {product.description}</>
              )}

              {product.website_url && (
                <> — {product.website_url}</>
              )}
            </li>
          ))}
        </ul>
      ) : (
        <p>Ingen produkter oprettet endnu.</p>
      )}
    </section>
  );
}
