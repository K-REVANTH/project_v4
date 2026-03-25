module.exports = {
  PORT: process.env.PORT || 3001,
  MONGO_URI: process.env.MONGO_URI || 'mongodb://localhost:27017/healthcare_users',
  JWT_SECRET: process.env.JWT_SECRET || 'dev-jwt-secret-key',
  JWT_EXPIRY: process.env.JWT_EXPIRY || '24h',
  RABBITMQ_URL: process.env.RABBITMQ_URL || 'amqp://localhost:5672'
};
