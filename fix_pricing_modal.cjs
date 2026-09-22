const fs = require('fs');
const file = 'D:/VCB/Pricing/qms_fe-hhoang/src/components/PricingModal.tsx';
let content = fs.readFileSync(file, 'utf8');

if (!content.includes('import { useAuth } from')) {
  content = content.replace("import {", "import { useAuth } from '../auth/AuthGate';\nimport { formatStoneDisplay } from '../utils/stoneFormatter';\nimport {");
}

if (!content.includes('const { currentRole } = useAuth();')) {
  content = content.replace('  const [submittingId, setSubmittingId] = useState<string | null>(null);', '  const { currentRole } = useAuth();\n  const [submittingId, setSubmittingId] = useState<string | null>(null);');
}

content = content.replace(/\{s\.name\} \(\{formatCurrency\(s\.price\)\}\)/g, '{formatStoneDisplay(s, currentRole)}');

fs.writeFileSync(file, content, 'utf8');
