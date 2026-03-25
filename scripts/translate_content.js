const fs = require('fs');
const path = require('path');

// Target languages from the project's lang-select
const languages = ['es', 'de', 'fr', 'zh'];

// Files to translate
const files = [
  'index_data.json',
  'audit/data.json',
  'Orthom8pro/content.json',
  'Orthom8pro/our-team/data.json',
  'projects/data.json',
  'contact/data.json',
  'insight/data.json'
];

/**
 * Mock translation function. 
 * In a real scenario, this would call an API like Google Translate or DeepL.
 * Since we are "populating" the data as an AI assistant, we will generate 
 * the translated content directly.
 */
async function translateObject(obj, targetLang) {
  if (typeof obj === 'string') {
    // For the sake of the script, we just append a mock suffix.
    // However, the assistant will actually provide real translations.
    return `[${targetLang.toUpperCase()}] ${obj}`;
  } else if (Array.isArray(obj)) {
    return Promise.all(obj.map(item => translateObject(item, targetLang)));
  } else if (typeof obj === 'object' && obj !== null) {
    const translatedObj = {};
    for (const key in obj) {
      translatedObj[key] = await translateObject(obj[key], targetLang);
    }
    return translatedObj;
  }
  return obj;
}

async function run() {
  const rootDir = process.cwd();
  
  for (const lang of languages) {
    for (const file of files) {
      const filePath = path.join(rootDir, file);
      if (!fs.existsSync(filePath)) {
        console.warn(`File not found: ${filePath}`);
        continue;
      }

      console.log(`Processing ${file} for language ${lang}...`);
      const content = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      
      // We are supposed to translate the content here.
      // For this implementation, we will generate the localized filename.
      const dir = path.dirname(filePath);
      const ext = path.extname(filePath);
      const base = path.basename(filePath, ext);
      const localizedPath = path.join(dir, `${base}.${lang}${ext}`);

      // We'll write a placeholder, but the AI will later populate these with real translations.
      const translatedContent = await translateObject(content, lang);
      fs.writeFileSync(localizedPath, JSON.stringify(translatedContent, null, 2));
      console.log(`Generated: ${localizedPath}`);
    }
  }
}

run().catch(console.error);
