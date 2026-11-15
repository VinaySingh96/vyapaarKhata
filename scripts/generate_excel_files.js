import * as fs from 'fs';
import * as path from 'path';
import * as XLSX from '../apps/web/node_modules/xlsx/xlsx.mjs';

const rentalItems = [
  // 1. Bamboo
  {
    "Category": "Bamboo & Wooden Balli",
    "Item Name": "Bamboo (10-12 ft)",
    "Item Code / SKU": "BAMBOO-10FT",
    "Unit": "pcs",
    "Initial Stock": 50,
    "Purchase Rate (Asset Cost)": 120,
    "Daily Rental Rate (Sell Rate)": 10,
    "Description": "Construction bamboo pole (10-12 ft) for scaffolding and support"
  },
  // 2. Balli
  {
    "Category": "Bamboo & Wooden Balli",
    "Item Name": "Balli (8-9 ft)",
    "Item Code / SKU": "BALLI-8-9FT",
    "Unit": "pcs",
    "Initial Stock": 300,
    "Purchase Rate (Asset Cost)": 80,
    "Daily Rental Rate (Sell Rate)": 1,
    "Description": "Wooden support balli 8 to 9 feet"
  },
  {
    "Category": "Bamboo & Wooden Balli",
    "Item Name": "Balli (10-11 ft)",
    "Item Code / SKU": "BALLI-10-11FT",
    "Unit": "pcs",
    "Initial Stock": 400,
    "Purchase Rate (Asset Cost)": 120,
    "Daily Rental Rate (Sell Rate)": 2,
    "Description": "Wooden support balli 10 to 11 feet"
  },
  {
    "Category": "Bamboo & Wooden Balli",
    "Item Name": "Balli (12 ft)",
    "Item Code / SKU": "BALLI-12FT",
    "Unit": "pcs",
    "Initial Stock": 200,
    "Purchase Rate (Asset Cost)": 160,
    "Daily Rental Rate (Sell Rate)": 13,
    "Description": "Wooden support balli 12 feet heavy duty"
  },
  {
    "Category": "Bamboo & Wooden Balli",
    "Item Name": "Balli (15 ft)",
    "Item Code / SKU": "BALLI-15FT",
    "Unit": "pcs",
    "Initial Stock": 50,
    "Purchase Rate (Asset Cost)": 220,
    "Daily Rental Rate (Sell Rate)": 5,
    "Description": "Wooden support balli 15 feet extra length"
  },
  // 3. Farma (Iron Frame for Pillars)
  // 9x9 size
  {
    "Category": "Pillar Farma (Iron Frame)",
    "Item Name": "Farma 9x9 (4 ft)",
    "Item Code / SKU": "FARMA-9X9-4FT",
    "Unit": "pcs",
    "Initial Stock": 10,
    "Purchase Rate (Asset Cost)": 800,
    "Daily Rental Rate (Sell Rate)": 20,
    "Description": "Pillar shuttering iron frame size 9 inch x 9 inch, height 4 ft"
  },
  {
    "Category": "Pillar Farma (Iron Frame)",
    "Item Name": "Farma 9x9 (5 ft)",
    "Item Code / SKU": "FARMA-9X9-5FT",
    "Unit": "pcs",
    "Initial Stock": 5,
    "Purchase Rate (Asset Cost)": 1000,
    "Daily Rental Rate (Sell Rate)": 25,
    "Description": "Pillar shuttering iron frame size 9 inch x 9 inch, height 5 ft"
  },
  {
    "Category": "Pillar Farma (Iron Frame)",
    "Item Name": "Farma 9x9 (6 ft)",
    "Item Code / SKU": "FARMA-9X9-6FT",
    "Unit": "pcs",
    "Initial Stock": 10,
    "Purchase Rate (Asset Cost)": 1200,
    "Daily Rental Rate (Sell Rate)": 30,
    "Description": "Pillar shuttering iron frame size 9 inch x 9 inch, height 6 ft"
  },
  // 9x12 size
  {
    "Category": "Pillar Farma (Iron Frame)",
    "Item Name": "Farma 9x12 (4 ft)",
    "Item Code / SKU": "FARMA-9X12-4FT",
    "Unit": "pcs",
    "Initial Stock": 8,
    "Purchase Rate (Asset Cost)": 1000,
    "Daily Rental Rate (Sell Rate)": 25,
    "Description": "Pillar shuttering iron frame size 9 inch x 12 inch, height 4 ft"
  },
  {
    "Category": "Pillar Farma (Iron Frame)",
    "Item Name": "Farma 9x12 (5 ft)",
    "Item Code / SKU": "FARMA-9X12-5FT",
    "Unit": "pcs",
    "Initial Stock": 10,
    "Purchase Rate (Asset Cost)": 1250,
    "Daily Rental Rate (Sell Rate)": 30,
    "Description": "Pillar shuttering iron frame size 9 inch x 12 inch, height 5 ft"
  },
  {
    "Category": "Pillar Farma (Iron Frame)",
    "Item Name": "Farma 9x12 (6 ft)",
    "Item Code / SKU": "FARMA-9X12-6FT",
    "Unit": "pcs",
    "Initial Stock": 10,
    "Purchase Rate (Asset Cost)": 1500,
    "Daily Rental Rate (Sell Rate)": 40,
    "Description": "Pillar shuttering iron frame size 9 inch x 12 inch, height 6 ft"
  },
  {
    "Category": "Pillar Farma (Iron Frame)",
    "Item Name": "Farma 9x12 (7 ft)",
    "Item Code / SKU": "FARMA-9X12-7FT",
    "Unit": "pcs",
    "Initial Stock": 4,
    "Purchase Rate (Asset Cost)": 1750,
    "Daily Rental Rate (Sell Rate)": 45,
    "Description": "Pillar shuttering iron frame size 9 inch x 12 inch, height 7 ft"
  },
  {
    "Category": "Pillar Farma (Iron Frame)",
    "Item Name": "Farma 9x12 (10 ft)",
    "Item Code / SKU": "FARMA-9X12-10FT",
    "Unit": "pcs",
    "Initial Stock": 8,
    "Purchase Rate (Asset Cost)": 2500,
    "Daily Rental Rate (Sell Rate)": 80,
    "Description": "Pillar shuttering iron frame size 9 inch x 12 inch, height 10 ft"
  },
  // 9x15 size
  {
    "Category": "Pillar Farma (Iron Frame)",
    "Item Name": "Farma 9x15 (7 ft)",
    "Item Code / SKU": "FARMA-9X15-7FT",
    "Unit": "pcs",
    "Initial Stock": 3,
    "Purchase Rate (Asset Cost)": 2200,
    "Daily Rental Rate (Sell Rate)": 50,
    "Description": "Pillar shuttering iron frame size 9 inch x 15 inch, height 7 ft"
  },
  // 4. Patra
  {
    "Category": "Centring Plates & Plywood",
    "Item Name": "Patra (Centring Steel Plate)",
    "Item Code / SKU": "PATRA-STEEL-PLATE",
    "Unit": "pcs",
    "Initial Stock": 500,
    "Purchase Rate (Asset Cost)": 350,
    "Daily Rental Rate (Sell Rate)": 1,
    "Description": "Heavy MS centring / shuttering slab sheet plate"
  },
  // 5. Chali
  {
    "Category": "Scaffolding & Grating",
    "Item Name": "Chali (Iron Scaffolding Grating)",
    "Item Code / SKU": "CHALI-GRATING",
    "Unit": "pcs",
    "Initial Stock": 30,
    "Purchase Rate (Asset Cost)": 1200,
    "Daily Rental Rate (Sell Rate)": 10,
    "Description": "Iron mesh walkway / scaffolding platform chali"
  },
  // 6. Ply
  {
    "Category": "Centring Plates & Plywood",
    "Item Name": "Ply (Centring Plywood Sheet)",
    "Item Code / SKU": "PLY-SHUTTERING",
    "Unit": "pcs",
    "Initial Stock": 40,
    "Purchase Rate (Asset Cost)": 850,
    "Daily Rental Rate (Sell Rate)": 20,
    "Description": "Waterproof film-faced shuttering plywood board"
  },
  // 7. Vibrator
  {
    "Category": "Centring Machinery & Tools",
    "Item Name": "Concrete Vibrator Machine",
    "Item Code / SKU": "VIBRATOR-MACHINE",
    "Unit": "pcs",
    "Initial Stock": 1,
    "Purchase Rate (Asset Cost)": 7500,
    "Daily Rental Rate (Sell Rate)": 250,
    "Description": "Electric concrete needle vibrator machine with 35mm needle"
  },
  // 8. Chowkardiya
  {
    "Category": "Scaffolding & Grating",
    "Item Name": "Chowkardiya (4-Way Support Stool)",
    "Item Code / SKU": "CHOWKARDIYA-STOOL",
    "Unit": "pcs",
    "Initial Stock": 8,
    "Purchase Rate (Asset Cost)": 600,
    "Daily Rental Rate (Sell Rate)": 20,
    "Description": "4-legged heavy duty iron centring base stool / connector"
  },
  // 9. Drum
  {
    "Category": "Site Equipment & Storage",
    "Item Name": "Water Storage Drum (200L)",
    "Item Code / SKU": "DRUM-WATER-200L",
    "Unit": "pcs",
    "Initial Stock": 4,
    "Purchase Rate (Asset Cost)": 800,
    "Daily Rental Rate (Sell Rate)": 20,
    "Description": "Heavy plastic / HDPE 200 Litre water storage drum for construction curing"
  }
];

