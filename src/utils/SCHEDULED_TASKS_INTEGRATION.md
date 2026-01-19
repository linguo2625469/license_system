# Scheduled Tasks Integration Guide

## Overview
The scheduled tasks module (`scheduledTasks.js`) provides automated background jobs for the license management system.

## Integration Instructions

When creating `src/app.js` (Task 18.3), add the following code to initialize scheduled tasks:

```javascript
const ScheduledTasks = require('./utils/scheduledTasks');

// ... other app initialization code ...

// Initialize scheduled tasks
ScheduledTasks.init();

// ... start server ...

// Handle graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM signal received: closing HTTP server');
  ScheduledTasks.stop();
  server.close(() => {
    logger.info('HTTP server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  logger.info('SIGINT signal received: closing HTTP server');
  ScheduledTasks.stop();
  server.close(() => {
    logger.info('HTTP server closed');
    process.exit(0);
  });
});
```

## Current Scheduled Tasks

### 1. Heartbeat Timeout Check
- **Schedule**: Every minute (`* * * * *`)
- **Function**: `HeartbeatService.checkTimeout()`
- **Purpose**: Checks for sessions that haven't sent a heartbeat within the configured timeout period and marks them as offline
- **Configuration**: Timeout duration is set in `src/config/app.js` as `heartbeatTimeout` (default: 30 seconds)

## Adding New Scheduled Tasks

To add a new scheduled task:

1. Add a new static method to the `ScheduledTasks` class in `src/utils/scheduledTasks.js`
2. Use `cron.schedule()` with the appropriate cron expression
3. Call the method from `ScheduledTasks.init()`

Example:
```javascript
static startNewTask() {
  // Run every hour at minute 0
  cron.schedule('0 * * * *', async () => {
    try {
      logger.debug('Starting new task');
      // Task logic here
      logger.info('New task completed');
    } catch (error) {
      logger.error('New task failed', { error: error.message });
    }
  });
  
  logger.info('New task started');
}
```

## Cron Expression Reference

```
* * * * *
│ │ │ │ │
│ │ │ │ └─── Day of week (0-7, 0 and 7 are Sunday)
│ │ │ └───── Month (1-12)
│ │ └─────── Day of month (1-31)
│ └───────── Hour (0-23)
└─────────── Minute (0-59)
```

Common patterns:
- `* * * * *` - Every minute
- `*/5 * * * *` - Every 5 minutes
- `0 * * * *` - Every hour
- `0 0 * * *` - Every day at midnight
- `0 0 * * 0` - Every Sunday at midnight
