// src/components/Forms/fieldMapping.js

// Helper function to map display names from the table to state keys
// Add more mappings here if your state keys differ significantly or new fields are added
const mapFieldToStateKey = fieldName => {
  const map = {
    Title: 'title',
    Description: 'description',
    Category: 'category',
    Subcategory: 'subcategory',
    'Product Images': 'images',
    Brand: 'brand',
    'Country of Origin': 'countryOfOrigin',
    'Net Quantity': 'netQuantity',
    'Item Weight': 'weight',
    'Dimensions (L x W x H)': 'dimensions',
    'Packaging Type': 'packagingType',
    'Actual Price (MRP)': 'MRP',
    'Selling Price': 'productPrice',
    'GST Rate': 'gstRate',
    'Seller Name': 'sellerName',
    'Seller GSTIN': 'sellerGSTIN',
    'HSN No': 'hsnNo',
    Manufacturer: 'manufacturer',
    'Manufacturer Address': 'manufacturerAddress',
    'Shelf Life': 'shelfLife',
       "Return Policy": "hasReturn",
      "Size": "size",
    // 'Return Policy': 'returnPolicy',
    Warranty: 'warranty',
    'Allow Dropshipping': 'allowDropshipping',
    'Product Active': 'isActive',
    'Expiry Date': 'expiryDate',
    'Batch Number': 'batchNumber',
    'FSSAI License No': 'fssaiLicenseNo',
    'BIS Certification': 'bisCertification',
    'E-Waste Compliant': 'eWasteCompliance',
    'Importer Name': 'importerName',
    'Importer GSTIN': 'importerGSTIN',
    'Importer Address': 'importerAddress',
    'Hazardous Materials': 'hazardousMaterials',
    'Uses Recyclable Packaging': 'recyclablePackaging',
    // Add mappings for any other fields from your table if needed
    // Seller Contact is implicitly required by platform, add here if needed in table strings
    'Seller Contact': 'sellerContact', // Added for completeness if it appears in raw data
    'Stock Quantity': 'quantity', // Added for completeness if it appears in raw data
  };
  const key = map[fieldName.trim()];
  if (!key) {
    // console.warn(`No state key mapping found for table field: "${fieldName.trim()}"`);
  }
  return key;
};

// Function to process the raw string data from the table
const processFields = fieldsString => {
  if (!fieldsString || typeof fieldsString !== 'string') return [];
  return fieldsString
    .split(',')
    .map(field => mapFieldToStateKey(field.trim()))
    .filter(Boolean); // Filter out any null/undefined keys from unmapped fields
};

