module.exports = {
  env: {
    node: true,
    es6: true,
  },
  parser: "babel-eslint",
  parserOptions: {
    sourceType: "module",
  },
  rules: {
    // allow trailing comma
    "comma-dangle": ["error", "only-multiline"],
    "prefer-promise-reject-errors": 0,
    // allow paren-less arrow functions
    "arrow-parens": 0,
    quotes: "off",
    "no-return-assign": "off",
    // allow async-await
    "generator-star-spacing": 0,
    // allow debugger during development
    "no-debugger": process.env.NODE_ENV === "production" ? 2 : 0,
  },
}