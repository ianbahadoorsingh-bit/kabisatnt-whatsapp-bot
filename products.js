// KABISATNT Product Catalog
// Update this file with your actual products and prices

const products = {
  beers: [
    { name: "Carib Lager", size: "275ml", price: 10.00, case_price: 120.00, case_qty: 24 },
    { name: "Carib Lager", size: "330ml", price: 12.00, case_price: 144.00, case_qty: 24 },
    { name: "Stag Lager", size: "275ml", price: 10.00, case_price: 120.00, case_qty: 24 },
    { name: "Stag Lager", size: "330ml", price: 12.00, case_price: 144.00, case_qty: 24 },
    { name: "Heineken", size: "330ml", price: 15.00, case_price: 180.00, case_qty: 24 },
    { name: "Corona Extra", size: "330ml", price: 18.00, case_price: 216.00, case_qty: 24 },
    { name: "Guinness Stout", size: "275ml", price: 12.00, case_price: 144.00, case_qty: 24 },
  ],
  drinks: [
    { name: "Smirnoff Ice", size: "275ml", price: 15.00, case_price: 180.00, case_qty: 24 },
    { name: "Johnnie Walker Red Label", size: "750ml", price: 250.00 },
    { name: "Johnnie Walker Black Label", size: "750ml", price: 450.00 },
    { name: "Hennessy VS", size: "750ml", price: 500.00 },
    { name: "Absolut Vodka", size: "750ml", price: 200.00 },
    { name: "Bacardi White Rum", size: "750ml", price: 150.00 },
    { name: "Jack Daniel's", size: "750ml", price: 350.00 },
  ],
  cigars: [
    { name: "Cuban Cigar Selection", price: 50.00, description: "Premium hand-rolled" },
    { name: "Davidoff Classic", price: 75.00, description: "Smooth and refined" },
    { name: "Montecristo No. 4", price: 45.00, description: "Medium-bodied classic" },
  ],
  cigarettes: [
    { name: "Du Maurier", price: 45.00, pack: "20s" },
    { name: "Marlboro Red", price: 50.00, pack: "20s" },
    { name: "Marlboro Gold", price: 50.00, pack: "20s" },
    { name: "Broadway", price: 30.00, pack: "20s" },
  ],
  vapes: [
    { name: "Disposable Vape 5000 Puffs", price: 80.00, description: "Various flavors available" },
    { name: "Disposable Vape 8000 Puffs", price: 120.00, description: "Various flavors available" },
    { name: "Vape Pod Kit", price: 200.00, description: "Rechargeable starter kit" },
    { name: "Vape Juice 30ml", price: 60.00, description: "Multiple nicotine strengths" },
  ]
};

function getProductCatalog() {
  let catalog = "📦 *KABISATNT PRODUCT CATALOG*\n\n";

  catalog += "🍺 *BEERS*\n";
  products.beers.forEach(p => {
    catalog += `  • ${p.name} (${p.size}) - $${p.price.toFixed(2)}`;
    if (p.case_price) catalog += ` | Case of ${p.case_qty}: $${p.case_price.toFixed(2)}`;
    catalog += "\n";
  });

  catalog += "\n🥃 *SPIRITS & DRINKS*\n";
  products.drinks.forEach(p => {
    catalog += `  • ${p.name} (${p.size}) - $${p.price.toFixed(2)}\n`;
  });

  catalog += "\n🚬 *CIGARS*\n";
  products.cigars.forEach(p => {
    catalog += `  • ${p.name} - $${p.price.toFixed(2)} (${p.description})\n`;
  });

  catalog += "\n🚬 *CIGARETTES*\n";
  products.cigarettes.forEach(p => {
    catalog += `  • ${p.name} (${p.pack}) - $${p.price.toFixed(2)}\n`;
  });

  catalog += "\n💨 *VAPES*\n";
  products.vapes.forEach(p => {
    catalog += `  • ${p.name} - $${p.price.toFixed(2)} (${p.description})\n`;
  });

  catalog += "\n💰 *All prices in TTD*";
  catalog += "\n📞 To place an order, just tell me what you'd like!";

  return catalog;
}

function getProductsByCategory(category) {
  const cat = category.toLowerCase();
  if (cat.includes("beer")) return { category: "Beers", items: products.beers };
  if (cat.includes("spirit") || cat.includes("drink") || cat.includes("liquor") || cat.includes("whisky") || cat.includes("whiskey") || cat.includes("vodka") || cat.includes("rum") || cat.includes("hennessy") || cat.includes("brandy")) return { category: "Spirits & Drinks", items: products.drinks };
  if (cat.includes("cigar") && !cat.includes("cigarette")) return { category: "Cigars", items: products.cigars };
  if (cat.includes("cigarette") || cat.includes("smoke")) return { category: "Cigarettes", items: products.cigarettes };
  if (cat.includes("vape") || cat.includes("e-cig") || cat.includes("pod")) return { category: "Vapes", items: products.vapes };
  return null;
}

module.exports = { products, getProductCatalog, getProductsByCategory };
