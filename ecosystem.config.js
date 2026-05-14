module.exports = {
  apps: [{
    name: 'esp32-cam-streaming',
    script: './server/index.js',
    
    // Instances
    instances: 1,
    exec_mode: 'fork', // Use 'cluster' for multiple instances
    
    // Environment variables
    env: {
      NODE_ENV: 'development',
      PORT: 3000
    },
    env_production: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    
    // Logging
    error_file: './logs/pm2-error.log',
    out_file: './logs/pm2-out.log',
    log_file: './logs/pm2-combined.log',
    time: true,
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    
    // Advanced features
    watch: false, // Set to true for development auto-reload
    ignore_watch: [
      'node_modules',
      'logs',
      'uploads',
      'data',
      '.git'
    ],
    
    // Restart policy
    max_memory_restart: '500M',
    restart_delay: 4000,
    autorestart: true,
    max_restarts: 10,
    min_uptime: '10s',
    
    // Graceful shutdown
    kill_timeout: 5000,
    wait_ready: true,
    listen_timeout: 10000,
    
    // Source map support
    source_map_support: true,
    
    // Merge logs from cluster instances
    merge_logs: true,
    
    // Additional options
    cron_restart: '0 3 * * *', // Restart every day at 3 AM (optional)
  }]
};
