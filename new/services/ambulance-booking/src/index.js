const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const amqp = require('amqplib');
const config = require('./config');
const ambulanceRoutes = require('./routes/ambulanceRoutes');

const app = express();

app.use(cors());
app.use(express.json());

app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'ambulance-booking', timestamp: new Date().toISOString() });
});

app.use('/api/ambulance', ambulanceRoutes);

// RabbitMQ Publisher
async function setupPublisher() {
  try {
    const connection = await amqp.connect(config.RABBITMQ_URL);
    const channel = await connection.createChannel();
    await channel.assertExchange('healthcare_events', 'topic', { durable: true });

    app.locals.publishEvent = (routingKey, data) => {
      channel.publish('healthcare_events', routingKey, Buffer.from(JSON.stringify(data)));
      console.log(`[RabbitMQ] Published ${routingKey}:`, data);
    };

    console.log('[RabbitMQ] Publisher ready');
  } catch (err) {
    console.error('[RabbitMQ] Publisher error:', err.message);
    setTimeout(setupPublisher, 5000);
  }
}

mongoose.connect(config.MONGO_URI)
  .then(() => {
    console.log('Connected to MongoDB');
    app.listen(config.PORT, () => {
      console.log(`Ambulance Booking Service running on port ${config.PORT}`);
    });
    setupPublisher();
  })
  .catch(err => {
    console.error('MongoDB connection error:', err);
    process.exit(1);
  });

module.exports = app;
