from flask import Blueprint, request, jsonify
from bson import ObjectId
from app.models import medicines_collection
import json

pharmacy_bp = Blueprint('pharmacy', __name__)


def serialize_doc(doc):
    """Convert MongoDB document to JSON-serializable dict."""
    doc['_id'] = str(doc['_id'])
    return doc


@pharmacy_bp.route('/medicines', methods=['GET'])
def get_medicines():
    """List all medicines with optional category filter."""
    category = request.args.get('category')
    query = {}
    if category:
        query['category'] = category
    medicines = list(medicines_collection.find(query))
    return jsonify([serialize_doc(m) for m in medicines])


@pharmacy_bp.route('/medicines', methods=['POST'])
def add_medicine():
    """Add a new medicine to the catalog."""
    data = request.get_json()
    required = ['name', 'category', 'price', 'stock', 'manufacturer']
    for field in required:
        if field not in data:
            return jsonify({'error': f'{field} is required'}), 400

    result = medicines_collection.insert_one({
        'name': data['name'],
        'category': data['category'],
        'price': float(data['price']),
        'stock': int(data['stock']),
        'manufacturer': data['manufacturer'],
        'requiresPrescription': data.get('requiresPrescription', False),
        'description': data.get('description', '')
    })
    return jsonify({'message': 'Medicine added', 'id': str(result.inserted_id)}), 201


@pharmacy_bp.route('/medicines/<medicine_id>', methods=['GET'])
def get_medicine(medicine_id):
    """Get a single medicine by ID."""
    try:
        medicine = medicines_collection.find_one({'_id': ObjectId(medicine_id)})
        if not medicine:
            return jsonify({'error': 'Medicine not found'}), 404
        return jsonify(serialize_doc(medicine))
    except Exception as e:
        return jsonify({'error': str(e)}), 400


@pharmacy_bp.route('/medicines/<medicine_id>/stock', methods=['PATCH'])
def update_stock(medicine_id):
    """Update stock quantity for a medicine."""
    data = request.get_json()
    if 'stock' not in data:
        return jsonify({'error': 'stock is required'}), 400

    try:
        result = medicines_collection.update_one(
            {'_id': ObjectId(medicine_id)},
            {'$set': {'stock': int(data['stock'])}}
        )
        if result.matched_count == 0:
            return jsonify({'error': 'Medicine not found'}), 404
        return jsonify({'message': 'Stock updated'})
    except Exception as e:
        return jsonify({'error': str(e)}), 400


@pharmacy_bp.route('/medicines/search', methods=['GET'])
def search_medicines():
    """Search medicines by name."""
    query = request.args.get('q', '')
    if not query:
        return jsonify({'error': 'Query parameter q is required'}), 400

    medicines = list(medicines_collection.find({
        'name': {'$regex': query, '$options': 'i'}
    }))
    return jsonify([serialize_doc(m) for m in medicines])
