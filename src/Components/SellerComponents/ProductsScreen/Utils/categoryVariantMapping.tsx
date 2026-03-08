/**
 * Category-Specific Variant Mapping Configuration
 * 
 * This file defines which variant attributes are available for each category and subcategory.
 * When a seller selects a category/subcategory, the frontend will use this mapping to show
 * only the relevant variant options.
 */

const variantOptions = {
  // Common variant types with their possible values
  size: {
    label: "Size",
    type: "select",
    values: ["XXS", "XS", "S", "M", "L", "XL", "XXL", "3XL", "4XL", "5XL", "Free Size", "Custom"]
  },
  color: {
    label: "Color",
    type: "select",
    values: [
      "Black", "White", "Red", "Blue", "Green", "Yellow", "Orange", "Purple",
      "Pink", "Brown", "Grey", "Navy", "Beige", "Maroon", "Gold", "Silver",
      "Multi-Color", "Other"
    ]
  },
  material: {
    label: "Material",
    type: "select",
    values: [
      "Cotton", "Polyester", "Silk", "Wool", "Leather", "Denim", "Linen",
      "Synthetic", "Canvas", "Velvet", "Satin", "Nylon", "Metal", "Plastic",
      "Wood", "Glass", "Ceramic", "Rubber", "Other"
    ]
  },
  style: {
    label: "Style",
    type: "select",
    values: [
      "Casual", "Formal", "Sports", "Party", "Traditional", "Western",
      "Ethnic", "Contemporary", "Classic", "Modern", "Vintage", "Trendy"
    ]
  },
  storage: {
    label: "Storage/Memory",
    type: "select",
    values: [
      "8GB", "16GB", "32GB", "64GB", "128GB", "256GB", "512GB", "1TB", "2TB", "4TB"
    ]
  },
  ram: {
    label: "RAM",
    type: "select",
    values: ["2GB", "4GB", "6GB", "8GB", "12GB", "16GB", "32GB", "64GB"]
  },
  warranty: {
    label: "Warranty",
    type: "select",
    values: [
      "No Warranty", "3 Months", "6 Months", "1 Year", "2 Years", "3 Years", "5 Years", "Lifetime"
    ]
  },
  volume: {
    label: "Volume/Size",
    type: "select",
    values: [
      "5ml", "10ml", "15ml", "30ml", "50ml", "100ml", "150ml", "200ml", "250ml",
      "500ml", "750ml", "1L", "1.5L", "2L", "Travel Size", "Full Size"
    ]
  },
  shade: {
    label: "Shade/Color",
    type: "select",
    values: [
      "Fair", "Light", "Medium", "Tan", "Deep", "Dark",
      "Nude", "Pink", "Red", "Coral", "Berry", "Plum", "Brown",
      "Natural", "Warm", "Cool", "Neutral"
    ]
  },
  scent: {
    label: "Scent/Fragrance",
    type: "select",
    values: [
      "Unscented", "Lavender", "Rose", "Citrus", "Vanilla", "Mint",
      "Coconut", "Jasmine", "Sandalwood", "Fresh", "Floral", "Fruity",
      "Woody", "Spicy", "Herbal", "Ocean", "Musk"
    ]
  },
  flavor: {
    label: "Flavor",
    type: "select",
    values: [
      "Chocolate", "Vanilla", "Strawberry", "Banana", "Mango", "Orange",
      "Lemon", "Mixed Berry", "Mint", "Coffee", "Caramel", "Peanut Butter",
      "Coconut", "Original", "Unflavored", "Natural"
    ]
  },
  weight: {
    label: "Weight/Quantity",
    type: "select",
    values: [
      "50g", "100g", "200g", "250g", "500g", "1kg", "2kg", "5kg", "10kg",
      "1pc", "2pc", "3pc", "6pc", "12pc", "24pc", "Pack of 1", "Pack of 2",
      "Pack of 5", "Pack of 10", "Family Pack", "Bulk Pack"
    ]
  },
  ageGroup: {
    label: "Age Group",
    type: "select",
    values: [
      "0-3 Months", "3-6 Months", "6-12 Months", "1-2 Years", "2-3 Years",
      "3-5 Years", "5-7 Years", "7-10 Years", "10+ Years", "Teen", "Adult", "All Ages"
    ]
  },
  platform: {
    label: "Platform/Compatibility",
    type: "select",
    values: [
      "PlayStation 5", "PlayStation 4", "Xbox Series X/S", "Xbox One",
      "Nintendo Switch", "PC", "Mobile", "Multi-Platform", "Universal"
    ]
  },
  edition: {
    label: "Edition",
    type: "select",
    values: [
      "Standard", "Deluxe", "Premium", "Collector's", "Limited", "Special",
      "Ultimate", "Digital", "Physical", "Game of the Year"
    ]
  },
  count: {
    label: "Count/Tablets",
    type: "select",
    values: [
      "10 Tablets", "30 Tablets", "60 Tablets", "90 Tablets", "120 Tablets",
      "30 Capsules", "60 Capsules", "90 Capsules", "100ml", "200ml", "500ml"
    ]
  },
  compatibility: {
    label: "Compatibility/Fit",
    type: "select",
    values: [
      "Universal", "Sedan", "SUV", "Hatchback", "Motorcycle", "Scooter",
      "Specific Model", "Most Vehicles"
    ]
  },
  petSize: {
    label: "Pet Size",
    type: "select",
    values: [
      "Small (Up to 10kg)", "Medium (10-25kg)", "Large (25-45kg)", "Extra Large (45kg+)", "All Sizes"
    ]
  },
  occasion: {
    label: "Occasion",
    type: "select",
    values: [
      "Birthday", "Anniversary", "Wedding", "Diwali", "Christmas", "Holi",
      "New Year", "Valentine's Day", "Raksha Bandhan", "Mother's Day",
      "Father's Day", "Congratulations", "Thank You", "General"
    ]
  },
  rarity: {
    label: "Rarity/Grade",
    type: "select",
    values: [
      "Common", "Uncommon", "Rare", "Very Rare", "Limited Edition",
      "One of a Kind", "Museum Quality"
    ]
  },
  condition: {
    label: "Condition",
    type: "select",
    values: [
      "New", "Like New", "Excellent", "Good", "Fair", "Vintage", "Restored"
    ]
  },
  certification: {
    label: "Certification",
    type: "select",
    values: [
      "None", "ISO Certified", "CE Marked", "FDA Approved", "BIS Certified",
      "Laboratory Tested", "Industry Standard"
    ]
  }
};