// Raw data (simulated from your table description) - Replace with actual structured data if possible
// Raw data (simulated from your table description) - Replace with actual structured data if possible
const rawMappingData = [
{ main: "Fashion & Accessories", sub: "Men's Clothing", req: "Title, Description, Category, Subcategory, Product Images, Brand, Country of Origin, Net Quantity, Item Weight, Dimensions (L x W x H), Packaging Type, Actual Price (MRP), Selling Price, GST Rate, Seller Name, Seller GSTIN", opt: "HSN No,  Manufacturer, Manufacturer Address, Shelf Life, Return Policy, Warranty, Allow Dropshipping, Product Active" },
{ main: "Fashion & Accessories", sub: "Women's Clothing", req: "Title, Description, Category, Subcategory, Product Images, Brand, Country of Origin, Net Quantity, Item Weight, Dimensions (L x W x H), Packaging Type, Actual Price (MRP), Selling Price, GST Rate, Seller Name, Seller GSTIN", opt: "HSN No, Manufacturer, Manufacturer Address, Shelf Life, Return Policy, Warranty, Allow Dropshipping, Product Active" },
{ main: "Fashion & Accessories", sub: "Kids' Clothing", req: "Title, Description, Category, Subcategory, Product Images, Brand, Country of Origin, Net Quantity, Item Weight, Dimensions (L x W x H), Packaging Type, Actual Price (MRP), Selling Price, GST Rate, Seller Name, Seller GSTIN", opt: "HSN No, Manufacturer, Manufacturer Address, Shelf Life, Return Policy, Warranty, Allow Dropshipping, Product Active" },
{ main: "Fashion & Accessories", sub: "Footwear", req: "Title, Description, Category, Subcategory, Product Images, Brand, Country of Origin, Net Quantity, Item Weight, Dimensions (L x W x H), Packaging Type, Actual Price (MRP), Selling Price, GST Rate, Seller Name, Seller GSTIN", opt: "HSN No, Manufacturer, Manufacturer Address, Shelf Life, Return Policy, Warranty, Allow Dropshipping, Product Active" },
{ main: "Fashion & Accessories", sub: "Jewelry", req: "Title, Description, Category, Subcategory, Product Images, Brand, Manufacturer, Manufacturer Address, Country of Origin, Net Quantity, Item Weight, Dimensions (L x W x H), Packaging Type, Actual Price (MRP), Selling Price, GST Rate, Seller Name, Seller GSTIN", opt: "HSN No, Shelf Life, Return Policy, Warranty, Allow Dropshipping, Product Active, BIS Certification" }, // Note: BIS moved to optional as per analysis
{ main: "Fashion & Accessories", sub: "Watches", req: "Title, Description, Category, Subcategory, Product Images, Brand, Manufacturer, Manufacturer Address, Country of Origin, Net Quantity, Item Weight, Dimensions (L x W x H), Warranty, Actual Price (MRP), Selling Price, GST Rate, Seller Name, Seller GSTIN", opt: "HSN No, BIS Certification, Shelf Life, Return Policy, Allow Dropshipping, Product Active" },
{ main: "Fashion & Accessories", sub: "Handbags & Wallets", req: "Title, Description, Category, Subcategory, Product Images, Brand, Country of Origin, Net Quantity, Item Weight, Dimensions (L x W x H), Packaging Type, Actual Price (MRP), Selling Price, GST Rate, Seller Name, Seller GSTIN", opt: "HSN No, Manufacturer, Manufacturer Address, Shelf Life, Return Policy, Warranty, Allow Dropshipping, Product Active" },
{ main: "Fashion & Accessories", sub: "Sunglasses & Eyewear", req: "Title, Description, Category, Subcategory, Product Images, Brand, Manufacturer, Manufacturer Address, Country of Origin, Net Quantity, Item Weight, Dimensions (L x W x H), Packaging Type, Actual Price (MRP), Selling Price, GST Rate, Seller Name, Seller GSTIN", opt: "HSN No, BIS Certification, Shelf Life, Return Policy, Warranty, Allow Dropshipping, Product Active" },
{ main: "Electronics & Gadgets", sub: "Mobile Phones & Accessories", req: "Title, Description, Category, Subcategory, Product Images, Brand, Manufacturer, Manufacturer Address, Country of Origin, Net Quantity, Item Weight, Dimensions (L x W x H), Packaging Type, Warranty, BIS Certification, E-Waste Compliant, Uses Recyclable Packaging, Actual Price (MRP), Selling Price, GST Rate, Seller Name, Seller GSTIN", opt: "HSN No, Return Policy, Allow Dropshipping, Product Active" },
{ main: "Electronics & Gadgets", sub: "Laptops & Tablets", req: "Title, Description, Category, Subcategory, Product Images, Brand, Manufacturer, Manufacturer Address, Country of Origin, Net Quantity, Item Weight, Dimensions (L x W x H), Packaging Type, Warranty, BIS Certification, E-Waste Compliant, Uses Recyclable Packaging, Actual Price (MRP), Selling Price, GST Rate, Seller Name, Seller GSTIN", opt: "HSN No, Return Policy, Allow Dropshipping, Product Active" },
{ main: "Electronics & Gadgets", sub: "Cameras & Accessories", req: "Title, Description, Category, Subcategory, Product Images, Brand, Manufacturer, Manufacturer Address, Country of Origin, Net Quantity, Item Weight, Dimensions (L x W x H), Packaging Type, Warranty, BIS Certification, E-Waste Compliant, Uses Recyclable Packaging, Actual Price (MRP), Selling Price, GST Rate, Seller Name, Seller GSTIN", opt: "HSN No, Return Policy, Allow Dropshipping, Product Active" },
{ main: "Electronics & Gadgets", sub: "Home Appliances", req: "Title, Description, Category, Subcategory, Product Images, Brand, Manufacturer, Manufacturer Address, Country of Origin, Net Quantity, Item Weight, Dimensions (L x W x H), Packaging Type, Warranty, BIS Certification, E-Waste Compliant, Uses Recyclable Packaging, Actual Price (MRP), Selling Price, GST Rate, Seller Name, Seller GSTIN", opt: "HSN No, Return Policy, Allow Dropshipping, Product Active, Hazardous Materials" }, // Hazardous is platform required but listed optional here for consistency if managed via table
{ main: "Electronics & Gadgets", sub: "Audio Devices", req: "Title, Description, Category, Subcategory, Product Images, Brand, Manufacturer, Manufacturer Address, Country of Origin, Net Quantity, Item Weight, Dimensions (L x W x H), Packaging Type, Warranty, BIS Certification, E-Waste Compliant, Uses Recyclable Packaging, Actual Price (MRP), Selling Price, GST Rate, Seller Name, Seller GSTIN", opt: "HSN No, Return Policy, Allow Dropshipping, Product Active" },
{ main: "Electronics & Gadgets", sub: "Smart Devices", req: "Title, Description, Category, Subcategory, Product Images, Brand, Manufacturer, Manufacturer Address, Country of Origin, Net Quantity, Item Weight, Dimensions (L x W x H), Packaging Type, Warranty, BIS Certification, E-Waste Compliant, Uses Recyclable Packaging, Actual Price (MRP), Selling Price, GST Rate, Seller Name, Seller GSTIN", opt: "HSN No, Return Policy, Allow Dropshipping, Product Active" },
{ main: "Beauty & Personal Care", sub: "Makeup", req: "Title, Description, Category, Subcategory, Product Images, Brand, Manufacturer, Manufacturer Address, Country of Origin, Net Quantity, Item Weight, Packaging Type, Shelf Life, Expiry Date, BIS Certification, Actual Price (MRP), Selling Price, GST Rate, Seller Name, Seller GSTIN", opt: "HSN No, Dimensions (L x W x H), Return Policy, Warranty, Allow Dropshipping, Product Active, Hazardous Materials" }, // Hazardous is platform required
{ main: "Beauty & Personal Care", sub: "Skincare", req: "Title, Description, Category, Subcategory, Product Images, Brand, Manufacturer, Manufacturer Address, Country of Origin, Net Quantity, Item Weight, Packaging Type, Shelf Life, Expiry Date, BIS Certification, Actual Price (MRP), Selling Price, GST Rate, Seller Name, Seller GSTIN", opt: "HSN No, Dimensions (L x W x H), Batch Number, Return Policy, Warranty, Allow Dropshipping, Product Active" },
{ main: "Beauty & Personal Care", sub: "Haircare", req: "Title, Description, Category, Subcategory, Product Images, Brand, Manufacturer, Manufacturer Address, Country of Origin, Net Quantity, Item Weight, Packaging Type, Shelf Life, Expiry Date, BIS Certification, Actual Price (MRP), Selling Price, GST Rate, Seller Name, Seller GSTIN", opt: "HSN No, Dimensions (L x W x H), Batch Number, Return Policy, Warranty, Allow Dropshipping, Product Active" },
{ main: "Beauty & Personal Care", sub: "Fragrances", req: "Title, Description, Category, Subcategory, Product Images, Brand, Manufacturer, Manufacturer Address, Country of Origin, Net Quantity, Item Weight, Packaging Type, Shelf Life, Expiry Date, BIS Certification, Actual Price (MRP), Selling Price, GST Rate, Seller Name, Seller GSTIN", opt: "HSN No, Dimensions (L x W x H), Return Policy, Warranty, Allow Dropshipping, Product Active, Hazardous Materials" }, // Hazardous is platform required
{ main: "Beauty & Personal Care", sub: "Grooming Essentials", req: "Title, Description, Category, Subcategory, Product Images, Brand, Manufacturer, Manufacturer Address, Country of Origin, Net Quantity, Item Weight, Packaging Type, Shelf Life, Expiry Date, BIS Certification, Actual Price (MRP), Selling Price, GST Rate, Seller Name, Seller GSTIN", opt: "HSN No, Dimensions (L x W x H), Batch Number, Return Policy, Warranty, Allow Dropshipping, Product Active" },
{ main: "Home & Living", sub: "Furniture", req: "Title, Description, Category, Subcategory, Product Images, Brand, Manufacturer, Manufacturer Address, Country of Origin, Item Weight, Dimensions (L x W x H), Packaging Type, Warranty, Actual Price (MRP), Selling Price, GST Rate, Seller Name, Seller GSTIN", opt: "HSN No, Net Quantity, BIS Certification, Shelf Life, Return Policy, Allow Dropshipping, Product Active" },
{ main: "Home & Living", sub: "Home Decor", req: "Title, Description, Category, Subcategory, Product Images, Brand, Country of Origin, Item Weight, Dimensions (L x W x H), Packaging Type, Actual Price (MRP), Selling Price, GST Rate, Seller Name, Seller GSTIN", opt: "HSN No, Net Quantity, Manufacturer, Manufacturer Address, BIS Certification, Shelf Life, Return Policy, Warranty, Allow Dropshipping, Product Active" },
{ main: "Home & Living", sub: "Kitchenware", req: "Title, Description, Category, Subcategory, Product Images, Brand, Manufacturer, Manufacturer Address, Country of Origin, Net Quantity, Item Weight, Dimensions (L x W x H), Packaging Type, BIS Certification, Actual Price (MRP), Selling Price, GST Rate, Seller Name, Seller GSTIN", opt: "HSN No, Shelf Life, Return Policy, Warranty, Allow Dropshipping, Product Active" },
{ main: "Home & Living", sub: "Bedding & Linens", req: "Title, Description, Category, Subcategory, Product Images, Brand, Manufacturer, Manufacturer Address, Country of Origin, Net Quantity, Item Weight, Dimensions (L x W x H), Packaging Type, Actual Price (MRP), Selling Price, GST Rate, Seller Name, Seller GSTIN", opt: "HSN No, BIS Certification, Shelf Life, Return Policy, Warranty, Allow Dropshipping, Product Active" },
{ main: "Home & Living", sub: "Cleaning Supplies", req: "Title, Description, Category, Subcategory, Product Images, Brand, Manufacturer, Manufacturer Address, Country of Origin, Net Quantity, Item Weight, Packaging Type, Shelf Life, Actual Price (MRP), Selling Price, GST Rate, Seller Name, Seller GSTIN", opt: "HSN No, Dimensions (L x W x H), Expiry Date, BIS Certification, Hazardous Materials, Return Policy, Warranty, Allow Dropshipping, Product Active" }, // Hazardous is platform required
{ main: "Sports & Fitness", sub: "Activewear", req: "Title, Description, Category, Subcategory, Product Images, Brand, Country of Origin, Net Quantity, Item Weight, Dimensions (L x W x H), Packaging Type, Actual Price (MRP), Selling Price, GST Rate, Seller Name, Seller GSTIN", opt: "HSN No, Manufacturer, Manufacturer Address, Shelf Life, Return Policy, Warranty, Allow Dropshipping, Product Active" },
{ main: "Sports & Fitness", sub: "Fitness Equipment", req: "Title, Description, Category, Subcategory, Product Images, Brand, Manufacturer, Manufacturer Address, Country of Origin, Net Quantity, Item Weight, Dimensions (L x W x H), Packaging Type, Warranty, Actual Price (MRP), Selling Price, GST Rate, Seller Name, Seller GSTIN", opt: "HSN No, BIS Certification, Shelf Life, Return Policy, Allow Dropshipping, Product Active" },
{ main: "Sports & Fitness", sub: "Sports Gear", req: "Title, Description, Category, Subcategory, Product Images, Brand, Country of Origin, Net Quantity, Item Weight, Dimensions (L x W x H), Packaging Type, Actual Price (MRP), Selling Price, GST Rate, Seller Name, Seller GSTIN", opt: "HSN No, Manufacturer, Manufacturer Address, BIS Certification, Shelf Life, Return Policy, Warranty, Allow Dropshipping, Product Active" },
{ main: "Sports & Fitness", sub: "Outdoor Adventure Equipment", req: "Title, Description, Category, Subcategory, Product Images, Brand, Manufacturer, Manufacturer Address, Country of Origin, Net Quantity, Item Weight, Dimensions (L x W x H), Packaging Type, Warranty, Actual Price (MRP), Selling Price, GST Rate, Seller Name, Seller GSTIN", opt: "HSN No, BIS Certification, Shelf Life, Return Policy, Allow Dropshipping, Product Active" },
{ main: "Books, Hobbies & Stationery", sub: "Fiction & Non-Fiction Books", req: "Title, Description, Category, Subcategory, Product Images, Brand, Country of Origin, Net Quantity, Item Weight, Dimensions (L x W x H), Actual Price (MRP), Selling Price, GST Rate, Seller Name, Seller GSTIN", opt: "HSN No, Manufacturer, Manufacturer Address, Packaging Type, Shelf Life, Return Policy, Allow Dropshipping, Product Active" },
{ main: "Books, Hobbies & Stationery", sub: "Academic Books", req: "Title, Description, Category, Subcategory, Product Images, Brand, Country of Origin, Net Quantity, Item Weight, Dimensions (L x W x H), Actual Price (MRP), Selling Price, GST Rate, Seller Name, Seller GSTIN", opt: "HSN No, Manufacturer, Manufacturer Address, Packaging Type, Shelf Life, Return Policy, Allow Dropshipping, Product Active" },
{ main: "Books, Hobbies & Stationery", sub: "Art Supplies", req: "Title, Description, Category, Subcategory, Product Images, Brand, Country of Origin, Net Quantity, Item Weight, Dimensions (L x W x H), Packaging Type, Actual Price (MRP), Selling Price, GST Rate, Seller Name, Seller GSTIN", opt: "HSN No, Manufacturer, Manufacturer Address, BIS Certification, Shelf Life, Return Policy, Warranty, Allow Dropshipping, Product Active" },
{ main: "Books, Hobbies & Stationery", sub: "Stationery Items", req: "Title, Description, Category, Subcategory, Product Images, Brand, Country of Origin, Net Quantity, Item Weight, Dimensions (L x W x H), Packaging Type, Actual Price (MRP), Selling Price, GST Rate, Seller Name, Seller GSTIN", opt: "HSN No, Manufacturer, Manufacturer Address, BIS Certification, Shelf Life, Return Policy, Warranty, Allow Dropshipping, Product Active" },
{ main: "Books, Hobbies & Stationery", sub: "Musical Instruments", req: "Title, Description, Category, Subcategory, Product Images, Brand, Manufacturer, Manufacturer Address, Country of Origin, Net Quantity, Item Weight, Dimensions (L x W x H), Packaging Type, Warranty, Actual Price (MRP), Selling Price, GST Rate, Seller Name, Seller GSTIN", opt: "HSN No, BIS Certification, Shelf Life, Return Policy, Allow Dropshipping, Product Active" },
{ main: "Food & Beverages", sub: "Packaged Foods", req: "Title, Description, Category, Subcategory, Product Images, Brand, Manufacturer, Manufacturer Address, Country of Origin, Net Quantity, Item Weight, Packaging Type, Shelf Life, Expiry Date, FSSAI License No, Batch Number, Actual Price (MRP), Selling Price, GST Rate, Seller Name, Seller GSTIN", opt: "HSN No, Dimensions (L x W x H), Importer Name, Importer GSTIN, Importer Address, Return Policy, Allow Dropshipping, Product Active" },
{ main: "Food & Beverages", sub: "Beverages", req: "Title, Description, Category, Subcategory, Product Images, Brand, Manufacturer, Manufacturer Address, Country of Origin, Net Quantity, Item Weight, Packaging Type, Shelf Life, Expiry Date, FSSAI License No, Batch Number, Actual Price (MRP), Selling Price, GST Rate, Seller Name, Seller GSTIN", opt: "HSN No, Dimensions (L x W x H), Importer Name, Importer GSTIN, Importer Address, Return Policy, Allow Dropshipping, Product Active" },
{ main: "Food & Beverages", sub: "Gourmet Items", req: "Title, Description, Category, Subcategory, Product Images, Brand, Manufacturer, Manufacturer Address, Country of Origin, Net Quantity, Item Weight, Packaging Type, Shelf Life, Expiry Date, FSSAI License No, Batch Number, Actual Price (MRP), Selling Price, GST Rate, Seller Name, Seller GSTIN", opt: "HSN No, Dimensions (L x W x H), Importer Name, Importer GSTIN, Importer Address, Return Policy, Allow Dropshipping, Product Active" },
{ main: "Food & Beverages", sub: "Health Foods", req: "Title, Description, Category, Subcategory, Product Images, Brand, Manufacturer, Manufacturer Address, Country of Origin, Net Quantity, Item Weight, Packaging Type, Shelf Life, Expiry Date, FSSAI License No, Batch Number, Actual Price (MRP), Selling Price, GST Rate, Seller Name, Seller GSTIN", opt: "HSN No, Dimensions (L x W x H), Importer Name, Importer GSTIN, Importer Address, Return Policy, Allow Dropshipping, Product Active" },
{ main: "Baby & Kids", sub: "Toys & Games", req: "Title, Description, Category, Subcategory, Product Images, Brand, Manufacturer, Manufacturer Address, Country of Origin, Net Quantity, Item Weight, Dimensions (L x W x H), Packaging Type, BIS Certification, Actual Price (MRP), Selling Price, GST Rate, Seller Name, Seller GSTIN", opt: "HSN No, Shelf Life, Return Policy, Warranty, Allow Dropshipping, Product Active" },
{ main: "Baby & Kids", sub: "Baby Essentials", req: "Title, Description, Category, Subcategory, Product Images, Brand, Manufacturer, Manufacturer Address, Country of Origin, Net Quantity, Item Weight, Dimensions (L x W x H), Packaging Type, BIS Certification, Shelf Life, Actual Price (MRP), Selling Price, GST Rate, Seller Name, Seller GSTIN", opt: "HSN No, Expiry Date, Batch Number, Return Policy, Warranty, Allow Dropshipping, Product Active" },
{ main: "Baby & Kids", sub: "Kids' Furniture", req: "Title, Description, Category, Subcategory, Product Images, Brand, Manufacturer, Manufacturer Address, Country of Origin, Net Quantity, Item Weight, Dimensions (L x W x H), Packaging Type, BIS Certification, Warranty, Actual Price (MRP), Selling Price, GST Rate, Seller Name, Seller GSTIN", opt: "HSN No, Shelf Life, Return Policy, Allow Dropshipping, Product Active" },
{ main: "Baby & Kids", sub: "Educational Supplies", req: "Title, Description, Category, Subcategory, Product Images, Brand, Country of Origin, Net Quantity, Item Weight, Dimensions (L x W x H), Packaging Type, BIS Certification, Actual Price (MRP), Selling Price, GST Rate, Seller Name, Seller GSTIN", opt: "HSN No, Manufacturer, Manufacturer Address, Shelf Life, Return Policy, Warranty, Allow Dropshipping, Product Active" },
{ main: "Health & Wellness", sub: "Vitamins & Supplements", req: "Title, Description, Category, Subcategory, Product Images, Brand, Manufacturer, Manufacturer Address, Country of Origin, Net Quantity, Item Weight, Packaging Type, Shelf Life, Expiry Date, FSSAI License No, Batch Number, Actual Price (MRP), Selling Price, GST Rate, Seller Name, Seller GSTIN", opt: "HSN No, Dimensions (L x W x H), BIS Certification, Importer Name, Importer GSTIN, Importer Address, Return Policy, Allow Dropshipping, Product Active" },
{ main: "Health & Wellness", sub: "Fitness Nutrition", req: "Title, Description, Category, Subcategory, Product Images, Brand, Manufacturer, Manufacturer Address, Country of Origin, Net Quantity, Item Weight, Packaging Type, Shelf Life, Expiry Date, FSSAI License No, Batch Number, Actual Price (MRP), Selling Price, GST Rate, Seller Name, Seller GSTIN", opt: "HSN No, Dimensions (L x W x H), BIS Certification, Importer Name, Importer GSTIN, Importer Address, Return Policy, Allow Dropshipping, Product Active" },
{ main: "Health & Wellness", sub: "Medical Devices", req: "Title, Description, Category, Subcategory, Product Images, Brand, Manufacturer, Manufacturer Address, Country of Origin, Net Quantity, Item Weight, Dimensions (L x W x H), Packaging Type, Warranty, BIS Certification, Actual Price (MRP), Selling Price, GST Rate, Seller Name, Seller GSTIN", opt: "HSN No, Shelf Life, Return Policy, Allow Dropshipping, Product Active" },
{ main: "Automobiles & Accessories", sub: "Car Accessories", req: "Title, Description, Category, Subcategory, Product Images, Brand, Manufacturer, Manufacturer Address, Country of Origin, Net Quantity, Item Weight, Dimensions (L x W x H), Packaging Type, Warranty, Actual Price (MRP), Selling Price, GST Rate, Seller Name, Seller GSTIN", opt: "HSN No, BIS Certification, Shelf Life, Return Policy, Allow Dropshipping, Product Active" },
{ main: "Automobiles & Accessories", sub: "Bike Accessories", req: "Title, Description, Category, Subcategory, Product Images, Brand, Manufacturer, Manufacturer Address, Country of Origin, Net Quantity, Item Weight, Dimensions (L x W x H), Packaging Type, Warranty, Actual Price (MRP), Selling Price, GST Rate, Seller Name, Seller GSTIN", opt: "HSN No, BIS Certification, Shelf Life, Return Policy, Allow Dropshipping, Product Active" },
{ main: "Automobiles & Accessories", sub: "Maintenance Tools", req: "Title, Description, Category, Subcategory, Product Images, Brand, Manufacturer, Manufacturer Address, Country of Origin, Net Quantity, Item Weight, Dimensions (L x W x H), Packaging Type, Warranty, Actual Price (MRP), Selling Price, GST Rate, Seller Name, Seller GSTIN", opt: "HSN No, BIS Certification, Shelf Life, Return Policy, Allow Dropshipping, Product Active" },
{ main: "Pets", sub: "Pet Food", req: "Title, Description, Category, Subcategory, Product Images, Brand, Manufacturer, Manufacturer Address, Country of Origin, Net Quantity, Item Weight, Packaging Type, Shelf Life, Expiry Date, FSSAI License No, Batch Number, Actual Price (MRP), Selling Price, GST Rate, Seller Name, Seller GSTIN", opt: "HSN No, Dimensions (L x W x H), Return Policy, Allow Dropshipping, Product Active" },
{ main: "Pets", sub: "Pet Accessories", req: "Title, Description, Category, Subcategory, Product Images, Brand, Country of Origin, Net Quantity, Item Weight, Dimensions (L x W x H), Packaging Type, Actual Price (MRP), Selling Price, GST Rate, Seller Name, Seller GSTIN", opt: "HSN No, Manufacturer, Manufacturer Address, BIS Certification, Shelf Life, Return Policy, Warranty, Allow Dropshipping, Product Active" },
{ main: "Pets", sub: "Pet Grooming", req: "Title, Description, Category, Subcategory, Product Images, Brand, Manufacturer, Manufacturer Address, Country of Origin, Net Quantity, Item Weight, Packaging Type, Shelf Life, Actual Price (MRP), Selling Price, GST Rate, Seller Name, Seller GSTIN", opt: "HSN No, Dimensions (L x W x H), Expiry Date, Return Policy, Warranty, Allow Dropshipping, Product Active" },
{ main: "Gifts & Festive Needs", sub: "Personalized Gifts", req: "Title, Description, Category, Subcategory, Product Images, Brand, Country of Origin, Net Quantity, Item Weight, Dimensions (L x W x H), Packaging Type, Actual Price (MRP), Selling Price, GST Rate, Seller Name, Seller GSTIN", opt: "HSN No, Manufacturer, Manufacturer Address, BIS Certification, Shelf Life, Return Policy, Warranty, Allow Dropshipping, Product Active" },
{ main: "Gifts & Festive Needs", sub: "Festive Decorations", req: "Title, Description, Category, Subcategory, Product Images, Brand, Country of Origin, Net Quantity, Item Weight, Dimensions (L x W x H), Packaging Type, Actual Price (MRP), Selling Price, GST Rate, Seller Name, Seller GSTIN", opt: "HSN No, Manufacturer, Manufacturer Address, BIS Certification, Shelf Life, Return Policy, Warranty, Allow Dropshipping, Product Active" },
{ main: "Gifts & Festive Needs", sub: "Gift Cards", req: "Title, Description, Category, Subcategory, Net Quantity, Actual Price (MRP), Selling Price, GST Rate, Seller Name, Seller GSTIN ,Product Images,", opt: " HSN No, Country of Origin, Return Policy, Allow Dropshipping, Product Active" },
{ main: "Miscellaneous", sub: "Travel Accessories", req: "Title, Description, Category, Subcategory, Product Images, Brand, Country of Origin, Net Quantity, Item Weight, Dimensions (L x W x H), Packaging Type, Actual Price (MRP), Selling Price, GST Rate, Seller Name, Seller GSTIN", opt: "HSN No, Manufacturer, Manufacturer Address, BIS Certification, Shelf Life, Return Policy, Warranty, Allow Dropshipping, Product Active" },
{ main: "Miscellaneous", sub: "Office Supplies", req: "Title, Description, Category, Subcategory, Product Images, Brand, Country of Origin, Net Quantity, Item Weight, Dimensions (L x W x H), Packaging Type, Actual Price (MRP), Selling Price, GST Rate, Seller Name, Seller GSTIN", opt: "HSN No, Manufacturer, Manufacturer Address, BIS Certification, Shelf Life, Return Policy, Warranty, Allow Dropshipping, Product Active" },
{ main: "Miscellaneous", sub: "Others", req: "Title, Description, Category, Subcategory, Product Images, Brand, Country of Origin, Net Quantity, Item Weight, Dimensions (L x W x H), Packaging Type, Actual Price (MRP), Selling Price, GST Rate, Seller Name, Seller GSTIN", opt: "HSN No, Manufacturer, Manufacturer Address, BIS Certification, Shelf Life, Return Policy, Warranty, Allow Dropshipping, Product Active" },
{ main: "Industrial & Scientific", sub: "Lab Equipment", req: "Title, Description, Category, Subcategory, Product Images, Brand, Manufacturer, Manufacturer Address, Country of Origin, Net Quantity, Item Weight, Dimensions (L x W x H), Packaging Type, Warranty, BIS Certification, Actual Price (MRP), Selling Price, GST Rate, Seller Name, Seller GSTIN", opt: "HSN No, Shelf Life, Return Policy, Allow Dropshipping, Product Active" },
{ main: "Industrial & Scientific", sub: "Safety Supplies", req: "Title, Description, Category, Subcategory, Product Images, Brand, Manufacturer, Manufacturer Address, Country of Origin, Net Quantity, Item Weight, Dimensions (L x W x H), Packaging Type, BIS Certification, Actual Price (MRP), Selling Price, GST Rate, Seller Name, Seller GSTIN", opt: "HSN No, Shelf Life, Return Policy, Warranty, Allow Dropshipping, Product Active" },
{ main: "Gaming", sub: "Consoles & Accessories", req: "Title, Description, Category, Subcategory, Product Images, Brand, Manufacturer, Manufacturer Address, Country of Origin, Net Quantity, Item Weight, Dimensions (L x W x H), Packaging Type, Warranty, BIS Certification, E-Waste Compliant, Uses Recyclable Packaging, Actual Price (MRP), Selling Price, GST Rate, Seller Name, Seller GSTIN", opt: "HSN No, Return Policy, Allow Dropshipping, Product Active" },
{ main: "Gaming", sub: "Video Games", req: "Title, Description, Category, Subcategory, Product Images, Brand, Country of Origin, Net Quantity, Item Weight, Dimensions (L x W x H), Packaging Type, E-Waste Compliant, Actual Price (MRP), Selling Price, GST Rate, Seller Name, Seller GSTIN", opt: "HSN No, Manufacturer, Manufacturer Address, Return Policy, Allow Dropshipping, Product Active" },
{ main: "Tools & Hardware", sub: "Hand Tools", req: "Title, Description, Category, Subcategory, Product Images, Brand, Manufacturer, Manufacturer Address, Country of Origin, Net Quantity, Item Weight, Dimensions (L x W x H), Packaging Type, Warranty, Actual Price (MRP), Selling Price, GST Rate, Seller Name, Seller GSTIN", opt: "HSN No, BIS Certification, Shelf Life, Return Policy, Allow Dropshipping, Product Active" },
{ main: "Tools & Hardware", sub: "Power Tools", req: "Title, Description, Category, Subcategory, Product Images, Brand, Manufacturer, Manufacturer Address, Country of Origin, Net Quantity, Item Weight, Dimensions (L x W x H), Packaging Type, Warranty, BIS Certification, Actual Price (MRP), Selling Price, GST Rate, Seller Name, Seller GSTIN", opt: "HSN No, Shelf Life, Return Policy, Allow Dropshipping, Product Active" },
{ main: "Luxury & Collectibles", sub: "Art & Antiques", req: "Title, Description, Category, Subcategory, Product Images, Brand, Country of Origin, Item Weight, Dimensions (L x W x H), Actual Price (MRP), Selling Price, GST Rate, Seller Name, Seller GSTIN", opt: "HSN No, Net Quantity, Manufacturer, Manufacturer Address, BIS Certification, Packaging Type, Shelf Life, Return Policy, Warranty, Allow Dropshipping, Product Active" },
{ main: "Luxury & Collectibles", sub: "Limited Edition Products", req: "Title, Description, Category, Subcategory, Product Images, Brand, Manufacturer, Manufacturer Address, Country of Origin, Net Quantity, Item Weight, Dimensions (L x W x H), Actual Price (MRP), Selling Price, GST Rate, Seller Name, Seller GSTIN", opt: "HSN No, BIS Certification, Packaging Type, Shelf Life, Return Policy, Warranty, Allow Dropshipping, Product Active" },
{ main: "Construction & Building Materials", sub: "Cement, Paint & Finishes", req: "Title, Description, Category, Subcategory, Product Images, Brand, Manufacturer, Manufacturer Address, Country of Origin, Net Quantity, Item Weight, Packaging Type, Shelf Life, BIS Certification, Actual Price (MRP), Selling Price, GST Rate, Seller Name, Seller GSTIN", opt: "HSN No, Dimensions (L x W x H), Expiry Date, Return Policy, Warranty, Allow Dropshipping, Product Active" },
{ main: "Construction & Building Materials", sub: "Pipes & Fittings", req: "Title, Description, Category, Subcategory, Product Images, Brand, Manufacturer, Manufacturer Address, Country of Origin, Net Quantity, Item Weight, Dimensions (L x W x H), Packaging Type, BIS Certification, Actual Price (MRP), Selling Price, GST Rate, Seller Name, Seller GSTIN, HSN No", opt: "Shelf Life, Return Policy, Warranty, Allow Dropshipping, Product Active" },
// Add any other categories/subcategories from your table here...
];
const transformedRawMappingData = rawMappingData.map(item => {
  const optFields = item.opt ? item.opt.split(',').map(field => field.trim()) : [];
  
  // Add "Size" if not already present
  if (!optFields.includes("Size")) {
    optFields.push("Size");
  }
  
  return {
    ...item,
    opt: optFields.join(', ')
  };
});


