// Atlantic Villas — Townhouse Development (by Revel Inc.)
// Marketed via KABISATNT WhatsApp bot.

const townhouseProject = {
  name: "Atlantic Villas",
  developer: "Revel Inc.",
  location: "Atlantic Gardens, East Coast Demerara, Guyana",
  tagline: "Premium 3-bedroom townhouses — Air BnB ready",
  description:
    "An exclusive gated complex of just 6 luxury 3-bedroom townhouses in Atlantic Gardens, East Coast Demerara, Guyana. Air BnB ready and ideal for investment — perfect for business stays while in Guyana, and Air BnB income when you're away.",

  unit: {
    type: "Premium 3 Bedroom Townhouse",
    bedrooms: 3,
    sqft: 1700,
    totalUnitsInComplex: 6,
  },

  pricing: {
    sale_usd: 425000, // USD 425,000 (from flyer)
    sale_ttd: 3200000, // TT 3.2 Million (from flyer)
    rent_usd_per_month: 5500, // US$5,500/month (from website)
    for_sale: true,
    for_rent: true,
    investment_notes:
      "High rental yield potential and strong Air BnB potential. Ideal for businessmen to stay while in Guyana, and to Air BnB when not in use.",
  },

  amenities: [
    "Secure gated entry",
    "Pickle ball court on site",
    "Modern open-plan interiors",
    "1,700 sq ft of living space per unit",
    "3 bedrooms per unit",
    "Wi-Fi controlled lights",
    "Chef-ready kitchen with stainless steel appliances",
    "Fully equipped outdoor kitchen with pizza oven & BBQ grill",
    "Relaxing water fountain & seating area",
    "Private amenities & recreation",
  ],

  location_highlights: [
    "8 minutes from Ogle (Eugene F. Correia) International Airport",
    "5 minutes to Movietown & Giftland Mall",
  ],

  website: "atlanticvillasgy.com",
  move_in: "Targeted move-in 2026",
  contact: {
    guyana_whatsapp: "+592 668 1807",
    trinidad_whatsapp: "+868 273 2777",
    email: "Revelincgy@gmail.com",
  },

  financing:
    "For sale or rent. Contact the team for payment terms, viewings, and current availability.",
};

function getTownhouseInfo() {
  const p = townhouseProject;
  let msg = `🏠 *ATLANTIC VILLAS*\n📍 ${p.location}\n_Premium 3-bedroom townhouses by Revel Inc._ ✨\n\n`;
  msg += `An exclusive gated complex of just *6 luxury townhouses* — _Air BnB ready_ and ideal for investment.\n\n`;

  msg += `*The Homes*\n`;
  msg += `🛏 3 bedrooms per unit  |  📐 1,700 sq ft\n`;
  msg += `🎨 Modern open-plan interiors\n`;
  msg += `🍳 Chef-ready kitchen, stainless steel appliances\n`;
  msg += `💡 Wi-Fi controlled lights\n\n`;

  msg += `*Amenities*\n`;
  msg += `🔒 Secure gated entry\n`;
  msg += `🎾 Pickle ball court on site\n`;
  msg += `🍕 Outdoor kitchen — pizza oven & BBQ grill\n`;
  msg += `⛲ Relaxing water fountain & seating\n`;
  msg += `🌴 Private amenities & recreation\n\n`;

  msg += `*Pricing*\n`;
  msg += `💵 For Sale: *USD $425,000* (TT $3.2 Million)\n`;
  msg += `🔑 For Rent: *US $5,500/month*\n`;
  msg += `📈 High rental yield & Air BnB potential\n\n`;

  msg += `*Location*\n`;
  msg += `✈ 8 minutes from Ogle Airport\n`;
  msg += `🛍 5 minutes to Movietown & Giftland Mall\n\n`;

  msg += `🌐 More photos & info: ${p.website}\n\n`;

  msg += `*Contact / WhatsApp:*\n`;
  msg += `🇬🇾 Guyana: ${p.contact.guyana_whatsapp}\n`;
  msg += `🇹🇹 Trinidad: ${p.contact.trinidad_whatsapp}\n`;
  msg += `📧 ${p.contact.email}\n\n`;

  msg += `Would you like to schedule a viewing? Share your name and I'll connect you with the team! 🏡`;

  return msg;
}

module.exports = { townhouseProject, getTownhouseInfo };
