const path = require('path');

module.exports = function override(config, env) {
  console.log("Override config running...");

  config.paths = (paths) => {
    const publicPath = path.resolve(__dirname, 'frontend', 'public');
    console.log("Setting appPublic to: ", publicPath);

    const htmlPath = path.resolve(publicPath, 'index.html');
    console.log("Setting appHtml to: ", htmlPath);

    paths.appPublic = publicPath;
    paths.appHtml = htmlPath;

    return paths;
  };

  return config;
};
