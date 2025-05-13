from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
import face_recognition
from pymongo import MongoClient
import base64
from io import BytesIO
import os
from PIL import Image
import numpy as np


app = Flask(__name__)
CORS(app)  # Enable CORS for all routes

UPLOAD_FOLDER = 'public/images/user'  # Folder where images are stored

def get_db_connection():
    client = MongoClient("mongodb+srv://tathien2003:Hien0908127818@cluster0.8n0cg.mongodb.net")
    db = client["nestjs"]  # Tên database
    return db

@app.route('/compare-image', methods=['POST'])
def compare_image():
    try:
        data = request.json
        image_data = data['image']
        print("Received image data:", image_data[:100])  # Print the first 100 characters to verify

        # Decode the base64 image
        try:
            image_data = image_data.split(',')[1]  # Extract the base64 part of the image data
            image_bytes = base64.b64decode(image_data)
            img = Image.open(BytesIO(image_bytes))
            img.verify()  # Verify that it is an image
            img = Image.open(BytesIO(image_bytes))  # Reopen for processing
        except Exception as e:
            print("Error decoding base64 image or opening image:", str(e))
            return jsonify({"success": False, "message": "Invalid image format"}), 400

        # Convert PIL image to a format that face_recognition can process
        try:
            img_byte_arr = BytesIO()
            img.save(img_byte_arr, format='PNG')
            img_byte_arr = img_byte_arr.getvalue()
            img_array = face_recognition.load_image_file(BytesIO(img_byte_arr))
        except Exception as e:
            print("Error converting PIL image to image array:", str(e))
            return jsonify({"success": False, "message": "Error processing image"}), 400

        # Get face encodings
        try:
            img_encoding = face_recognition.face_encodings(img_array)
            if len(img_encoding) == 0:
                return jsonify({"success": False, "message": "No face detected in the image"}), 400
            img_encoding = img_encoding[0]
        except Exception as e:
            print("Error getting face encodings:", str(e))
            return jsonify({"success": False, "message": "Error detecting faces"}), 400

        # Compare with images in the uploads folder
        user_found = False
        user_name = None
        db = get_db_connection()
        users = db.users.find({}, {"name": 1, "email": 1, "designation": 1, "image": 1, "_id": 0})

        for user in users:
            file_name = user['image']
            file_path = os.path.join(UPLOAD_FOLDER, file_name)

            if not os.path.exists(file_path):
                continue

            try:
                stored_img = Image.open(file_path)
                stored_img.verify()  # Verify that it is an image
                stored_img = Image.open(file_path)  # Reopen for processing
                stored_img_array = face_recognition.load_image_file(file_path)
                stored_img_encoding = face_recognition.face_encodings(stored_img_array)
                if len(stored_img_encoding) == 0:
                    continue
                stored_img_encoding = stored_img_encoding[0]

                # Compare the captured image with stored images
                results = face_recognition.compare_faces([stored_img_encoding], img_encoding)
                if results[0]:
                    user_found = True
                    user_name = user['name']
                    user_email = user['email']
                    user_designation = user['designation']
                    user_image = user['image']
                    break

            except Exception as e:
                print("Error processing stored image:", str(e))

        if user_found:
            return jsonify({
                "success": True,
                "name": user_name,
                "email": user_email,
                "designation": user_designation,
                "image": user_image
            })
        else:
            return jsonify({"success": False, "message": "No matching user found"})

    except Exception as e:
        print("An error occurred:", str(e))
        return jsonify({"success": False, "message": "An error occurred on the server"}), 500

@app.route('/uploads/<filename>')
def serve_image(filename):
    file_path = os.path.join(UPLOAD_FOLDER, filename)
    if not os.path.isfile(file_path):
        print(f"File not found: {file_path}")
        return jsonify({"success": False, "message": "File not found"}), 404

    return send_from_directory(UPLOAD_FOLDER, filename)

def train_all_users():
    db = get_db_connection()
    users = db.users.find({}, {"image": 1, "_id": 1})

    for user in users:
        image = user.get('image')
        if not image:
            print(f"User {user['_id']} has no image.")
            continue

        file_path = os.path.join(UPLOAD_FOLDER, image)
        if not os.path.exists(file_path):
            print(f"File not found: {file_path}")
            continue

        try:
            img = face_recognition.load_image_file(file_path)
            encodings = face_recognition.face_encodings(img)
            if len(encodings) == 0:
                print(f"No face found in {file_path}")
                continue
            encoding = encodings[0]
            # Chuyển numpy array thành list để lưu vào MongoDB
            encoding_list = encoding.tolist()
            db.users.update_one(
                {"_id": user["_id"]},
                {"$set": {"face_encoding": encoding_list}}
            )
            print(f"Updated encoding for user {user['_id']}")
        except Exception as e:
            print(f"Error processing {file_path}: {e}")

if __name__ == "__main__":
    app.run(host='0.0.0.0', port=9000)