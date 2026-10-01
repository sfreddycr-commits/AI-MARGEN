import { checkConventions } from './lib/index.js';

const issues = await checkConventions();
if (issues.length) {
  console.error(`✖ ${issues.length} problema(s) de convenciones de base de datos:\n`);
  for (const i of issues) console.error(`  [${i.rule}] ${i.file}: ${i.message}`);
  process.exit(1);
}
console.log('✔ Convenciones de base de datos OK (C1–C7).');
