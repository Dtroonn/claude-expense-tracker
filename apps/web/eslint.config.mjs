import next from '@expense-tracker/eslint-config/next';

export default [
  ...next,
  {
    ignores: ['.next/**', 'next-env.d.ts'],
  },
];
