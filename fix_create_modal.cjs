const fs = require('fs');
const file = 'D:/VCB/Pricing/qms_fe-hhoang/src/components/CreateModal.tsx';
let content = fs.readFileSync(file, 'utf8');

// fix imports
content = content.replace(/import \{ useAuth \} from '\.\.\/auth\/AuthGate';\r?\nimport \{ formatStoneDisplay \} from '\.\.\/utils\/stoneFormatter';\r?\nimport \{ useModalA11y \} from '\.\.\/hooks\/useModalA11y';\r?\nimport \{ formatStoneDisplay \} from '\.\.\/utils\/stoneFormatter';\r?\nimport \{ useModalA11y \} from '\.\.\/hooks\/useModalA11y';/, "import { useAuth } from '../auth/AuthGate';\nimport { formatStoneDisplay } from '../utils/stoneFormatter';\nimport { useModalA11y } from '../hooks/useModalA11y';");

// add role
if (!content.includes('const { currentRole } = useAuth();')) {
  content = content.replace('  const fileInputRef = useRef<HTMLInputElement>(null);', '  const { currentRole } = useAuth();\n  const fileInputRef = useRef<HTMLInputElement>(null);');
}

// replace stone display
content = content.replace(/\{s\.name\}/g, '{formatStoneDisplay(s, currentRole)}');

fs.writeFileSync(file, content, 'utf8');
