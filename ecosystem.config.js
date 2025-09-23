module.exports = {
  apps: [
    {
      name: 'hubspot-integration-server',
      script: 'dist/index.js',
      instances: 1,
      exec_mode: 'fork',
      watch: false,
      env: {
        NODE_ENV: 'production',
      },
      error_file: 'logs/error.log',
      out_file: 'logs/combined.log',
      time: true,
    },
  ],
};
