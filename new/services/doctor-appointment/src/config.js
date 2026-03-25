module.exports = {
  PORT: process.env.PORT || 3002,
  MONGO_URI: process.env.MONGO_URI || 'mongodb://localhost:27017/healthcare_doctors',
  RABBITMQ_URL: process.env.RABBITMQ_URL || 'amqp://localhost:5672'
};
