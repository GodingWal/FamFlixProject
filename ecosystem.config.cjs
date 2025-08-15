module.exports = {
  apps: [{
    name: 'famflix',
    script: 'dist/index.js',
    // Ensure PM2 runs the app from the project root so relative paths work
    cwd: process.env.FAMFLIX_CWD || __dirname,
    exec_mode: 'fork',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '500M',
    env_file: '.env',
    env: {
      NODE_ENV: 'production',
      PORT: 5000,
      // Allow forcing mock storage via env without hard-coding it here
      FORCE_MOCK_STORAGE: process.env.FORCE_MOCK_STORAGE
    },
    env_production: {
      NODE_ENV: 'production',
      PORT: 5000,
      FORCE_MOCK_STORAGE: process.env.FORCE_MOCK_STORAGE
    }
  }]
};