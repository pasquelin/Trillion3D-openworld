/**
 * Every source file fits 200 physical lines, as in Trillion3D: split by responsibility, never
 * exempted.
 */
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

const MAX_LINES = 200;
const files = execFileSync('git', ['ls-files', '-co', '--exclude-standard', '-z'], {
  encoding: 'utf8',
})
  .split('\0')
  .filter((file) => /\.(?:[cm]?[jt]s)$/.test(file));
const errors = files.flatMap((file) => {
  const source = readFileSync(file, 'utf8');
  const lines = source ? source.split('\n').length - Number(source.endsWith('\n')) : 0;
  return lines > MAX_LINES ? [`${file}: ${lines} lines; maximum ${MAX_LINES}`] : [];
});
for (const error of errors) console.error(error);
if (errors.length) process.exit(1);
console.log(`${files.length} files within ${MAX_LINES} lines`);