// Sample template rows
const sampleTemplate = [
  {
    "Category": "Bamboo & Wooden Balli",
    "Item Name": "Bamboo (10-12 ft)",
    "Item Code / SKU": "BAMBOO-10FT",
    "Unit": "pcs",
    "Initial Stock": 50,
    "Purchase Rate (Asset Cost)": 120,
    "Daily Rental Rate (Sell Rate)": 10,
    "Description": "Example item description"
  },
  {
    "Category": "Pillar Farma (Iron Frame)",
    "Item Name": "Farma 9x9 (4 ft)",
    "Item Code / SKU": "FARMA-9X9-4FT",
    "Unit": "pcs",
    "Initial Stock": 10,
    "Purchase Rate (Asset Cost)": 800,
    "Daily Rental Rate (Sell Rate)": 20,
    "Description": "Example item description"
  }
];

function createXlsx(data, sheetName) {
  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName);
  return wb;
}

function saveWorkbook(wb, filePath) {
  const buf = XLSX.write(wb, { bookType: 'xlsx', type: 'buffer' });
  fs.writeFileSync(filePath, buf);
}

// 1. Patel Centring Store Excel
const wbPatel = createXlsx(rentalItems, 'Rental Items');
saveWorkbook(wbPatel, path.resolve('patel_centring_store_items.xlsx'));
saveWorkbook(wbPatel, path.resolve('apps/web/public/patel_centring_store_items.xlsx'));

// 2. Sample Template Excel
const wbSample = createXlsx(sampleTemplate, 'Items Template');
saveWorkbook(wbSample, path.resolve('sample_product_import_template.xlsx'));
saveWorkbook(wbSample, path.resolve('apps/web/public/sample_product_import_template.xlsx'));

// 3. Also write CSV versions
const wsPatel = XLSX.utils.json_to_sheet(rentalItems);
fs.writeFileSync('patel_centring_store_items.csv', XLSX.utils.sheet_to_csv(wsPatel));
fs.writeFileSync('apps/web/public/patel_centring_store_items.csv', XLSX.utils.sheet_to_csv(wsPatel));

const wsSample = XLSX.utils.json_to_sheet(sampleTemplate);
fs.writeFileSync('sample_product_import_template.csv', XLSX.utils.sheet_to_csv(wsSample));
fs.writeFileSync('apps/web/public/sample_product_import_template.csv', XLSX.utils.sheet_to_csv(wsSample));

console.log('✅ Generated Excel & CSV files successfully!');
console.log(`- Total items: ${rentalItems.length}`);