// Generate the structured fieldMapping object
export const fieldMapping = {};

transformedRawMappingData.forEach(item => {
  if (!fieldMapping[item.main]) {
    fieldMapping[item.main] = {};
  }
  fieldMapping[item.main][item.sub] = {
    required: processFields(item.req),
    optional: processFields(item.opt)
  };
});
// rawMappingData.forEach(item => {
//   if (!fieldMapping[item.main]) {
//     fieldMapping[item.main] = {};
//   }
//   fieldMapping[item.main][item.sub] = {
//     required: processFields(item.req),
//     optional: processFields(item.opt),
//   };
// });

// Helper to get fields for a specific cat/subcat, with fallback
export const getFieldsForCategory = (category, subcategory) => {
  // Define core fields always required by the platform, regardless of category table
  const platformRequired = [
    'title',
    'description',
    'category',
    'subcategory',
    'images',
    'quantity',
    'MRP',
    'productPrice',
    'gstRate',
    
    'sellerName',
    'sellerGSTIN',
    'sellerContact',
    'hazardousMaterials',
    'isActive',
  ];
  const defaultFields = {required: platformRequired, optional: []}; // Default includes platform requirements

  let categoryFields = {required: [], optional: []};

  if (
    category &&
    subcategory &&
    fieldMapping[category] &&
    fieldMapping[category][subcategory]
  ) {
    categoryFields = fieldMapping[category][subcategory];
  } else if (
    category &&
    fieldMapping[category] &&
    fieldMapping[category]['Others']
  ) {
    // console.warn(`No specific mapping for ${category} -> ${subcategory}. Using 'Others'.`);
    categoryFields = fieldMapping[category]['Others'];
  } else if (category && subcategory) {
    // console.warn(`No mapping found for ${category} -> ${subcategory}. Using minimal defaults.`);
    // Use defaultFields directly if no mapping found
    categoryFields = {required: [], optional: []}; // No specific category rules apply
  } else {
    // Neither category nor subcategory selected, return minimal platform requirements
    return defaultFields;
  }

  // Combine platform required fields with category-specific required fields
  // Ensure platformRequired fields always stay in the required list
  const combinedRequired = [
    ...new Set([...platformRequired, ...categoryFields.required]),
  ];

  // Optional fields are ONLY those specified by the category mapping AND NOT already in the combined required list
  const combinedOptional = categoryFields.optional.filter(
    field => !combinedRequired.includes(field),
  );
// console.log(combinedRequired)
  return {
    required: combinedRequired,
    optional: combinedOptional,
  };
};
