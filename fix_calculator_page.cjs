const fs = require('fs');
const file = 'D:/VCB/Pricing/qms_fe-hhoang/src/pages/CalculatorPage.tsx';
let content = fs.readFileSync(file, 'utf8');

if (!content.includes('import { useAuth } from')) {
  content = content.replace("import { fetchMasterData", "import { useAuth } from '../auth/AuthGate';\nimport { formatStoneDisplay } from '../utils/stoneFormatter';\nimport { fetchMasterData");
}

if (!content.includes('const { currentRole } = useAuth();')) {
  content = content.replace('  const [stoneCatalog, setStoneCatalog] = useState<StoneCatalogItem[]>([]);', '  const { currentRole } = useAuth();\n  const [stoneCatalog, setStoneCatalog] = useState<StoneCatalogItem[]>([]);');
}

content = content.replace(/<option key=\{s\.id\} value=\{s\.id\}>\{s\.name\}\{s\.size \? \` \(\$\{s\.size\}\)\` : ''\}<\/option>/g, '<option key={s.id} value={s.id}>{formatStoneDisplay(s, currentRole)}</option>');

content = content.replace(/const name = stoneCatalog\.find\(\(s\) => s\.id === r\.stoneId\)\?\.name;/g, 'const stone = stoneCatalog.find((s) => s.id === r.stoneId);\n                        const name = stone ? formatStoneDisplay(stone, currentRole) : undefined;');

fs.writeFileSync(file, content, 'utf8');
