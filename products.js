// KABISATNT Product Catalog — Price List 2026
// All prices in Trinidad & Tobago Dollars (TTD).

const products = {
  vapes: [
    {
      name: "Revel Vape Disposable (1,000 Puffs)",
      size: "1,000 puffs",
      price: 45.0,
      srp: 55.0,
      description: "5% NicSalt, 500mAh — Grape Ice, Blue Razz Ice. SRP $55",
    },
    {
      name: "Revel Vape Disposable (15,000 Puffs)",
      size: "15,000 puffs",
      price: 85.0,
      srp: "90.00–100.00",
      description: "5% Nicotine, 15k puffs (7.5k pulse mode). SRP $90–100",
    },
  ],

  beers: [
    {
      name: "Bia Saigon Special Beer",
      size: "case of 24 x 330ml",
      price: 340.0,
      case_qty: 24,
      unit_size: "330ml",
      description: "100% Spring Barley. Sold by the case (24 bottles/cans)",
    },
  ],

  // Non-alcoholic energy & soft drinks (Kabisa line)
  drinks: [
    {
      name: "Kabisa Guarana & Magnesium Energy Drink",
      size: "case of 24 x 250ml",
      price: 130.0,
      case_qty: 24,
      description: "Clean energy formula. Sold by the case",
    },
    {
      name: "Kabisa Pure Energy Drink (Zero Sugar)",
      size: "case of 24 x 250ml",
      price: 130.0,
      case_qty: 24,
      description: "Zero sugar, cooling effect. Sold by the case",
    },
    {
      name: "Kabisa Spicy Ginger & Lemon Soft Drink",
      size: "case of 24 x 250ml",
      price: 130.0,
      case_qty: 24,
      description: "Sparkling soft drink. Sold by the case",
    },
    {
      name: "Kabisa Real Energy Drink (100% Energy)",
      size: "case of 24 x 250ml",
      price: 110.0,
      case_qty: 24,
      description: "Original energy blend. Sold by the case",
    },
  ],

  cigarettes: [
    {
      name: "Revel Cigarettes (Gold)",
      pack: "carton",
      price: 160.0,
      description: "20 filtered cigarettes per pack, Virginia Blend. Priced per carton",
    },
    {
      name: "Revel Cigarettes (Green / Menthol)",
      pack: "carton",
      price: 170.0,
      description: "20 filtered menthol cigarettes per pack. Priced per carton",
    },
  ],

  cigars: [
    {
      name: "Good Times Extra Slow Burn Blunt",
      size: "per cigar",
      price: 12.0,
      box_price: 180.0,
      box_qty: 15,
      description: "Sweet & Grape flavors. Box of 15: $180",
    },
    {
      name: "Good Times Sweet Cigarillos",
      size: "per cigarillo",
      price: 7.0,
      box_price: 420.0,
      box_qty: 60,
      description: "Sweet & Grape flavors. Box of 60: $420",
    },
    {
      name: "La Morena Natural Cigars",
      size: "per cigar",
      price: 15.0,
      description: "Premium packaged natural cigars",
    },
    {
      name: "Hand Rolled Cigars (Assorted)",
      size: "from, each",
      price: 60.0,
      description: "Big Dog, Marcos Cubanos, Tesoro Cubano, and more. From $60 each",
    },
  ],

  accessories: [
    {
      name: "RAW Brown Rolling Papers (Classic / Slim)",
      size: "per box",
      price: 125.0,
      description: "Natural unrefined rolling paper",
    },
  ],
};

function priceLine(p) {
  let s = `  • ${p.name}`;
  if (p.size) s += ` (${p.size})`;
  if (p.pack) s += ` (${p.pack})`;
  s += ` — $${p.price.toFixed(2)}`;
  if (p.box_price) s += ` | Box of ${p.box_qty}: $${p.box_price.toFixed(2)}`;
  s += "\n";
  return s;
}

function getProductCatalog() {
  let c = "📦 *KABISATNT PRICE LIST 2026*\n_All prices in TTD_\n\n";

  c += "💨 *VAPES*\n";
  products.vapes.forEach((p) => (c += priceLine(p)));

  c += "\n🍺 *BEER*\n";
  products.beers.forEach((p) => (c += priceLine(p)));

  c += "\n⚡ *ENERGY & SOFT DRINKS*\n";
  products.drinks.forEach((p) => (c += priceLine(p)));

  c += "\n🚬 *CIGARETTES*\n";
  products.cigarettes.forEach((p) => (c += priceLine(p)));

  c += "\n🚬 *CIGARS & CIGARILLOS*\n";
  products.cigars.forEach((p) => (c += priceLine(p)));

  c += "\n📄 *ROLLING PAPERS*\n";
  products.accessories.forEach((p) => (c += priceLine(p)));

  c += "\n💬 Tell me what you'd like to order, or ask about any product!";
  return c;
}

function getProductsByCategory(category) {
  const cat = (category || "").toLowerCase();
  if (cat.includes("beer")) return { category: "Beer", items: products.beers };
  if (cat.includes("spirit") || cat.includes("drink") || cat.includes("energy") || cat.includes("kabisa") || cat.includes("soft"))
    return { category: "Energy & Soft Drinks", items: products.drinks };
  if (cat.includes("cigar") && !cat.includes("cigarette"))
    return { category: "Cigars & Cigarillos", items: products.cigars };
  if (cat.includes("cigarette") || cat.includes("smoke"))
    return { category: "Cigarettes", items: products.cigarettes };
  if (cat.includes("vape") || cat.includes("e-cig") || cat.includes("pod"))
    return { category: "Vapes", items: products.vapes };
  if (cat.includes("paper") || cat.includes("accessor") || cat.includes("raw"))
    return { category: "Rolling Papers", items: products.accessories };
  return null;
}

module.exports = { products, getProductCatalog, getProductsByCategory };
