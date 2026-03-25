module.exports = {
  PORT: process.env.PORT || 3003,
  MONGO_URI: process.env.MONGO_URI || 'mongodb://localhost:27017/healthcare_labs',
  RABBITMQ_URL: process.env.RABBITMQ_URL || 'amqp://localhost:5672'
};
