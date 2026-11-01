import eslint from "@eslint/js";
import vue from "eslint-plugin-vue";
import tseslint from "typescript-eslint";

export default [
  {
    ignores: [
      "**/dist/**",
      "**/node_modules/**",
      "**/.pnpm-store/**",
      "**/.cache/**",
      "docs/reference/Cluenite_Complete_Blueprint_v1.0/**",
    ],
  },
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  ...vue.configs["flat/recommended"],
  {
    files: ["**/*.vue"],
    languageOptions: {
      globals: {
        URLSearchParams: "readonly",
        clearInterval: "readonly",
        console: "readonly",
        crypto: "readonly",
        document: "readonly",
        fetch: "readonly",
        HTMLDivElement: "readonly",
        HTMLElement: "readonly",
        Response: "readonly",
        setInterval: "readonly",
        SVGPathElement: "readonly",
        window: "readonly",
      },
      parserOptions: {
        parser: tseslint.parser,
      },
    },
  },
];
