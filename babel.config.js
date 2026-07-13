module.exports = function (api) {
  api.cache(true);
  return {
    // unstable_transformImportMeta: zustand v5 ships ESM with import.meta,
    // which Metro's web bundle otherwise leaves untransformed (blank page).
    presets: [['babel-preset-expo', { unstable_transformImportMeta: true }]],
    plugins: [
      [
        'module-resolver',
        {
          alias: {
            '@': './src',
          },
        },
      ],
    ],
  };
};
