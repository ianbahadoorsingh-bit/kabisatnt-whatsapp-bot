// KABISATNT Townhouse Project
// Update this file with your actual townhouse details, prices, and photos

const townhouseProject = {
  name: "KABISATNT Townhouse Development",
  location: "Trinidad and Tobago", // Update with actual location
  description: "Modern townhouse development offering quality living spaces in a prime location.",
  units: [
    {
      type: "2 Bedroom Townhouse",
      bedrooms: 2,
      bathrooms: 2,
      sqft: 1200,
      price: null, // Set to null to show "Contact for pricing"
      features: [
        "Open-plan living/dining",
        "Modern kitchen",
        "Private parking",
        "Gated community",
      ],
      available: true,
    },
    {
      type: "3 Bedroom Townhouse",
      bedrooms: 3,
      bathrooms: 2.5,
      sqft: 1600,
      price: null,
      features: [
        "Open-plan living/dining",
        "Modern kitchen with island",
        "Private parking for 2 vehicles",
        "Gated community",
        "Small backyard/patio",
      ],
      available: true,
    },
  ],
  amenities: [
    "24/7 Security",
    "Gated compound",
    "Landscaped grounds",
    "Visitor parking",
    "Close to schools and shopping",
  ],
  // Payment/financing info
  financing: "Mortgage financing available through major banks. HDC applications also accepted.",
  contact: "Contact us for viewing appointments and pricing information.",
};

function getTownhouseInfo() {
  let msg = `🏠 *${townhouseProject.name.toUpperCase()}*\n`;
  msg += `📍 ${townhouseProject.location}\n\n`;
  msg += `${townhouseProject.description}\n\n`;

  msg += `*Available Units:*\n\n`;
  townhouseProject.units.forEach((unit, i) => {
    msg += `🏡 *${unit.type}*\n`;
    msg += `   🛏 ${unit.bedrooms} Bedrooms | 🚿 ${unit.bathrooms} Bathrooms\n`;
    msg += `   📐 ${unit.sqft} sq ft\n`;
    msg += `   💰 ${unit.price ? `$${unit.price.toLocaleString()} TTD` : "Contact for pricing"}\n`;
    msg += `   ✅ ${unit.available ? "Available" : "Sold Out"}\n`;
    if (unit.features.length > 0) {
      msg += `   Features: ${unit.features.join(", ")}\n`;
    }
    msg += "\n";
  });

  msg += `*Community Amenities:*\n`;
  townhouseProject.amenities.forEach(a => {
    msg += `  • ${a}\n`;
  });

  msg += `\n💳 ${townhouseProject.financing}\n`;
  msg += `\n📞 ${townhouseProject.contact}`;

  return msg;
}

module.exports = { townhouseProject, getTownhouseInfo };
