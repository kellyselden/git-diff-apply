module.exports = {
  root: true,
  parserOptions: {
    ecmaVersion: 2018
  },
  extends: [
    'sane-node'
  ],
  env: {
    es6: true
  },
  rules: {
    // https://github.com/eslint/eslint/issues/11899
    'require-atomic-updates': 0
  },
  overrides: [
    {
      files: ['bin/*.js'],
      rules: {
        'no-console': 'off'
      }
    },
    {
      files: ['test/**/*-test.js'],
      plugins: [
        'mocha'
      ],
      extends: [
        'plugin:mocha/recommended'
      ],
      env: {
        mocha: true
      },
      rules: {
        'mocha/no-setup-in-describe': 0,
        'mocha/no-exclusive-tests': 2
      }
    }
  ]
};
