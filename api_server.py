import os
import json
import time
from flask import Flask, send_from_directory, jsonify, request
from pipeline.health_coach import HealthCoach
from pipeline.config import PipelineConfig

app = Flask(__name__, static_folder='frontend')

# Initialize ADEO Engine
config = PipelineConfig()
coach = HealthCoach(config)
USER_ID = "web_user_1"

@app.after_request
def add_header(response):
    response.headers['Cache-Control'] = 'no-store, no-cache, must-revalidate, post-check=0, pre-check=0, max-age=0'
    response.headers['Pragma'] = 'no-cache'
    response.headers['Expires'] = '-1'
    return response

@app.route('/')
def serve_index():
    return send_from_directory('frontend', 'index.html')

@app.route('/<path:path>')
def serve_static(path):
    return send_from_directory('frontend', path)

@app.route('/api/health')
def get_health():
    # Simulate current sensor sample
    sample = {
        "heart_rate_bpm": 70 + (time.time() % 10),
        "hrv_ms": 50 + (time.time() % 5),
        "spo2_pct": 98,
        "activity_intensity": 0
    }
    battery = request.args.get('battery', default=100, type=int)
    
    result = coach.process_realtime(USER_ID, sample, battery_level=battery)
    
    # Filter out non-serializable parts
    clean_data = {k: v for k, v in result['cleaned'].items() if k != 'past_patterns'}
    
    return jsonify({
        "data": clean_data,
        "insight": result['insight'],
        "alerts": result['alerts'],
        "metadata": result.get('fusion', {})
    })

@app.route('/api/chat', methods=['POST'])
def chat():
    data = request.json
    message = data.get('message', '')
    battery = data.get('battery', 100)
    
    # Run the Multi-Agent orchestrator
    # We mock the current health data for the chat context
    health_data = {
        "heart_rate_bpm": 72,
        "computed_stress": 25,
        "hrv_ms": 55
    }
    
    response = coach.intelligent_engine.generate_intelligent_response(
        user_message=message,
        health_data=health_data,
        battery_level=battery
    )
    
    return jsonify({
        "response": response['response'],
        "confidence": response['confidence'],
        "metadata": response.get('metadata', {})
    })

@app.route('/api/insights')
def get_insights():
    user_id = request.args.get('user_id', default=USER_ID)
    insights = coach.intelligent_engine.get_advanced_insights(user_id)
    return jsonify(insights)

if __name__ == '__main__':
    print("🚀 ADEO API Server starting on http://localhost:5000")
    app.run(port=5000, debug=True)
