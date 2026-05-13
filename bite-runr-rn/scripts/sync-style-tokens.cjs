const fs = require("node:fs");

const css = fs.readFileSync("./global.css", "utf8");

function parseVarsFromCss(css) {
  const lightVars = {};
  const darkVars = {};

  const rootMatch = css.match(/:root\s*{([^}]*)}/s);
  if (rootMatch) {
    const vars = rootMatch[1].matchAll(/--([^:]+):\s*([^;]+);/g);
    for (const m of vars) {
      lightVars[m[1].trim()] = m[2].trim();
    }
  }

  const darkBlock =
    css.match(/\.dark\s*{([^}]*)}/s)?.[1] ||
    css.match(/\.dark\s*:root\s*{([^}]*)}/s)?.[1] ||
    css.match(/\.dark:root\s*{([^}]*)}/s)?.[1] ||
    null;

  if (darkBlock) {
    const vars = darkBlock.matchAll(/--([^:]+):\s*([^;]+);/g);
    for (const m of vars) {
      darkVars[m[1].trim()] = m[2].trim();
    }
  }

  return { lightVars, darkVars };
}

const tokens = parseVarsFromCss(css);
fs.writeFileSync("./tokens.json", JSON.stringify(tokens, null, 2));
