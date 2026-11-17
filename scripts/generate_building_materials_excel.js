/**
 * Generates the building-materials catalog for a Mirzapur (UP) dealer
 * (Patel Building Materials / Neelkanth Enterprises, near Tedua Bata).
 *
 *   node scripts/generate_building_materials_excel.js
 *
 * Columns match the Products → Excel import. Units use only the defaults every store gets
 * (bag, cft, kg, pcs). Rates are indicative local market rates (₹) — review before import.
 */
import * as fs from 'fs';
import * as path from 'path';
import * as XLSX from '../apps/web/node_modules/xlsx/xlsx.mjs';

const item = (category, name, nameHi, sku, unit, stock, purchase, selling, description) => ({
  Category: category,
  'Item Name': name,
  'Item Name (Hindi)': nameHi,
  'Item Code / SKU': sku,
  Unit: unit,
  'Initial Stock': stock,
  'Purchase Rate': purchase,
  'Selling Price': selling,
  Description: description,
});

const items = [
  // 1. Cement Karkat (AC roofing sheets)
  item('Cement Karkat (Roof Sheet)', 'Cement Karkat Sheet 6 ft', 'सीमेंट करकट चादर 6 फीट', 'KARKAT-6FT', 'pcs', 40, 420, 470, 'Asbestos-cement corrugated roofing sheet, 6 ft'),
  item('Cement Karkat (Roof Sheet)', 'Cement Karkat Sheet 8 ft', 'सीमेंट करकट चादर 8 फीट', 'KARKAT-8FT', 'pcs', 50, 560, 620, 'Asbestos-cement corrugated roofing sheet, 8 ft'),
  item('Cement Karkat (Roof Sheet)', 'Cement Karkat Sheet 10 ft', 'सीमेंट करकट चादर 10 फीट', 'KARKAT-10FT', 'pcs', 40, 700, 780, 'Asbestos-cement corrugated roofing sheet, 10 ft'),
  item('Cement Karkat (Roof Sheet)', 'Cement Karkat Sheet 12 ft', 'सीमेंट करकट चादर 12 फीट', 'KARKAT-12FT', 'pcs', 25, 840, 930, 'Asbestos-cement corrugated roofing sheet, 12 ft'),
  item('Cement Karkat (Roof Sheet)', 'Karkat Ridge Cap', 'करकट रिज कैप (मुंडेर)', 'KARKAT-RIDGE', 'pcs', 30, 140, 170, 'Ridge cap for top joint of karkat roof'),
  item('Cement Karkat (Roof Sheet)', 'Karkat J-Hook Bolt with Washer', 'करकट जे-बोल्ट वाशर सहित', 'KARKAT-JBOLT', 'pcs', 300, 6, 10, 'J-hook bolt with bitumen washer to fix karkat sheets'),

  // 2. Cement (50 kg bags)
  item('Cement', 'UltraTech PPC Cement', 'अल्ट्राटेक पीपीसी सीमेंट', 'CEM-UT-PPC', 'bag', 200, 375, 395, 'UltraTech Portland Pozzolana Cement, 50 kg bag'),
  item('Cement', 'UltraTech OPC 43 Grade Cement', 'अल्ट्राटेक ओपीसी 43 ग्रेड सीमेंट', 'CEM-UT-OPC43', 'bag', 80, 390, 410, 'UltraTech Ordinary Portland Cement 43 grade, 50 kg bag'),
  item('Cement', 'UltraTech OPC 53 Grade Cement', 'अल्ट्राटेक ओपीसी 53 ग्रेड सीमेंट', 'CEM-UT-OPC53', 'bag', 80, 400, 420, 'UltraTech OPC 53 grade for slab/pillar casting, 50 kg bag'),
  item('Cement', 'UltraTech Weather Plus Cement', 'अल्ट्राटेक वेदर प्लस सीमेंट', 'CEM-UT-WPLUS', 'bag', 150, 405, 430, 'UltraTech Weather Plus water-repellent PPC for roof & exterior, 50 kg bag'),
  item('Cement', 'UltraTech Super Cement', 'अल्ट्राटेक सुपर सीमेंट', 'CEM-UT-SUPER', 'bag', 60, 395, 415, 'UltraTech Super premium PPC, 50 kg bag'),
  item('Cement', 'ACC Suraksha PPC Cement', 'एसीसी सुरक्षा पीपीसी सीमेंट', 'CEM-ACC-SURAKSHA', 'bag', 150, 365, 385, 'ACC Suraksha Portland Pozzolana Cement, 50 kg bag'),
  item('Cement', 'ACC Gold Water Shield Cement', 'एसीसी गोल्ड वॉटर शील्ड सीमेंट', 'CEM-ACC-GOLD', 'bag', 100, 410, 435, 'ACC Gold water-shield premium cement for roof, 50 kg bag'),
  item('Cement', 'ACC F2R OPC 53 Grade Cement', 'एसीसी F2R ओपीसी 53 ग्रेड सीमेंट', 'CEM-ACC-F2R', 'bag', 60, 395, 415, 'ACC F2R fast-setting OPC 53 grade, 50 kg bag'),
  item('Cement', 'ACC Concrete+ Cement', 'एसीसी कंक्रीट प्लस सीमेंट', 'CEM-ACC-CONCPLUS', 'bag', 60, 400, 420, 'ACC Concrete+ for slab/RCC work, 50 kg bag'),
  item('Cement', 'Samrat PPC Cement', 'सम्राट पीपीसी सीमेंट', 'CEM-SAMRAT-PPC', 'bag', 200, 335, 355, 'Samrat Portland Pozzolana Cement, 50 kg bag (economy)'),
  item('Cement', 'Samrat OPC 43 Grade Cement', 'सम्राट ओपीसी 43 ग्रेड सीमेंट', 'CEM-SAMRAT-OPC43', 'bag', 80, 350, 370, 'Samrat OPC 43 grade, 50 kg bag'),

  // 3. Gitti (stone aggregate, per cft)
  item('Gitti (Stone Aggregate)', 'Gitti 10 mm (Kapchi)', 'गिट्टी 10 एमएम (कपची)', 'GITTI-10MM', 'cft', 600, 48, 58, 'Fine 10 mm stone chips for PCC and slab top'),
  item('Gitti (Stone Aggregate)', 'Gitti 20 mm', 'गिट्टी 20 एमएम', 'GITTI-20MM', 'cft', 1500, 45, 55, '20 mm aggregate for RCC roof, beam and pillar casting'),
  item('Gitti (Stone Aggregate)', 'Gitti 40 mm', 'गिट्टी 40 एमएम', 'GITTI-40MM', 'cft', 800, 40, 50, '40 mm aggregate for foundation PCC and base'),
  item('Gitti (Stone Aggregate)', 'Kala Patthar Gitti 20 mm (Black Stone)', 'काला पत्थर गिट्टी 20 एमएम', 'GITTI-BLACK-20MM', 'cft', 800, 55, 66, 'Hard black-stone 20 mm aggregate for high-strength RCC'),
  item('Gitti (Stone Aggregate)', 'Lal Gitti 20 mm (Mirzapur Sandstone)', 'लाल गिट्टी 20 एमएम (मिर्जापुरी)', 'GITTI-RED-20MM', 'cft', 600, 38, 46, 'Local Mirzapur red sandstone 20 mm aggregate'),
  item('Gitti (Stone Aggregate)', 'Boulder / Rora (Foundation Stone)', 'बोल्डर / रोड़ा', 'GITTI-BOULDER', 'cft', 500, 30, 38, 'Large stone boulders for foundation and soling'),

  // 4. Balu (sand, per cft)
  item('Balu (Sand)', 'Lal Balu (Sone River Sand)', 'लाल बालू (सोन)', 'BALU-SONE', 'cft', 1500, 58, 70, 'Coarse red Sone river sand for RCC and masonry'),
  item('Balu (Sand)', 'Morang (Yellow Coarse Sand)', 'मोरंग (पीली बालू)', 'BALU-MORANG', 'cft', 1000, 52, 62, 'Coarse yellow morang for concrete and brickwork'),
  item('Balu (Sand)', 'Ganga Balu (Safed Fine Sand)', 'गंगा बालू (सफेद बालू)', 'BALU-GANGA', 'cft', 1200, 22, 28, 'Fine white Ganga sand for plaster and masonry'),
  item('Balu (Sand)', 'Bharai Balu (Filling Sand)', 'भराई बालू', 'BALU-FILLING', 'cft', 1500, 12, 16, 'Low-grade sand for plinth and floor filling'),

  // 5. Sariya / Chhad (TMT bars, per kg)
  item('Sariya / Chhad (TMT Bar)', 'Tata Tiscon TMT Sariya 8 mm', 'टाटा टिस्कॉन सरिया 8 एमएम', 'TMT-TATA-8MM', 'kg', 1500, 70, 76, 'Tata Tiscon Fe-550D TMT bar 8 mm (rings/stirrups)'),
  item('Sariya / Chhad (TMT Bar)', 'Tata Tiscon TMT Sariya 10 mm', 'टाटा टिस्कॉन सरिया 10 एमएम', 'TMT-TATA-10MM', 'kg', 2000, 69, 75, 'Tata Tiscon Fe-550D TMT bar 10 mm (roof slab)'),
  item('Sariya / Chhad (TMT Bar)', 'Tata Tiscon TMT Sariya 12 mm', 'टाटा टिस्कॉन सरिया 12 एमएम', 'TMT-TATA-12MM', 'kg', 2500, 68, 74, 'Tata Tiscon Fe-550D TMT bar 12 mm (beam, pillar)'),
  item('Sariya / Chhad (TMT Bar)', 'Tata Tiscon TMT Sariya 16 mm', 'टाटा टिस्कॉन सरिया 16 एमएम', 'TMT-TATA-16MM', 'kg', 1500, 68, 74, 'Tata Tiscon Fe-550D TMT bar 16 mm (pillar, footing)'),
  item('Sariya / Chhad (TMT Bar)', 'Kamdhenu TMT Sariya 8 mm', 'कामधेनु सरिया 8 एमएम', 'TMT-KAMD-8MM', 'kg', 1000, 63, 68, 'Kamdhenu Fe-500 TMT bar 8 mm'),
  item('Sariya / Chhad (TMT Bar)', 'Kamdhenu TMT Sariya 10 mm', 'कामधेनु सरिया 10 एमएम', 'TMT-KAMD-10MM', 'kg', 1500, 62, 67, 'Kamdhenu Fe-500 TMT bar 10 mm'),
  item('Sariya / Chhad (TMT Bar)', 'Kamdhenu TMT Sariya 12 mm', 'कामधेनु सरिया 12 एमएम', 'TMT-KAMD-12MM', 'kg', 1500, 61, 66, 'Kamdhenu Fe-500 TMT bar 12 mm'),
  item('Sariya / Chhad (TMT Bar)', 'Local Fe-500 Sariya 6 mm', 'लोकल सरिया 6 एमएम', 'TMT-LOCAL-6MM', 'kg', 800, 56, 61, 'Economy Fe-500 bar 6 mm for rings'),
  item('Sariya / Chhad (TMT Bar)', 'Local Fe-500 Sariya 8 mm', 'लोकल सरिया 8 एमएम', 'TMT-LOCAL-8MM', 'kg', 1500, 55, 60, 'Economy Fe-500 TMT bar 8 mm'),
  item('Sariya / Chhad (TMT Bar)', 'Local Fe-500 Sariya 10 mm', 'लोकल सरिया 10 एमएम', 'TMT-LOCAL-10MM', 'kg', 2000, 54, 59, 'Economy Fe-500 TMT bar 10 mm'),
  item('Sariya / Chhad (TMT Bar)', 'Local Fe-500 Sariya 12 mm', 'लोकल सरिया 12 एमएम', 'TMT-LOCAL-12MM', 'kg', 2000, 54, 59, 'Economy Fe-500 TMT bar 12 mm'),
  item('Sariya / Chhad (TMT Bar)', 'Local Fe-500 Sariya 16 mm', 'लोकल सरिया 16 एमएम', 'TMT-LOCAL-16MM', 'kg', 1000, 54, 59, 'Economy Fe-500 TMT bar 16 mm'),
  item('Sariya / Chhad (TMT Bar)', 'Local Fe-500 Sariya 20 mm', 'लोकल सरिया 20 एमएम', 'TMT-LOCAL-20MM', 'kg', 500, 54, 59, 'Economy Fe-500 TMT bar 20 mm (heavy columns)'),

  // 6. Sariya binding wire (per kg)
  item('Binding Wire', 'Binding Wire 18 Gauge', 'बाइंडिंग तार 18 गेज', 'BWIRE-18G', 'kg', 150, 72, 85, 'GI annealed binding wire 18 gauge for tying sariya'),
  item('Binding Wire', 'Binding Wire 20 Gauge', 'बाइंडिंग तार 20 गेज', 'BWIRE-20G', 'kg', 100, 75, 88, 'GI annealed binding wire 20 gauge (fine)'),

  // 7. Bhassi (stone chips + dust mix, per cft)
  item('Bhassi (Stone Dust Mix)', 'Bhassi (Chips + Powder Mix)', 'भस्सी (गिट्टी चूरा मिश्रण)', 'BHASSI-MIX', 'cft', 1000, 22, 28, 'Mixture of small gitti chips and stone powder for PCC/flooring base'),
  item('Bhassi (Stone Dust Mix)', 'Stone Dust (Patthar Chura)', 'पत्थर चूरा (डस्ट)', 'BHASSI-DUST', 'cft', 600, 18, 24, 'Fine crusher stone dust for block work and filling'),

  // 8. Waterproofing chemicals (roof slab & base pillars)
  item('Waterproofing Chemical', 'UltraTech Weather Pro WP+200 1 L', 'अल्ट्राटेक वेदर प्रो WP+200 1 लीटर', 'WP-UT-WP200-1L', 'pcs', 20, 170, 200, 'Integral waterproofing liquid mixed in concrete for roof slab'),
  item('Waterproofing Chemical', 'UltraTech Weather Pro WP+200 5 L', 'अल्ट्राटेक वेदर प्रो WP+200 5 लीटर', 'WP-UT-WP200-5L', 'pcs', 10, 780, 880, 'Integral waterproofing liquid for roof casting (5 L can)'),
  item('Waterproofing Chemical', 'Dr. Fixit LW+ 1 L', 'डॉ. फिक्सिट LW+ 1 लीटर', 'WP-DRF-LW-1L', 'pcs', 20, 180, 210, 'Integral liquid waterproofing for roof slab and plaster'),
  item('Waterproofing Chemical', 'Dr. Fixit LW+ 5 L', 'डॉ. फिक्सिट LW+ 5 लीटर', 'WP-DRF-LW-5L', 'pcs', 10, 820, 920, 'Integral liquid waterproofing (5 L can)'),
  item('Waterproofing Chemical', 'Dr. Fixit Pidifin 2K 1 kg', 'डॉ. फिक्सिट पिडिफिन 2K 1 किलो', 'WP-DRF-PIDIFIN-1KG', 'pcs', 15, 260, 300, 'Bitumen-based coating for footing, base pillars and plinth'),
  item('Waterproofing Chemical', 'Dr. Fixit Roofseal 4 L', 'डॉ. फिक्सिट रूफसील 4 लीटर', 'WP-DRF-ROOFSEAL-4L', 'pcs', 8, 1600, 1800, 'Elastomeric roof-top waterproof coating for existing roofs'),

  // 9. Cover blocks for roof dhalai (support under sariya)
  item('Cover Block (Dhalai)', 'Cover Block 20 mm', 'कवर ब्लॉक 20 एमएम (ढलाई)', 'CBLOCK-20MM', 'pcs', 2000, 2, 3, 'Cement spacer block to keep 20 mm cover under roof sariya'),
  item('Cover Block (Dhalai)', 'Cover Block 25 mm', 'कवर ब्लॉक 25 एमएम (ढलाई)', 'CBLOCK-25MM', 'pcs', 2000, 2.5, 4, 'Cement spacer block for slab/beam, 25 mm cover'),
  item('Cover Block (Dhalai)', 'Cover Block 40 mm', 'कवर ब्लॉक 40 एमएम (ढलाई)', 'CBLOCK-40MM', 'pcs', 1000, 3.5, 5, 'Cement spacer block for pillars and footing, 40 mm cover'),
  item('Cover Block (Dhalai)', 'Cover Block 50 mm', 'कवर ब्लॉक 50 एमएम (ढलाई)', 'CBLOCK-50MM', 'pcs', 500, 4.5, 6, 'Cement spacer block for foundation footing, 50 mm cover'),
];

