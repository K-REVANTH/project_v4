from flask import Blueprint, request, jsonify
from bson import ObjectId
from app.models import records_collection
from datetime import datetime

records_bp = Blueprint('records', __name__)


def serialize_doc(doc):
    doc['_id'] = str(doc['_id'])
    return doc


@records_bp.route('/<patient_id>', methods=['GET'])
def get_records(patient_id):
    """Get all medical records for a patient."""
    records = list(records_collection.find({'patientId': patient_id}).sort('date', -1))
    return jsonify([serialize_doc(r) for r in records])


@records_bp.route('/', methods=['POST'])
def create_record():
    """Create a new medical record."""
    data = request.get_json()
    required = ['patientId', 'patientName', 'type', 'description']
    for field in required:
        if field not in data:
            return jsonify({'error': f'{field} is required'}), 400

    record = {
        'patientId': data['patientId'],
        'patientName': data['patientName'],
        'type': data['type'],
        'description': data['description'],
        'doctorName': data.get('doctorName', ''),
        'diagnosis': data.get('diagnosis', ''),
        'prescription': data.get('prescription', ''),
        'notes': data.get('notes', ''),
        'source': data.get('source', 'manual'),
        'date': data.get('date', datetime.utcnow().isoformat())
    }
    result = records_collection.insert_one(record)
    return jsonify({'message': 'Record created', 'id': str(result.inserted_id)}), 201


@records_bp.route('/<record_id>', methods=['PUT'])
def update_record(record_id):
    """Update an existing medical record."""
    data = request.get_json()
    try:
        result = records_collection.update_one(
            {'_id': ObjectId(record_id)},
            {'$set': data}
        )
        if result.matched_count == 0:
            return jsonify({'error': 'Record not found'}), 404
        return jsonify({'message': 'Record updated'})
    except Exception as e:
        return jsonify({'error': str(e)}), 400
