import os

PORT = int(os.environ.get('PORT', 5001))
MONGO_URI = os.environ.get('MONGO_URI', 'mongodb://localhost:27017/healthcare_pharmacy')
