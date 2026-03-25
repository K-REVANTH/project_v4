const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const amqp = require('amqplib');
const config = require('./config');
const userRoutes = require('./routes/userRoutes');
const User = require('./models/User');

const app = express();

app.use(cors());
app.use(express.json());

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'user-management', timestamp: new Date().toISOString() });
});

// Routes
app.use('/api/users', userRoutes);

// RabbitMQ Consumer — listen for ambulance.requested events
async function startConsumer() {
  try {
    const connection = await amqp.connect(config.RABBITMQ_URL);
    const channel = await connection.createChannel();

    await channel.assertExchange('healthcare_events', 'topic', { durable: true });
    const q = await channel.assertQueue('user-notifications', { durable: true });
    await channel.bindQueue(q.queue, 'healthcare_events', 'ambulance.requested');

    console.log('[RabbitMQ] Listening for ambulance.requested events');

    channel.consume(q.queue, async (msg) => {
      if (msg) {
        try {
          const data = JSON.parse(msg.content.toString());
          console.log('[RabbitMQ] Received ambulance.requested:', data);

          // Add notification to user
          if (data.userId) {
            await User.findByIdAndUpdate(data.userId, {
              $push: {
                notifications: {
                  message: `Ambulance request ${data.bookingId} confirmed`,
                  type: 'ambulance'
                }
              }
            });
          }
          channel.ack(msg);
        } catch (err) {
          console.error('[RabbitMQ] Error processing message:', err);
          channel.nack(msg, false, false);
        }
      }
    });
  } catch (err) {
    console.error('[RabbitMQ] Consumer error:', err.message);
    setTimeout(startConsumer, 5000);
  }
}

// Connect to MongoDB and start server
mongoose.connect(config.MONGO_URI)
  .then(() => {
    console.log('Connected to MongoDB');
    app.listen(config.PORT, () => {
      console.log(`User Management Service running on port ${config.PORT}`);
    });
    startConsumer();
  })
  .catch(err => {
    console.error('MongoDB connection error:', err);
    process.exit(1);
  });

module.exports = app;
