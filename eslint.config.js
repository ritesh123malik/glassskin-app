const tseslint = require('typescript-eslint');

module.exports = tseslint.config(
  {
    ignores: [
      "**/node_modules/**",
      "**/.expo/**",
      "**/supabase/**",
      "**/dist/**",
      "**/babel.config.js",
      "**/metro.config.js",
      "**/tailwind.config.js",
      "**/jest.config.js",
      "**/jest.setup.js"
    ]
  },
  ...tseslint.configs.recommended,
  {
    files: ["**/*.js", "**/*.ts", "**/*.tsx", "App.tsx"],
    languageOptions: {
      parserOptions: {
        ecmaFeatures: {
          jsx: true,
        },
      },
    },
    rules: {
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/no-unused-vars": ["error", { 
        "argsIgnorePattern": "^_",
        "varsIgnorePattern": "^_" 
      }],
      "@typescript-eslint/ban-ts-comment": "warn",
      "@typescript-eslint/no-require-imports": "warn",
      "no-unused-vars": "off",
      "no-console": ["warn", { "allow": ["warn", "error"] }],
      "no-debugger": "error"
    }
  }
);
