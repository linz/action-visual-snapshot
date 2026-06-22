import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export async function build() {
  const html = await fs.readFile(path.resolve(__dirname, './index.ejs'), 'utf8');

  return await fs.writeFile(
    path.resolve(__dirname, './index.ts'),
    `const template = ${JSON.stringify({ html })}; export default template`,
  );
}

build()
  .then(() => true)
  .catch((err) => {
    throw err;
  });
