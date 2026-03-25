import os

PORT = int(os.environ.get('PORT', 5002))
MONGO_URI = os.environ.get('MONGO_URI', 'mongodb://localhost:27017/healthcare_records')
RABBITMQ_URL = os.environ.get('RABBITMQ_URL', 'amqp://localhost:5672')
