import threading
import json
import time
import pika
from app import create_app
from app.config import PORT, RABBITMQ_URL
from app.models import records_collection
from datetime import datetime

app = create_app()


def rabbitmq_consumer():
    """Background thread that consumes appointment.booked and lab.booked events."""
    while True:
        try:
            connection = pika.BlockingConnection(pika.URLParameters(RABBITMQ_URL))
            channel = connection.channel()

            channel.exchange_declare(exchange='healthcare_events', exchange_type='topic', durable=True)
            result = channel.queue_declare(queue='medical-records-events', durable=True)
            queue_name = result.method.queue

            channel.queue_bind(exchange='healthcare_events', queue=queue_name, routing_key='appointment.booked')
            channel.queue_bind(exchange='healthcare_events', queue=queue_name, routing_key='lab.booked')

            print('[RabbitMQ] Consumer listening for appointment.booked, lab.booked')

            def callback(ch, method, properties, body):
                try:
                    data = json.loads(body)
                    routing_key = method.routing_key
                    print(f'[RabbitMQ] Received {routing_key}: {data}')

                    if routing_key == 'appointment.booked':
                        records_collection.insert_one({
                            'patientId': data.get('patientId', ''),
                            'patientName': data.get('patientName', ''),
                            'type': 'appointment',
                            'description': f'Appointment with Dr. {data.get("doctorName", "Unknown")}',
                            'doctorName': data.get('doctorName', ''),
                            'date': data.get('date', datetime.utcnow().isoformat()),
                            'source': 'rabbitmq-auto',
                            'notes': f'Time slot: {data.get("timeSlot", "N/A")}'
                        })
                        print('[RabbitMQ] Auto-created appointment record')

                    elif routing_key == 'lab.booked':
                        records_collection.insert_one({
                            'patientId': data.get('patientId', ''),
                            'patientName': data.get('patientName', ''),
                            'type': 'lab_test',
                            'description': f'Lab test: {data.get("testName", "Unknown")}',
                            'date': data.get('scheduledDate', datetime.utcnow().isoformat()),
                            'source': 'rabbitmq-auto',
                            'notes': f'Booking ID: {data.get("bookingId", "N/A")}'
                        })
                        print('[RabbitMQ] Auto-created lab test record')

                    ch.basic_ack(delivery_tag=method.delivery_tag)
                except Exception as e:
                    print(f'[RabbitMQ] Error processing message: {e}')
                    ch.basic_nack(delivery_tag=method.delivery_tag, requeue=False)

            channel.basic_consume(queue=queue_name, on_message_callback=callback, auto_ack=False)
            channel.start_consuming()

        except Exception as e:
            print(f'[RabbitMQ] Connection error: {e}. Retrying in 5 seconds...')
            time.sleep(5)


if __name__ == '__main__':
    # Start RabbitMQ consumer in a background thread
    consumer_thread = threading.Thread(target=rabbitmq_consumer, daemon=True)
    consumer_thread.start()

    app.run(host='0.0.0.0', port=PORT, debug=False)
