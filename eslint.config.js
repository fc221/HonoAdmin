import antfu from '@antfu/eslint-config'

const sharedRestrictedImportPatterns = [
  {
    group: ['**/*.ts', '**/*.tsx'],
    message: 'Import specifiers must not include .ts or .tsx extensions.',
  },
]

const coreRestrictedImportPatterns = [
  ...sharedRestrictedImportPatterns,
  {
    group: ['**/adapter/*', '**/adapter/**'],
    message: 'Core, service, route, and utility modules must not import adapters directly.',
  },
]

export default antfu(
  {
    isInEditor: false,
    typescript: true,
    formatters: true,
    stylistic: {
      indent: 2,
      quotes: 'single',
      semi: false,
    },
    unicorn: false,
    jsdoc: false,
    react: false,
    vue: true,
    ignores: ['**/.wrangler/**', '**/dist/**', '**/drizzle/**', '**/*.md'],
  },
  {
    files: ['**/*.{js,ts,tsx}'],
    rules: {
      'no-console': 'off',
      'no-debugger': 'off',
      'ts/no-explicit-any': 'off',
      'ts/no-require-imports': 'off',
      'ts/consistent-type-imports': 'off',
      'ts/consistent-type-definitions': 'off',

      'style/quote-props': ['warn', 'consistent-as-needed'],
      'style/wrap-regex': ['warn'],
      'style/arrow-parens': ['warn', 'always'],
      'style/brace-style': ['warn', '1tbs', { allowSingleLine: true }],
      'style/comma-dangle': ['warn', 'only-multiline'],
      'antfu/if-newline': 'off',
      'antfu/no-top-level-await': 'off',

      'eqeqeq': ['off'],
      'ts/ban-ts-comment': 'off',
      'ts/no-unsafe-function-type': 'off',
      'no-throw-literal': 'off',
      'node/prefer-global/buffer': 'off',
      'node/prefer-global/process': 'off',
      'node/prefer-global/console': 'off',

      'unused-imports/no-unused-imports': 'error',
      'unused-imports/no-unused-vars': [
        'warn',
        {
          vars: 'all',
          varsIgnorePattern: '^_',
          args: 'after-used',
          argsIgnorePattern: '^_',
        },
      ],
      'prefer-template': 'warn',

      'jsonc/sort-keys': 'off',
      'no-restricted-imports': [
        'error',
        {
          patterns: sharedRestrictedImportPatterns,
        },
      ],
    },
  },
  {
    files: [
      'app/routes/**/*.{ts,tsx}',
      'app/service/**/*.{ts,tsx}',
      'app/utils/**/*.{ts,tsx}',
    ],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: coreRestrictedImportPatterns,
        },
      ],
    },
  },
)
