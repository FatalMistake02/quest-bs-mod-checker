import fs from 'fs';
import path from 'path';

const modsDir = path.join(process.cwd(), 'public', 'mods');
const index = {};

for (const version of fs.readdirSync(modsDir)) {
  const versionPath = path.join(modsDir, version);
  if (!fs.statSync(versionPath).isDirectory()) continue;

  index[version] = fs
    .readdirSync(versionPath)
    .filter(f => f.endsWith('.json'))
    .sort();
}

fs.writeFileSync(
  path.join(modsDir, 'index.json'),
  JSON.stringify(index, null, 2)
);

console.log('Generated public/mods/index.json');
