from flask import Flask, request, jsonify
from flask_cors import CORS
from email_service import EmailService

app = Flask(__name__)
CORS(app)

email_service = EmailService()


@app.route('/api/health', methods=['GET'])
def health_check():
    return jsonify({"status": "healthy", "service": "Voice Email API"})


@app.route('/api/send-email', methods=['POST'])
def send_email():
    data = request.get_json(silent=True) or {}
    email = data.get('email')
    password = data.get('password')
    recipient = data.get('recipient')
    subject = data.get('subject')
    body = data.get('body')

    if not email or not password:
        return jsonify({"status": "error", "message": "Email and password are required"}), 400

    if not recipient:
        return jsonify({"status": "error", "message": "Recipient email address is required"}), 400

    result = email_service.send_email(
        user_email=email,
        password=password,
        recipient=recipient,
        subject=subject,
        body=body
    )

    status_code = 200 if result.get("status") == "success" else 400
    return jsonify(result), status_code


@app.route('/api/read-emails', methods=['POST'])
def read_emails():
    data = request.get_json(silent=True) or {}
    email = data.get('email')
    password = data.get('password')
    limit = data.get('limit', 5)

    if not email or not password:
        return jsonify({"status": "error", "message": "Email and password are required"}), 400

    result = email_service.fetch_inbox(
        user_email=email,
        password=password,
        max_emails=limit
    )

    status_code = 200 if result.get("status") == "success" else 400
    return jsonify(result), status_code


if __name__ == '__main__':
    app.run(debug=True, port=5000)