const skus = new Set();
for (const i of items) {
  if (skus.has(i['Item Code / SKU'])) throw new Error(`Duplicate SKU ${i['Item Code / SKU']}`);
  skus.add(i['Item Code / SKU']);
}

const ws = XLSX.utils.json_to_sheet(items);
ws['!cols'] = [{ wch: 26 }, { wch: 40 }, { wch: 34 }, { wch: 20 }, { wch: 6 }, { wch: 12 }, { wch: 13 }, { wch: 12 }, { wch: 60 }];
const wb = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(wb, ws, 'Building Materials');
const buf = XLSX.write(wb, { bookType: 'xlsx', type: 'buffer' });
const csv = '﻿' + XLSX.utils.sheet_to_csv(ws);

for (const dir of ['.', 'apps/web/public']) {
  fs.writeFileSync(path.resolve(dir, 'patel_building_materials_items.xlsx'), buf);
  fs.writeFileSync(path.resolve(dir, 'patel_building_materials_items.csv'), csv);
}

const byCategory = items.reduce((m, i) => ((m[i.Category] = (m[i.Category] || 0) + 1), m), {});
console.log(`✅ Generated patel_building_materials_items.xlsx/.csv with ${items.length} items`);
for (const [c, n] of Object.entries(byCategory)) console.log(`   - ${c}: ${n}`);
