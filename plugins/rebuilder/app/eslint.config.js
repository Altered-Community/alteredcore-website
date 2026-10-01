// @ts-check
const eslint = require('@eslint/js');
const { defineConfig } = require('eslint/config');
const tseslint = require('typescript-eslint');
const angular = require('angular-eslint');

module.exports = defineConfig([
  {
    files: ['**/*.ts'],
    extends: [
      eslint.configs.recommended,
      tseslint.configs.recommended,
      tseslint.configs.stylistic,
      angular.configs.tsRecommended,
    ],
    processor: angular.processInlineTemplates,
    // Type information for the signal rules (no-uncalled-signals, reactive-context-must-read-signal).
    languageOptions: { parserOptions: { projectService: true, tsconfigRootDir: __dirname } },
    rules: {
      // Singleton services: @Service() (Angular 22), not @Injectable({ providedIn: 'root' }).
      '@angular-eslint/prefer-service-decorator': 'error',
      // Signals: likely mistakes.
      '@angular-eslint/computed-must-return': 'error',
      '@angular-eslint/no-uncalled-signals': 'error',
      '@angular-eslint/reactive-context-must-read-signal': 'error',
      // Signal APIs and the host object instead of the legacy decorators.
      '@angular-eslint/prefer-signals': 'error',
      '@angular-eslint/prefer-output-emitter-ref': 'error',
      '@angular-eslint/prefer-output-readonly': 'error',
      '@angular-eslint/prefer-host-metadata-property': 'error',
      // DI and lifecycle.
      '@angular-eslint/inject-at-top': 'error',
      '@angular-eslint/no-implicit-take-until-destroyed': 'error',
      '@angular-eslint/no-async-lifecycle-method': 'error',
      '@angular-eslint/no-lifecycle-call': 'error',
      '@angular-eslint/require-lifecycle-on-prototype': 'error',
      // Component metadata.
      '@angular-eslint/contextual-decorator': 'error',
      '@angular-eslint/no-duplicates-in-metadata-arrays': 'error',
      '@angular-eslint/no-pipe-impure': 'error',
      '@angular-eslint/relative-url-prefix': 'error',
      '@angular-eslint/consistent-component-styles': 'error',
      '@angular-eslint/use-component-view-encapsulation': 'error',
      '@angular-eslint/directive-selector': [
        'error',
        {
          type: 'attribute',
          prefix: ['app', 'ar'],
          style: 'camelCase',
        },
      ],
      '@angular-eslint/component-selector': [
        'error',
        {
          type: 'element',
          prefix: ['app', 'ar'],
          style: 'kebab-case',
        },
      ],
    },
  },
  {
    // One component per folder with its .html and .scss (CLAUDE.md); test hosts may stay inline.
    files: ['**/*.ts'],
    ignores: ['**/*.spec.ts'],
    rules: {
      '@angular-eslint/component-max-inline-declarations': ['error', { template: 0, styles: 0, animations: 0 }],
      '@angular-eslint/use-component-selector': 'error',
    },
  },
  {
    files: ['**/*.html'],
    extends: [angular.configs.templateRecommended, angular.configs.templateAccessibility],
    rules: {
      // arIconButton renders its icon and sets aria-label from its ariaLabel input.
      '@angular-eslint/template/elements-content': ['error', { allowList: ['arIconButton', 'ariaLabel'] }],
      // Control flow.
      '@angular-eslint/template/no-empty-control-flow': 'error',
      '@angular-eslint/template/prefer-at-else': 'error',
      '@angular-eslint/template/prefer-at-empty': 'error',
      '@angular-eslint/template/prefer-contextual-for-variables': 'error',
      '@angular-eslint/template/require-switch-default': 'error',
      // Bindings: [class.x] / [style.x] rather than ngClass / ngStyle, no interpolated attributes.
      '@angular-eslint/template/prefer-class-binding': 'error',
      '@angular-eslint/template/prefer-style-binding': 'error',
      '@angular-eslint/template/no-interpolation-in-attributes': 'error',
      '@angular-eslint/template/prefer-static-string-properties': 'error',
      '@angular-eslint/template/prefer-built-in-pipes': 'error',
      // Markup.
      '@angular-eslint/template/prefer-self-closing-tags': 'error',
      '@angular-eslint/template/no-nested-tags': 'error',
      '@angular-eslint/template/no-outerhtml': 'error',
      '@angular-eslint/template/no-positive-tabindex': 'error',
    },
  },
]);