/**
 * Category to Variant Mapping
 * Maps each category and its subcategories to applicable variant types
 */
const categoryVariantMapping = {
  "Fashion & Accessories": {
    defaultVariants: ["size", "color"],
    subcategories: {
      "Men's Clothing": ["size", "color", "material", "style"],
      "Women's Clothing": ["size", "color", "material", "style"],
      "Kids' Clothing": ["size", "color", "ageGroup"],
      "Footwear": ["size", "color", "material"],
      "Jewelry": ["material", "color", "style"],
      "Watches": ["color", "material", "style"],
      "Handbags & Wallets": ["size", "color", "material"],
      "Sunglasses & Eyewear": ["color", "style"]
    }
  },

  "Electronics & Gadgets": {
    defaultVariants: ["color", "storage"],
    subcategories: {
      "Mobile Phones & Accessories": ["color", "storage", "ram", "warranty"],
      "Laptops & Tablets": ["color", "storage", "ram", "warranty"],
      "Cameras & Accessories": ["color", "warranty"],
      "Home Appliances": ["color", "warranty", "size"],
      "Audio Devices (Headphones, Speakers)": ["color", "warranty"],
      "Smart Devices (Watches, Home Automation)": ["color", "storage", "warranty"]
    }
  },

  "Beauty & Personal Care": {
    defaultVariants: ["volume", "shade"],
    subcategories: {
      "Makeup": ["shade", "volume", "color"],
      "Skincare": ["volume", "scent"],
      "Haircare": ["volume", "scent"],
      "Fragrances": ["volume", "scent"],
      "Grooming Essentials": ["volume", "scent"]
    }
  },

  "Home & Living": {
    defaultVariants: ["size", "color"],
    subcategories: {
      "Furniture": ["size", "color", "material"],
      "Home Decor": ["size", "color", "material", "style"],
      "Kitchenware": ["size", "color", "material"],
      "Bedding & Linens": ["size", "color", "material"],
      "Cleaning Supplies": ["volume", "scent"]
    }
  },

  "Books, Hobbies & Stationery": {
    defaultVariants: ["size", "color"],
    subcategories: {
      "Fiction & Non-Fiction Books": ["edition", "condition"],
      "Academic Books": ["edition", "condition"],
      "Art Supplies": ["size", "color", "material"],
      "Stationery Items": ["size", "color"],
      "Musical Instruments": ["color", "material"]
    }
  },

  "Sports & Fitness": {
    defaultVariants: ["size", "color"],
    subcategories: {
      "Activewear": ["size", "color", "material"],
      "Fitness Equipment": ["size", "color", "weight"],
      "Sports Gear": ["size", "color", "material"],
      "Outdoor Adventure Equipment": ["size", "color", "material"]
    }
  },

  "Food & Beverages": {
    defaultVariants: ["weight", "flavor"],
    subcategories: {
      "Packaged Foods": ["weight", "flavor"],
      "Beverages": ["volume", "flavor"],
      "Gourmet Items": ["weight", "flavor"],
      "Health Foods": ["weight", "flavor"]
    }
  },

  "Baby & Kids": {
    defaultVariants: ["size", "ageGroup"],
    subcategories: {
      "Toys & Games": ["ageGroup", "color"],
      "Baby Essentials": ["size", "ageGroup", "color"],
      "Kids' Furniture": ["size", "color", "ageGroup"],
      "Educational Supplies": ["ageGroup", "color"]
    }
  },

  "Health & Wellness": {
    defaultVariants: ["count", "flavor"],
    subcategories: {
      "Vitamins & Supplements": ["count", "flavor"],
      "Fitness Nutrition": ["weight", "flavor"],
      "Medical Devices": ["warranty"]
    }
  },

  "Automobiles & Accessories": {
    defaultVariants: ["compatibility", "color"],
    subcategories: {
      "Car Accessories": ["color", "compatibility"],
      "Bike Accessories": ["color", "compatibility"],
      "Maintenance Tools": ["size"]
    }
  },

  "Pets": {
    defaultVariants: ["petSize", "flavor"],
    subcategories: {
      "Pet Food": ["weight", "flavor", "petSize"],
      "Pet Accessories": ["size", "color", "petSize"],
      "Pet Grooming": ["volume", "scent", "petSize"]
    }
  },

  "Gifts & Festive Needs": {
    defaultVariants: ["size", "occasion"],
    subcategories: {
      "Personalized Gifts": ["size", "color", "occasion"],
      "Festive Decorations": ["size", "color", "occasion"],
      "Gift Cards": ["weight"]
    }
  },

  "Miscellaneous": {
    defaultVariants: ["size", "color"],
    subcategories: {
      "Travel Accessories": ["size", "color", "material"],
      "Office Supplies": ["size", "color"],
      "Others": ["size", "color"]
    }
  },

  "Gaming": {
    defaultVariants: ["platform", "edition"],
    subcategories: {
      "Consoles & Accessories": ["color", "storage", "edition", "warranty"],
      "Video Games": ["platform", "edition", "condition"]
    }
  },

  "Industrial & Scientific": {
    defaultVariants: ["size", "certification"],
    subcategories: {
      "Lab Equipment": ["size", "certification", "material"],
      "Safety Supplies": ["size", "certification", "material"]
    }
  },

  "Tools & Hardware": {
    defaultVariants: ["size", "material"],
    subcategories: {
      "Hand Tools": ["size", "material"],
      "Power Tools": ["color", "warranty"]
    }
  },

  "Luxury & Collectibles": {
    defaultVariants: ["rarity", "condition"],
    subcategories: {
      "Art & Antiques": ["rarity", "condition", "material"],
      "Limited Edition Products": ["rarity", "condition", "edition"]
    }
  },

  "Construction & Building Materials": {
    defaultVariants: ["size", "material"],
    subcategories: {
      "Cement, Paint & Finishes": ["weight", "color", "volume"],
      "Pipes & Fittings": ["size", "material"]
    }
  }
};

