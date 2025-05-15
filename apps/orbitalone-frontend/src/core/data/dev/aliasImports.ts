import fs from "fs";
import path from "path";

const SRC_ROOT = path.resolve("src");

function walk(dir: string): void {
  const files: fs.Dirent[] = fs.readdirSync(dir, { withFileTypes: true });
  for (const file of files) {
    const fullPath = path.join(dir, file.name);
    if (file.isDirectory()) {
      walk(fullPath);
    } else if (file.name.match(/\.(ts|tsx)$/)) {
      rewriteImports(fullPath);
    }
  }
}

function rewriteImports(filePath: string): void {
  const content = fs.readFileSync(filePath, "utf-8");

  const updated = content.replace(
    /from\s+['"](\.{1,2}\/)+([^'"]+)['"]/g,
    (match, _dots, relPath) => {
      if (!relPath.trim()) return match;
      return `from '@/` + relPath + `'`;
    }
  );

  if (updated !== content) {
    fs.writeFileSync(filePath, updated, "utf-8");
    console.log(`✅ Updated: ${filePath}`);
  }
}

walk(SRC_ROOT);
