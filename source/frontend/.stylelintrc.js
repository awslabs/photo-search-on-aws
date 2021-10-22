module.exports = {
  plugins: [
    'stylelint-order',
    'stylelint-prettier',
    'stylelint-scss',
    'stylelint-declaration-block-no-ignored-properties',
  ],
  extends: ['stylelint-config-recommended-scss', 'stylelint-config-standard', 'stylelint-config-prettier'],
  ignoreFiles: ['**/node_modules/**'],
  rules: {
    'at-rule-no-unknown': null,
    'declaration-block-no-duplicate-properties': true,
    'function-calc-no-invalid': true,
    'function-calc-no-unspaced-operator': true,
    indentation: 2,
    'order/properties-alphabetical-order': true,
    'plugin/declaration-block-no-ignored-properties': true,
    'scss/at-rule-no-unknown': [
      true,
      {
        ignoreAtRules: ['use', 'forward'],
      },
    ],
  },
};
