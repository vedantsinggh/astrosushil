import nextVitals from 'eslint-config-next/core-web-vitals';

const config = [
  ...nextVitals,
  {
    rules: {
      // The Admin app does not use React Compiler; these existing effects load/reset data.
      'react-hooks/set-state-in-effect': 'off',
    },
  },
];

export default config;
