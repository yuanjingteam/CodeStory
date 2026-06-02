const path = require('path');
const tsConfigPaths = require('tsconfig-paths');

tsConfigPaths.register({
  baseUrl: path.join(__dirname, 'dist'),
  paths: {
    '@/*': ['*'],
    'shared/*': ['../shared/*'],
  },
});

require('./dist/app.js');