/**
 * Get variants for a specific category and subcategory
 * @param {string} category - The category name
 * @param {string} subcategory - The subcategory name (optional)
 * @returns {Array} Array of variant configuration objects
 */
export const getVariantsForCategory = (category, subcategory = null) => {
  const categoryConfig = categoryVariantMapping[category];
  
  if (!categoryConfig) {
    // Return default variants if category not found
    return ["size", "color"].map(key => ({
      key,
      ...variantOptions[key]
    }));
  }

  let variantKeys;

  // If subcategory is specified and has custom variants, use those
  if (subcategory && categoryConfig.subcategories && categoryConfig.subcategories[subcategory]) {
    variantKeys = categoryConfig.subcategories[subcategory];
  } else {
    // Otherwise use default variants for the category
    variantKeys = categoryConfig.defaultVariants;
  }

  // Map variant keys to their full configuration
  return variantKeys.map(key => ({
    key,
    ...variantOptions[key]
  }));
};

/**
 * Get all available variant types (for reference)
 * @returns {Object} All variant options
 */
export const getAllVariantTypes = () => {
  return Object.keys(variantOptions).map(key => ({
    key,
    ...variantOptions[key]
  }));
};

/**
 * Validate if a variant is applicable for a category/subcategory
 * @param {string} category - The category name
 * @param {string} subcategory - The subcategory name
 * @param {string} variantKey - The variant key to validate
 * @returns {boolean} Whether the variant is applicable
 */
export const isVariantApplicable = (category, subcategory, variantKey) => {
  const variants = getVariantsForCategory(category, subcategory);
  return variants.some(v => v.key === variantKey);
};

export {
  variantOptions,
  categoryVariantMapping
};
