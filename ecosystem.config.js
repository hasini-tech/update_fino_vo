module.exports = {
  apps: [
    {
      name: 'finovo-backend',
      cwd: '/var/www/finov-o/Backend',
      script: 'server.js',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
        PORT: 5000  // Adjust to your backend port
      },
      error_file: '/var/log/pm2/finovo-backend-error.log',
      out_file: '/var/log/pm2/finovo-backend-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z'
    },
    {
      name: 'finovo-frontend',
      cwd: '/var/www/finov-o/Frontend',
      script: 'npx',
      args: 'serve -s build -l 3000',  // Serves the built React app
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production'
      },
      error_file: '/var/log/pm2/finovo-frontend-error.log',
      out_file: '/var/log/pm2/finovo-frontend-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z'
    }
  ]
};
