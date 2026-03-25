const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const amqp = require('amqplib');
const config = require('./config');
const doctorRoutes = require('./routes/doctorRoutes');

const app = express();

app.use(cors());
app.use(express.json());

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'doctor-appointment', timestamp: new Date().toISOString() });
});

// Routes
app.use('/api/doctors', doctorRoutes);

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

// Connect and start
mongoose.connect(config.MONGO_URI)
  .then(() => {
    console.log('Connected to MongoDB');
    app.listen(config.PORT, () => {
      console.log(`Doctor Appointment Service running on port ${config.PORT}`);
    });
    setupPublisher();
  })
  .catch(err => {
    console.error('MongoDB connection error:', err);
    process.exit(1);
  });

module.exports = app;
