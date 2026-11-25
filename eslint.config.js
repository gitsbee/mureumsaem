import tseslint from 'typescript-eslint';

export default [
  {
    files: ['**/*.{js,mjs,cjs,jsx}'],
    languageOptions: { ecmaVersion: 'latest', sourceType: 'module', parserOptions: { ecmaFeatures: { jsx: true } } },
    rules: { 'no-debugger': 'error', 'no-unreachable': 'error' },
  },
  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: { parser: tseslint.parser },
    rules: { 'no-debugger': 'error', 'no-unreachable': 'error' },
  },
  { ignores: ['node_modules/**', 'dist/**', 'docs/design-system/**'] },
];
