// Stylelint: CSS por módulo. Los colores literales solo se permiten en core/css/tokens.css (ADR-0005).
export default {
  extends: ['stylelint-config-standard'],
  rules: {
    'selector-class-pattern': [
      '^[a-z][a-zA-Z0-9]*$',
      { message: 'Use camelCase para clases en CSS Modules (ej. .cardTitle)' },
    ],
    'color-no-hex': true,
    'color-named': 'never',
    'function-disallowed-list': ['rgb', 'rgba', 'hsl', 'hsla'],
  },
  overrides: [
    {
      files: ['apps/web/src/core/css/tokens.css'],
      rules: {
        'color-no-hex': null,
        'function-disallowed-list': null,
      },
    },
  ],
};
