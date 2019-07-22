module.exports = {
  root: true,
  parserOptions: {
    ecmaVersion: 2018
  },
  plugins: [
    'node'
  ],
  extends: [
    'sane',
    'plugin:node/recommended'
  ],
  env: {
    es6: true,
    node: true
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
      env: {
        mocha: true
      },
      rules: {
        'mocha/no-exclusive-tests': 'error'
      }
    }
  ]
};
