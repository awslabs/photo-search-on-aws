module.exports = {
  env: {
    browser: true,
    es6: true,
    node: true,
  },
  plugins: ['react', 'react-hooks', '@typescript-eslint', 'jest'],
  extends: [
    'eslint:recommended',
    'plugin:react/recommended',
    'plugin:react-hooks/recommended',
    'plugin:jest/recommended',
    'plugin:@typescript-eslint/eslint-recommended',
    'plugin:@typescript-eslint/recommended',
    'prettier',
  ],
  globals: {
    Atomics: 'readonly',
    SharedArrayBuffer: 'readonly',
  },
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaFeatures: {
      jsx: true,
    },
    project: './tsconfig.json',
    sourceType: 'module',
    createDefaultProgram: true,
  },
  settings: {
    react: {
      version: 'detect',
    },
  },
  root: true,
  rules: {
    indent: 'off',
    'eol-last': ['error', 'always'],
    'func-style': [
      'error',
      'expression',
      {
        allowArrowFunctions: true,
      },
    ],
    'max-len': [
      'error',
      {
        code: 120,
        ignoreUrls: true,
        ignoreComments: true,
        ignoreStrings: true,
      },
    ],
    'new-cap': [
      'error',
      {
        newIsCap: false,
      },
    ],
    'no-dupe-class-members': 'error',
    'no-unused-vars': 'off',
    'no-var': 'error',
    'object-shorthand': ['error', 'always'],
    'prefer-arrow-callback': 'error',
    'prefer-const': 'error',
    'prefer-spread': 'error',
    'require-yield': 'error',
    'require-jsdoc': 'off',
    'react/jsx-uses-vars': 1,
    'react/jsx-uses-react': [1],
    'react-hooks/exhaustive-deps': 'off',
    '@typescript-eslint/ban-types': 0,
    '@typescript-eslint/explicit-function-return-type': 'off',
    '@typescript-eslint/explicit-member-accessibility': 'off',
    '@typescript-eslint/no-unnecessary-type-assertion': 'error',
    '@typescript-eslint/no-unused-vars': [
      'error',
      {
        vars: 'all',
        args: 'none',
      },
    ],
    '@typescript-eslint/quotes': ['error', 'single'],
    'react/prop-types': [0],
    'react/display-name': 'off',
  },
};
