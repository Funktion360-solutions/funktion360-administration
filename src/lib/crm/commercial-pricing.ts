export type CommercialPriceComponent = {
  product_plan_id: string;
  price_type: string;
  amount: number | null;
  currency: string;
  billing_interval: string | null;
  valid_from: string;
  valid_until: string | null;
  status: string;
};

export type CommercialPricingTerm = {
  pricing_mode: string;
  billing_interval: string;
  currency: string;
  discount_percentage: number | null;
  discount_amount: number | null;
  fixed_amount: number | null;
};

export function getActivePlanPrices<
  T extends CommercialPriceComponent,
>(
  prices: T[],
  productPlanId: string
): T[] {
  const now = new Date();

  return prices.filter((price) => {
    if (price.product_plan_id !== productPlanId) {
      return false;
    }

    if (price.status !== "active") {
      return false;
    }

    if (new Date(price.valid_from) > now) {
      return false;
    }

    if (
      price.valid_until &&
      new Date(price.valid_until) <= now
    ) {
      return false;
    }

    return true;
  });
}

export function calculateEntitlementPrice<
  T extends CommercialPriceComponent,
>(
  prices: T[],
  productPlanId: string,
  seatQuantity: number | null,
  interval: "month" | "year"
) {
  const activePrices = getActivePlanPrices(
    prices,
    productPlanId
  ).filter(
    (price) => price.billing_interval === interval
  );

  const basePrice =
    activePrices.find(
      (price) => price.price_type === "base"
    )?.amount ?? 0;

  const perUserPrice =
    activePrices.find(
      (price) => price.price_type === "per_user"
    )?.amount ?? 0;

  const seats = seatQuantity ?? 0;

  const total =
    Number(basePrice) +
    seats * Number(perUserPrice);

  const currency =
    activePrices.find((price) => price.currency)?.currency ??
    "DKK";

  return {
    basePrice: Number(basePrice),
    perUserPrice: Number(perUserPrice),
    seats,
    total,
    currency,
    hasPricing: activePrices.length > 0,
  };
}

export function calculateAgreedPrice(
  catalogTotal: number,
  term: CommercialPricingTerm
): number | null {
  switch (term.pricing_mode) {
    case "catalog":
      return catalogTotal;

    case "discount_percentage":
      if (term.discount_percentage === null) {
        return null;
      }

      return (
        catalogTotal *
        (1 - Number(term.discount_percentage) / 100)
      );

    case "discount_amount":
      if (term.discount_amount === null) {
        return null;
      }

      return Math.max(
        0,
        catalogTotal - Number(term.discount_amount)
      );

    case "fixed_price":
      if (term.fixed_amount === null) {
        return null;
      }

      return Number(term.fixed_amount);

    case "custom":
      return null;

    default:
      return null;
  }
}

export function formatMoney(
  amount: number,
  currency: string
): string {
  return new Intl.NumberFormat("da-DK", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(amount);
}
