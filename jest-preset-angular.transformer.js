const angularTransformer = require('jest-preset-angular').default.createTransformer({
  tsconfig: '<rootDir>/tsconfig.spec.json',
  stringifyContentPathRegex: '\\.(html|svg)$',
  diagnostics: false
});

function replaceImportMetaUrl(sourceText) {
  // Jest runs the suite as CommonJS, where import.meta is unavailable. Angular
  // still receives the real expression in production; this only supplies an
  // equivalent base URL while transforming files for the test environment.
  return sourceText.replace(/import\.meta\.url/g, 'document.baseURI');
}

module.exports = {
  ...angularTransformer,
  process(sourceText, sourcePath, transformOptions) {
    return angularTransformer.process(replaceImportMetaUrl(sourceText), sourcePath, transformOptions);
  },
  getCacheKey(sourceText, sourcePath, transformOptions) {
    return angularTransformer.getCacheKey(replaceImportMetaUrl(sourceText), sourcePath, transformOptions);
  }
};
