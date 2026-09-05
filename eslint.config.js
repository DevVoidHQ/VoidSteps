import js from "@eslint/js";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import tseslint from "typescript-eslint";

// Bans em dash (U+2014) and en dash (U+2013) in source text, since the repo
// requires periods, commas or colons instead.
//
// JSXText is listed separately and matters most: it is not a Literal node, so
// a string-literal-only selector reports clean while user-visible prose in
// markup carries dashes. Three shipped that way before this entry existed.
//
// Comments are genuinely out of reach. ESLint does not visit them as AST
// nodes, so no selector can catch them and the pre-commit hook remains the
// backstop there.
const DASHES = "[\\u2013\\u2014]";
const noDashRule = {
  selector: [
    `Literal[value=/${DASHES}/]`,
    `TemplateElement[value.raw=/${DASHES}/]`,
    `JSXText[value=/${DASHES}/]`,
  ].join(", "),
  message: "Do not use em dashes or en dashes. Use periods, commas or colons instead.",
};

export default tseslint.config(
  {
    ignores: ["dist", "node_modules", "desktop", "coverage"],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    // The build config files are CommonJS and run in Node, not the browser.
    // Without this they fail no-undef on `module` and `require`.
    files: ["*.js", "*.cjs"],
    languageOptions: {
      globals: globals.node,
      sourceType: "commonjs",
    },
  },
  {
    files: ["app/**/*.{ts,tsx}"],
    languageOptions: {
      ecmaVersion: 2022,
      globals: globals.browser,
    },
    plugins: {
      "react-hooks": reactHooks,
      "react-refresh": reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      "react-refresh/only-export-components": ["warn", { allowConstantExport: true }],

      // This is a 20k line existing codebase, so keep the bar close to defaults
      // and avoid rules that would mass-fail existing code on day one.
      "@typescript-eslint/no-unused-vars": [
        "warn",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],

      // eslint-plugin-react-hooks v7 turns on the React Compiler diagnostics,
      // which flag 34 existing places (mostly setState inside an effect). They
      // are worth seeing and worth fixing, but each one is a behavioural
      // refactor, so they stay warnings rather than blocking every pull
      // request from day one. Fix them opportunistically, then promote these
      // to "error" once the count reaches zero.
      "react-hooks/set-state-in-effect": "warn",
      "react-hooks/set-state-in-render": "warn",
      "react-hooks/refs": "warn",
      "react-hooks/purity": "warn",
      "react-hooks/immutability": "warn",
      "react-hooks/preserve-manual-memoization": "warn",
      "react-hooks/static-components": "warn",
      "react-hooks/incompatible-library": "warn",
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-empty-object-type": "off",
      "@typescript-eslint/ban-ts-comment": "off",
      "no-restricted-syntax": ["error", noDashRule],

      // localStorage throws in private browsing and when the quota is full,
      // and the graph view's viewport cache is not worth surfacing that to the
      // user. An empty catch is the intent there, so allow it rather than
      // making people write a no-op body to satisfy the rule.
      "no-empty": ["error", { allowEmptyCatch: true }],
    },
  }
);
