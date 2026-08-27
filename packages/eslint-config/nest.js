import base from './base.js';

export default [
  ...base,
  {
    files: ['**/*.ts'],
    languageOptions: {
      parserOptions: {
        sourceType: 'commonjs',
      },
    },
    rules: {
      // Nest's DI and decorator metadata rely on patterns these rules dislike.
      //
      // consistent-type-imports is actively unsafe here: with emitDecoratorMetadata,
      // `import { type Foo }` is erased, so `design:paramtypes` emits `Function`
      // instead of the class and Nest cannot resolve the dependency at runtime.
      // Injected constructor params must be value imports.
      '@typescript-eslint/consistent-type-imports': 'off',
      '@typescript-eslint/no-extraneous-class': 'off',
      '@typescript-eslint/interface-name-prefix': 'off',
      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/explicit-module-boundary-types': 'off',
    },
  },
  {
    files: ['**/*.spec.ts', '**/*.e2e-spec.ts'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
    },
  },
];
