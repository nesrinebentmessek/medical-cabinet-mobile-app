from flask import Flask, request, jsonify, send_file
from flask_pymongo import PyMongo
from flask_jwt_extended import JWTManager, create_access_token, jwt_required, get_jwt_identity
from flask_socketio import SocketIO, emit, join_room
from werkzeug.security import generate_password_hash, check_password_hash
from bson.objectid import ObjectId
from flask_cors import CORS
from datetime import datetime, timedelta
from gridfs import GridFS
import mimetypes
from io import BytesIO
from apscheduler.schedulers.background import BackgroundScheduler
import logging

app = Flask(__name__)
CORS(app)

app.config["MONGO_URI"] = "mongodb://localhost:27017/mobile"
app.config["JWT_SECRET_KEY"] = "super-secret"
app.config["SECRET_KEY"] = "socketio-secret"

mongo = PyMongo(app)
jwt = JWTManager(app)
fs = GridFS(mongo.db)
socketio = SocketIO(app, cors_allowed_origins="*")

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize scheduler for appointment reminders
scheduler = BackgroundScheduler()
scheduler.start()

# Function to send appointment reminders
def send_appointment_reminders():
    try:
        now = datetime.utcnow()
        reminder_window_start = now + timedelta(hours=24)
        reminder_window_end = now + timedelta(hours=25)
        
        appointments = mongo.db.rendezvous.find({
            "status": "confirmed",
            "date": {
                "$gte": reminder_window_start.strftime("%Y-%m-%d"),
                "$lte": reminder_window_end.strftime("%Y-%m-%d")
            }
        })
        
        for rdv in appointments:
            rdv_datetime = datetime.strptime(f"{rdv['date']} {rdv['heure']}", "%Y-%m-%d %H:%M")
            if reminder_window_start <= rdv_datetime <= reminder_window_end:
                existing_notification = mongo.db.notifications.find_one({
                    "userId": rdv["patientId"],
                    "titre": "Rappel de rendez-vous",
                    "message": {
                        "$regex": f"Rappel : votre rendez-vous avec {rdv['doctorName']} le {rdv['date']} à {rdv['heure']}"
                    }
                })
                if not existing_notification:
                    notification = {
                        "userId": rdv["patientId"],
                        "titre": "Rappel de rendez-vous",
                        "message": f"Rappel : votre rendez-vous avec {rdv['doctorName']} le {rdv['date']} à {rdv['heure']} est demain.",
                        "date": datetime.utcnow(),
                        "read": False
                    }
                    mongo.db.notifications.insert_one(notification)
                    logger.info(f"Reminder sent for appointment {rdv['_id']} to user {rdv['patientId']}")
    except Exception as e:
        logger.error(f"Error in send_appointment_reminders: {str(e)}")

scheduler.add_job(send_appointment_reminders, 'interval', hours=1)

# WebSocket events
@socketio.on('connect')
def handle_connect():
    logger.info('Client connected')

@socketio.on('disconnect')
def handle_disconnect():
    logger.info('Client disconnected')

@socketio.on('join_conversation')
def handle_join_conversation(data):
    conversation_id = data.get('conversationId')
    if not conversation_id:
        logger.error('No conversationId provided for join_conversation')
        return
    join_room(conversation_id)
    logger.info(f'Client joined conversation room {conversation_id}')

# Enregistrement d'un utilisateur
@app.route("/register", methods=["POST"])
def register():
    try:
        data = request.get_json()
        name = data.get("name")
        email = data.get("email")
        password = data.get("password")
        role = data.get("role")

        if not name or not email or not password or not role:
            return jsonify({"message": "Tous les champs sont requis"}), 400

        if mongo.db.users.find_one({"email": email}) or mongo.db.medecins.find_one({"email": email}):
            return jsonify({"message": "Email déjà utilisé"}), 400

        hashed_password = generate_password_hash(password)
        if role == "medecin":
            new_user = {
                "nom": name,
                "email": email,
                "password": hashed_password,
                "specialite": data.get("specialite", ""),
                "description": data.get("description", ""),
                "image": data.get("image", ""),
                "disponibilites": {}
            }
            result = mongo.db.medecins.insert_one(new_user)
        else:
            new_user = {
                "name": name,
                "email": email,
                "password": hashed_password,
                "role": role
            }
            result = mongo.db.users.insert_one(new_user)

        user_id = str(result.inserted_id)
        token = create_access_token(identity=email)

        return jsonify({
            "message": "Utilisateur créé avec succès",
            "token": token,
            "user_id": user_id
        }), 201

    except Exception as e:
        logger.error(f"Error in register: {str(e)}")
        return jsonify({"message": f"Erreur serveur : {str(e)}"}), 500

# Connexion
@app.route("/login", methods=["POST"])
def login():
    try:
        data = request.get_json()
        email = data.get("email")
        password = data.get("password")

        user = mongo.db.users.find_one({"email": email})
        if user:
            if not check_password_hash(user["password"], password):
                return jsonify({"message": "Mot de passe incorrect"}), 401
            token = create_access_token(identity=email)
            return jsonify({
                "token": token,
                "user_id": str(user["_id"]),
                "name": user["name"],
                "role": user["role"]
            }), 200

        medecin = mongo.db.medecins.find_one({"email": email})
        if medecin:
            if not check_password_hash(medecin["password"], password):
                return jsonify({"message": "Mot de passe incorrect"}), 401
            token = create_access_token(identity=email)
            return jsonify({
                "token": token,
                "user_id": str(medecin["_id"]),
                "name": medecin["nom"],
                "role": "medecin",
                "specialite": medecin.get("specialite", ""),
                "description": medecin.get("description", ""),
                "image": medecin.get("image", "")
            }), 200

        return jsonify({"message": "Utilisateur non trouvé"}), 404

    except Exception as e:
        logger.error(f"Error in login: {str(e)}")
        return jsonify({"message": f"Erreur serveur : {str(e)}"}), 500

# Profil utilisateur
@app.route("/profile", methods=["GET"])
@jwt_required()
def get_profile():
    try:
        email = get_jwt_identity()
        # Check users collection (patients)
        user = mongo.db.users.find_one({"email": email})
        if user:
            return jsonify({
                "_id": str(user["_id"]),
                "name": user["name"],
                "email": user["email"],
                "role": user["role"]
            }), 200

        # Check medecins collection (doctors)
        doctor = mongo.db.medecins.find_one({"email": email})
        if doctor:
            return jsonify({
                "_id": str(doctor["_id"]),
                "name": doctor["nom"],
                "email": doctor["email"],
                "role": "medecin",
                "specialite": doctor.get("specialite", ""),
                "description": doctor.get("description", ""),
                "image": doctor.get("image", "")
            }), 200

        return jsonify({"message": "Utilisateur non trouvé"}), 404

    except Exception as e:
        logger.error(f"Error in get_profile: {str(e)}")
        return jsonify({"message": f"Erreur serveur : {str(e)}"}), 500

# Profil médecin
@app.route("/doctors/profile", methods=["GET"])
@jwt_required()
def get_doctor_profile():
    try:
        email = get_jwt_identity()
        medecin = mongo.db.medecins.find_one({"email": email})
        if not medecin:
            return jsonify({"message": "Médecin non trouvé"}), 404

        return jsonify({
            "nom": medecin["nom"],
            "email": medecin["email"],
            "specialite": medecin.get("specialite", ""),
            "description": medecin.get("description", ""),
            "image": medecin.get("image", ""),
            "user_id": str(medecin["_id"])
        }), 200

    except Exception as e:
        logger.error(f"Error in get_doctor_profile: {str(e)}")
        return jsonify({"message": f"Erreur serveur : {str(e)}"}), 500

# Mettre à jour le profil médecin
@app.route("/doctors/profile", methods=["PUT"])
@jwt_required()
def update_doctor_profile():
    try:
        email = get_jwt_identity()
        data = request.get_json()
        nom = data.get("nom")
        email_new = data.get("email")
        specialite = data.get("specialite")
        description = data.get("description")
        image = data.get("image")

        if not nom or not email_new:
            return jsonify({"message": "Nom et email requis"}), 400

        update_data = {
            "nom": nom,
            "email": email_new,
            "specialite": specialite,
            "description": description,
            "image": image
        }

        mongo.db.medecins.update_one(
            {"email": email},
            {"$set": update_data}
        )
        return jsonify({"message": "Profil mis à jour"}), 200

    except Exception as e:
        logger.error(f"Error in update_doctor_profile: {str(e)}")
        return jsonify({"message": f"Erreur serveur : {str(e)}"}), 500

# Liste des médecins
@app.route("/doctors", methods=["GET"])
def get_doctors():
    try:
        doctors = mongo.db.medecins.find()
        doctors_list = [
            {
                "id": str(doc["_id"]),
                "nom": doc.get("nom"),
                "specialite": doc.get("specialite"),
                "description": doc.get("description"),
                "image": doc.get("image")
            }
            for doc in doctors
        ]
        return jsonify(doctors_list), 200

    except Exception as e:
        logger.error(f"Error in get_doctors: {str(e)}")
        return jsonify({"message": f"Erreur serveur : {str(e)}"}), 500

# Rechercher un médecin par nom
@app.route("/search_doctors", methods=["GET"])
def search_doctors():
    try:
        search_term = request.args.get("name", "").lower()

        if not search_term:
            return jsonify({"message": "Le terme de recherche est requis"}), 400

        doctors = mongo.db.medecins.find({
            "nom": {"$regex": search_term, "$options": "i"}
        })

        doctors_list = [
            {
                "id": str(doc["_id"]),
                "nom": doc.get("nom"),
                "specialite": doc.get("specialite"),
                "description": doc.get("description"),
                "image": doc.get("image")
            }
            for doc in doctors
        ]

        return jsonify(doctors_list), 200

    except Exception as e:
        logger.error(f"Error in search_doctors: {str(e)}")
        return jsonify({"message": f"Erreur serveur : {str(e)}"}), 500

# Ajouter un médecin
@app.route("/add_doctor", methods=["POST"])
@jwt_required()
def add_doctor():
    try:
        data = request.get_json()
        nom = data.get("nom")
        specialite = data.get("specialite")
        description = data.get("description")
        image = data.get("image")

        if not nom or not specialite or not description or not image:
            return jsonify({"message": "Tous les champs sont requis"}), 400

        mongo.db.medecins.insert_one({
            "nom": nom,
            "specialite": specialite,
            "description": description,
            "image": image,
            "disponibilites": {}
        })

        return jsonify({"message": "Docteur ajouté avec succès"}), 201

    except Exception as e:
        logger.error(f"Error in add_doctor: {str(e)}")
        return jsonify({"message": f"Erreur serveur : {str(e)}"}), 500

# Détail d'un médecin
@app.route("/doctors/<doctor_id>", methods=["GET"])
def get_doctor(doctor_id):
    try:
        doctor = mongo.db.medecins.find_one({"_id": ObjectId(doctor_id)})
        if not doctor:
            return jsonify({"message": "Médecin non trouvé"}), 404

        return jsonify({
            "id": str(doctor["_id"]),
            "nom": doctor.get("nom"),
            "specialite": doctor.get("specialite"),
            "image": doctor.get("image")
        }), 200

    except Exception as e:
        logger.error(f"Error in get_doctor: {str(e)}")
        return jsonify({"message": f"Erreur serveur : {str(e)}"}), 500

# Get available slots for a specific doctor on a specific date
@app.route("/doctor_availability/<doctor_id>", methods=["GET"])
def get_doctor_availability(doctor_id):
    try:
        date = request.args.get("date")
        
        if not date:
            return jsonify({"message": "Date parameter is required"}), 400
            
        try:
            selected_date = datetime.strptime(date, "%Y-%m-%d")
        except ValueError:
            return jsonify({"message": "Invalid date format. Use YYYY-MM-DD"}), 400
            
        doctor = mongo.db.medecins.find_one({"_id": ObjectId(doctor_id)})
        if not doctor:
            return jsonify({"message": "Médecin non trouvé"}), 404
            
        booked_slots = mongo.db.rendezvous.find({
            "doctorId": doctor_id,
            "date": date
        })
        
        booked_times = [slot["heure"] for slot in booked_slots]
        
        all_slots = []
        
        current_time = datetime.strptime("08:00", "%H:%M")
        end_morning = datetime.strptime("12:00", "%H:%M")
        
        while current_time < end_morning:
            slot_end = current_time + timedelta(minutes=30)
            slot_str = current_time.strftime("%H:%M")
            
            if slot_str not in booked_times:
                all_slots.append({
                    "start": slot_str,
                    "end": slot_end.strftime("%H:%M"),
                    "available": True
                })
            else:
                all_slots.append({
                    "start": slot_str,
                    "end": slot_end.strftime("%H:%M"),
                    "available": False
                })
                
            current_time = slot_end + timedelta(minutes=5)
        
        current_time = datetime.strptime("13:00", "%H:%M")
        end_afternoon = datetime.strptime("18:00", "%H:%M")
        
        while current_time < end_afternoon:
            slot_end = current_time + timedelta(minutes=30)
            slot_str = current_time.strftime("%H:%M")
            
            if slot_str not in booked_times:
                all_slots.append({
                    "start": slot_str,
                    "end": slot_end.strftime("%H:%M"),
                    "available": True
                })
            else:
                all_slots.append({
                    "start": slot_str,
                    "end": slot_end.strftime("%H:%M"),
                    "available": False
                })
                
            current_time = slot_end + timedelta(minutes=5)
            
        return jsonify({
            "date": date,
            "doctorId": doctor_id,
            "doctorName": doctor.get("nom", ""),
            "slots": all_slots
        }), 200
        
    except Exception as e:
        logger.error(f"Error in get_doctor_availability: {str(e)}")
        return jsonify({"message": f"Erreur serveur : {str(e)}"}), 500

# Get calendar view of doctor availability for a month
@app.route("/doctor_calendar/<doctor_id>", methods=["GET", "POST"])
def get_doctor_calendar(doctor_id):
    try:
        year = int(request.args.get("year", datetime.now().year))
        month = int(request.args.get("month", datetime.now().month))
        
        doctor = mongo.db.medecins.find_one({"_id": ObjectId(doctor_id)})
        if not doctor:
            return jsonify({"message": "Médecin non trouvé"}), 404
            
        first_day = datetime(year, month, 1)
        
        if month == 12:
            last_day = datetime(year + 1, 1, 1) - timedelta(days=1)
        else:
            last_day = datetime(year, month + 1, 1) - timedelta(days=1)
            
        start_date = first_day.strftime("%Y-%m-%d")
        end_date = last_day.strftime("%Y-%m-%d")
        
        appointments = mongo.db.rendezvous.find({
            "doctorId": doctor_id,
            "date": {"$gte": start_date, "$lte": end_date}
        })
        
        appointments_per_day = {}
        for appt in appointments:
            date = appt["date"]
            if date in appointments_per_day:
                appointments_per_day[date] += 1
            else:
                appointments_per_day[date] = 1
                
        calendar_data = []
        current_date = first_day
        
        max_slots = 18
        
        while current_date <= last_day:
            date_str = current_date.strftime("%Y-%m-%d")
            booked_count = appointments_per_day.get(date_str, 0)
            
            status = "available"
            if booked_count >= max_slots:
                status = "unavailable"
            elif booked_count > 0:
                status = "partial"
                
            calendar_data.append({
                "date": date_str,
                "day": current_date.day,
                "status": status,
                "booked": booked_count,
                "total": max_slots
            })
            
            current_date += timedelta(days=1)
            
        return jsonify({
            "doctorId": doctor_id,
            "doctorName": doctor.get("nom", ""),
            "year": year,
            "month": month,
            "calendar": calendar_data
        }), 200
        
    except Exception as e:
        logger.error(f"Error in get_doctor_calendar: {str(e)}")
        return jsonify({"message": f"Erreur serveur : {str(e)}"}), 500

# Créer un rendez-vous
@app.route("/rendezvous", methods=["POST"])
@jwt_required()
def create_rdv():
    try:
        current_user_email = get_jwt_identity()
        user = mongo.db.users.find_one({"email": current_user_email})

        if not user:
            return jsonify({"message": "Utilisateur non trouvé"}), 404

        data = request.get_json()
        required_fields = ["date", "heure", "doctorId"]
        if not all(field in data for field in required_fields):
            return jsonify({"message": "Tous les champs sont requis"}), 400

        doctor = mongo.db.medecins.find_one({"_id": ObjectId(data["doctorId"])})
        if not doctor:
            return jsonify({"message": "Médecin non trouvé"}), 404

        try:
            rdv_datetime = datetime.strptime(f"{data['date']} {data['heure']}", "%Y-%m-%d %H:%M")
            if rdv_datetime < datetime.now():
                return jsonify({"message": "La date/heure doit être dans le futur"}), 400
                
            hour, minute = map(int, data['heure'].split(':'))
            if (hour < 8 or (hour == 12) or (hour >= 18) or 
                (hour > 11 and hour < 13)):
                return jsonify({"message": "Horaire invalide. Les consultations sont disponibles de 8h à 12h et de 13h à 18h"}), 400
                
            if minute % 5 != 0:
                return jsonify({"message": "Les horaires doivent être en tranches de 5 minutes"}), 400
                
            existing_rdv = mongo.db.rendezvous.find_one({
                "doctorId": data["doctorId"],
                "date": data["date"],
                "heure": data["heure"]
            })
            
            if existing_rdv:
                return jsonify({"message": "Ce créneau horaire est déjà réservé"}), 409
                
        except ValueError:
            return jsonify({"message": "Format de date/heure invalide"}), 400

        rendezvous = {
            "patientId": str(user["_id"]),
            "patientName": user["name"],
            "doctorId": data["doctorId"],
            "doctorName": doctor["nom"],
            "date": data["date"],
            "heure": data["heure"],
            "createdAt": datetime.utcnow(),
            "status": "pending"
        }

        result = mongo.db.rendezvous.insert_one(rendezvous)

        # Create notification for the doctor
        doctor_notification = {
            "userId": str(doctor["_id"]),
            "titre": "Nouveau rendez-vous",
            "message": f"Un rendez-vous a été pris par {user['name']} pour le {data['date']} à {data['heure']}.",
            "date": datetime.utcnow(),
            "read": False
        }
        mongo.db.notifications.insert_one(doctor_notification)

        # Create notification for the patient
        patient_notification = {
            "userId": str(user["_id"]),
            "titre": "Rendez-vous en attente",
            "message": f"Votre rendez-vous avec {doctor['nom']} le {data['date']} à {data['heure']} est en attente de confirmation.",
            "date": datetime.utcnow(),
            "read": False
        }
        mongo.db.notifications.insert_one(patient_notification)

        return jsonify({
            "message": "Rendez-vous créé avec succès",
            "rendezvous": {
                "id": str(result.inserted_id),
                **rendezvous
            }
        }), 201

    except Exception as e:
        logger.error(f"Error in create_rdv: {str(e)}")
        return jsonify({"message": f"Erreur serveur : {str(e)}"}), 500

# Obtenir les rendez-vous d'un utilisateur
@app.route("/rendezvous", methods=["GET"])
@jwt_required()
def get_user_rdvs():
    try:
        current_user_email = get_jwt_identity()
        user = mongo.db.users.find_one({"email": current_user_email})

        if not user:
            return jsonify({"message": "Utilisateur non trouvé"}), 404

        rdvs = mongo.db.rendezvous.find({"patientId": str(user["_id"])})
        
        rdv_list = []
        for rdv in rdvs:
            doctor = mongo.db.medecins.find_one({"_id": ObjectId(rdv["doctorId"])})
            rdv_list.append({
                "_id": str(rdv["_id"]),
                "doctorId": rdv["doctorId"],
                "doctorName": doctor["nom"] if doctor else "Médecin inconnu",
                "specialite": doctor["specialite"] if doctor else "",
                "date": rdv["date"],
                "heure": rdv["heure"],
                "status": rdv["status"],
                "createdAt": rdv.get("createdAt", "").strftime("%Y-%m-%d %H:%M") if rdv.get("createdAt") else ""
            })

        return jsonify(rdv_list), 200

    except Exception as e:
        logger.error(f"Error in get_user_rdvs: {str(e)}")
        return jsonify({"message": f"Erreur serveur : {str(e)}"}), 500

# Obtenir les rendez-vous d'un médecin
@app.route("/doctor/rendezvous", methods=["GET"])
@jwt_required()
def get_doctor_rdvs():
    try:
        current_user_email = get_jwt_identity()
        doctor = mongo.db.medecins.find_one({"email": current_user_email})

        if not doctor:
            return jsonify({"message": "Médecin non trouvé"}), 404

        rdvs = mongo.db.rendezvous.find({"doctorId": str(doctor["_id"])})
        
        rdv_list = []
        for rdv in rdvs:
            patient = mongo.db.users.find_one({"_id": ObjectId(rdv["patientId"])})
            rdv_list.append({
                "_id": str(rdv["_id"]),
                "patientId": rdv["patientId"],
                "patientName": patient["name"] if patient else "Patient inconnu",
                "date": rdv["date"],
                "heure": rdv["heure"],
                "status": rdv["status"],
                "createdAt": rdv.get("createdAt", "").strftime("%Y-%m-%d %H:%M") if rdv.get("createdAt") else ""
            })

        return jsonify(rdv_list), 200

    except Exception as e:
        logger.error(f"Error in get_doctor_rdvs: {str(e)}")
        return jsonify({"message": f"Erreur serveur : {str(e)}"}), 500

# Mettre à jour le statut d'un rendez-vous
@app.route("/rendezvous/<rdv_id>/status", methods=["PUT"])
@jwt_required()
def update_rdv_status(rdv_id):
    try:
        current_user_email = get_jwt_identity()
        doctor = mongo.db.medecins.find_one({"email": current_user_email})

        if not doctor:
            return jsonify({"message": "Médecin non trouvé"}), 404

        rdv = mongo.db.rendezvous.find_one({"_id": ObjectId(rdv_id)})
        if not rdv:
            return jsonify({"message": "Rendez-vous non trouvé"}), 404

        if rdv["doctorId"] != str(doctor["_id"]):
            return jsonify({"message": "Accès refusé"}), 403

        data = request.get_json()
        status = data.get("status")
        if not status or status not in ["pending", "confirmed", "cancelled"]:
            return jsonify({"message": "Statut invalide"}), 400

        mongo.db.rendezvous.update_one(
            {"_id": ObjectId(rdv_id)},
            {"$set": {"status": status}}
        )

        patient = mongo.db.users.find_one({"_id": ObjectId(rdv["patientId"])})
        if patient:
            notification = {
                "userId": str(rdv["patientId"]),
                "titre": f"Rendez-vous {status}",
                "message": f"Votre rendez-vous avec {doctor['nom']} le {rdv['date']} à {rdv['heure']} a été {status}.",
                "date": datetime.utcnow(),
                "read": False
            }
            mongo.db.notifications.insert_one(notification)

        return jsonify({"message": "Statut du rendez-vous mis à jour"}), 200

    except Exception as e:
        logger.error(f"Error in update_rdv_status: {str(e)}")
        return jsonify({"message": f"Erreur serveur : {str(e)}"}), 500

# Supprimer un rendez-vous
@app.route("/rendezvous/<rdv_id>", methods=["DELETE"])
@jwt_required()
def delete_rdv(rdv_id):
    try:
        current_user_email = get_jwt_identity()
        user = mongo.db.users.find_one({"email": current_user_email})
        doctor = mongo.db.medecins.find_one({"email": current_user_email})

        rdv = mongo.db.rendezvous.find_one({"_id": ObjectId(rdv_id)})
        if not rdv:
            return jsonify({"message": "Rendez-vous non trouvé"}), 404

        if (user and str(rdv["patientId"]) != str(user["_id"])) and (doctor and rdv["doctorId"] != str(doctor["_id"])):
            return jsonify({"message": "Accès refusé"}), 403

        if doctor and rdv["doctorId"] == str(doctor["_id"]):
            patient = mongo.db.users.find_one({"_id": ObjectId(rdv["patientId"])})
            if patient:
                notification = {
                    "userId": str(rdv["patientId"]),
                    "titre": "Rendez-vous annulé",
                    "message": f"Votre rendez-vous avec {doctor['nom']} le {rdv['date']} à {rdv['heure']} a été annulé.",
                    "date": datetime.utcnow(),
                    "read": False
                }
                mongo.db.notifications.insert_one(notification)

        mongo.db.rendezvous.delete_one({"_id": ObjectId(rdv_id)})
        return jsonify({"message": "Rendez-vous supprimé"}), 200

    except Exception as e:
        logger.error(f"Error in delete_rdv: {str(e)}")
        return jsonify({"message": f"Erreur serveur : {str(e)}"}), 500

# Modifier un rendez-vous
@app.route("/rendezvous/<rdv_id>", methods=["PUT"])
@jwt_required()
def update_rendezvous(rdv_id):
    try:
        current_user_email = get_jwt_identity()
        user = mongo.db.users.find_one({"email": current_user_email})

        data = request.get_json()
        date = data.get('date')
        heure = data.get('heure')

        if not date or not heure:
            return jsonify({"message": "Date et heure requises"}), 400

        rdv = mongo.db.rendezvous.find_one({"_id": ObjectId(rdv_id)})
        if not rdv:
            return jsonify({"message": "Rendez-vous non trouvé"}), 404

        if str(rdv["patientId"]) != str(user["_id"]):
            return jsonify({"message": "Accès refusé"}), 403

        mongo.db.rendezvous.update_one(
            {"_id": ObjectId(rdv_id)},
            {"$set": {"date": date, "heure": heure}}
        )

        doctor = mongo.db.medecins.find_one({"_id": ObjectId(rdv["doctorId"])})
        if doctor:
            notification = {
                "userId": str(doctor["_id"]),
                "titre": "Rendez-vous modifié",
                "message": f"Le rendez-vous avec {user['name']} a été modifié pour le {date} à {heure}.",
                "date": datetime.utcnow(),
                "read": False
            }
            mongo.db.notifications.insert_one(notification)

        return jsonify({"message": "Rendez-vous mis à jour"}), 200

    except Exception as e:
        logger.error(f"Error in update_rendezvous: {str(e)}")
        return jsonify({"message": f"Erreur serveur : {str(e)}"}), 500

# Modifier le profil utilisateur
@app.route("/edit_profile", methods=["PUT"])
@jwt_required()
def edit_profile():
    try:
        user_email = get_jwt_identity()
        data = request.get_json()
        name = data.get("name")
        email = data.get("email")

        if not name or not email:
            return jsonify({"message": "Nom et email requis"}), 400

        mongo.db.users.update_one(
            {"email": user_email},
            {"$set": {"name": name, "email": email}}
        )
        return jsonify({"message": "Profil mis à jour"}), 200

    except Exception as e:
        logger.error(f"Error in edit_profile: {str(e)}")
        return jsonify({"message": f"Erreur : {str(e)}"}), 500

# Historique médical
@app.route("/historique", methods=["GET"])
@jwt_required()
def historique_medical():
    try:
        user_email = get_jwt_identity()
        user = mongo.db.users.find_one({"email": user_email})

        consultations = mongo.db.consultations.find({"patientId": str(user["_id"])})

        result = []
        for c in consultations:
            result.append({
                "date": c.get("date"),
                "diagnostic": c.get("diagnostic", ""),
                "prescription": c.get("prescription", ""),
                "consultationType": c.get("consultationType", ""),
                "doctorName": c.get("doctorName", ""),
                "documentIds": c.get("documentIds", [])
            })

        return jsonify(result), 200

    except Exception as e:
        logger.error(f"Error in historique_medical: {str(e)}")
        return jsonify({"message": f"Erreur : {str(e)}"}), 500

# Notifications
@app.route("/notifications", methods=["GET"])
@jwt_required()
def get_notifications():
    try:
        user_email = get_jwt_identity()
        user = mongo.db.users.find_one({"email": user_email})
        if not user:
            doctor = mongo.db.medecins.find_one({"email": user_email})
            if not doctor:
                return jsonify({"message": "Utilisateur non trouvé"}), 404
            user_id = str(doctor["_id"])
        else:
            user_id = str(user["_id"])

        notifs = mongo.db.notifications.find({"userId": user_id})
        return jsonify([
            {
                "_id": str(n["_id"]),
                "titre": n["titre"],
                "message": n["message"],
                "date": n.get("date", "").strftime("%Y-%m-%d %H:%M") if n.get("date") else "",
                "read": n.get("read", False)
            } for n in notifs
        ]), 200

    except Exception as e:
        logger.error(f"Error in get_notifications: {str(e)}")
        return jsonify({"message": f"Erreur : {str(e)}"}), 500

# Update notification read status
@app.route("/notifications/<notification_id>", methods=["PUT"])
@jwt_required()
def update_notification_status(notification_id):
    try:
        user_email = get_jwt_identity()
        user = mongo.db.users.find_one({"email": user_email})
        if not user:
            doctor = mongo.db.medecins.find_one({"email": user_email})
            if not doctor:
                return jsonify({"message": "Utilisateur non trouvé"}), 404
            user_id = str(doctor["_id"])
        else:
            user_id = str(user["_id"])

        data = request.get_json()
        read_status = data.get("read")
        if read_status is None:
            return jsonify({"message": "Le champ 'read' est requis"}), 400

        notification = mongo.db.notifications.find_one({"_id": ObjectId(notification_id)})
        if not notification:
            return jsonify({"message": "Notification non trouvée"}), 404

        if notification["userId"] != user_id:
            return jsonify({"message": "Accès refusé"}), 403

        mongo.db.notifications.update_one(
            {"_id": ObjectId(notification_id)},
            {"$set": {"read": read_status}}
        )
        return jsonify({"message": "Statut de la notification mis à jour"}), 200

    except Exception as e:
        logger.error(f"Error in update_notification_status: {str(e)}")
        return jsonify({"message": f"Erreur : {str(e)}"}), 500

# Gestion des disponibilités
@app.route("/disponibilites", methods=["GET", "POST", "DELETE"])
@jwt_required()
def disponibilites():
    try:
        user_email = get_jwt_identity()
        user = mongo.db.medecins.find_one({"email": user_email})

        if not user:
            return jsonify({"message": "Médecin non trouvé"}), 404

        if request.method == "GET":
            dispo = user.get("disponibilites", {})
            dispo_list = [
                {
                    "jour": jour,
                    "heure": f"{details['start']}-{details['end']}",
                    "id": f"{user['_id']}_{jour}"
                }
                for jour, details in dispo.items()
                if jour != "created_at"
            ]
            return jsonify(dispo_list), 200

        elif request.method == "POST":
            data = request.get_json()
            jour = data.get("jour")
            heure = data.get("heure")
            start, end = heure.split("-")
            mongo.db.medecins.update_one(
                {"_id": ObjectId(user["_id"])},
                {
                    "$set": {
                        f"disponibilites.{jour}": {"start": start, "end": end},
                        "disponibilites.created_at": datetime.utcnow()
                    }
                }
            )
            return jsonify({"message": "Créneau ajouté"}), 201

        elif request.method == "DELETE":
            data = request.get_json()
            jour = data.get("jour")
            mongo.db.medecins.update_one(
                {"_id": ObjectId(user["_id"])},
                {"$unset": {f"disponibilites.{jour}": ""}}
            )
            return jsonify({"message": "Créneau supprimé"}), 200

    except Exception as e:
        logger.error(f"Error in disponibilites: {str(e)}")
        return jsonify({"message": f"Erreur : {str(e)}"}), 500

# Gestion des consultations
@app.route("/consultations", methods=["GET", "POST"])
@jwt_required()
def gestion_consultations():
    try:
        user_email = get_jwt_identity()
        user = mongo.db.medecins.find_one({"email": user_email})

        if not user:
            return jsonify({"message": "Médecin non trouvé"}), 404

        if request.method == "GET":
            consultations = mongo.db.consultations.find({"doctorId": str(user["_id"])})
            return jsonify([
                {
                    "appointmentId": c.get("appointmentId"),
                    "patientId": c["patientId"],
                    "patientName": c["patientName"],
                    "date": c["date"],
                    "diagnostic": c.get("diagnostic", ""),
                    "prescription": c.get("prescription", ""),
                    "consultationType": c.get("consultationType", ""),
                    "documentIds": c.get("documentIds", [])
                } for c in consultations
            ])

        elif request.method == "POST":
            appointment_id = request.form.get("appointmentId")
            patient_id = request.form.get("patientId")
            patient_name = request.form.get("patientName")
            date = request.form.get("date")
            diagnostic = request.form.get("diagnostic")
            prescription = request.form.get("prescription")
            consultation_type = request.form.get("consultationType")

            if not all([appointment_id, patient_id, patient_name, date, diagnostic, prescription, consultation_type]):
                return jsonify({"message": "Tous les champs sont requis"}), 400

            # Verify patient exists
            patient = mongo.db.users.find_one({"_id": ObjectId(patient_id)})
            if not patient:
                return jsonify({"message": "Patient non trouvé"}), 404

            # Verify appointment exists and is confirmed
            appointment = mongo.db.rendezvous.find_one({
                "_id": ObjectId(appointment_id),
                "doctorId": str(user["_id"]),
                "patientId": patient_id,
                "date": date,
                "status": "confirmed"
            })
            if not appointment:
                return jsonify({"message": "Rendez-vous invalide ou non confirmé"}), 404

            # Check if consultation already exists for this appointment
            existing_consultation = mongo.db.consultations.find_one({"appointmentId": appointment_id})
            if existing_consultation:
                return jsonify({"message": "Une consultation existe déjà pour ce rendez-vous"}), 409

            # Handle document uploads
            document_ids = []
            if 'documents' in request.files:
                files = request.files.getlist('documents')
                allowed_types = ['application/pdf', 'image/jpeg', 'image/png']
                for file in files:
                    if file.mimetype not in allowed_types:
                        return jsonify({"message": "Type de fichier non autorisé. Utilisez PDF, JPG ou PNG"}), 400
                    file_id = fs.put(file, filename=file.filename, content_type=file.mimetype)
                    document_ids.append(str(file_id))

            consultation = {
                "appointmentId": appointment_id,
                "doctorId": str(user["_id"]),
                "doctorName": user["nom"],
                "patientId": patient_id,
                "patientName": patient_name,
                "date": date,
                "diagnostic": diagnostic,
                "prescription": prescription,
                "consultationType": consultation_type,
                "documentIds": document_ids,
                "createdAt": datetime.utcnow()
            }
            result = mongo.db.consultations.insert_one(consultation)

            # Notify patient with detailed message
            notification = {
                "userId": patient_id,
                "titre": "Nouvelle consultation",
                "message": f"Votre consultation ({consultation_type}) avec {user['nom']} le {date} a été enregistrée. Diagnostic: {diagnostic}.",
                "date": datetime.utcnow(),
                "read": False
            }
            mongo.db.notifications.insert_one(notification)

            return jsonify({
                "message": "Consultation enregistrée",
                "consultation": {
                    "id": str(result.inserted_id),
                    **consultation
                }
            }), 201

    except Exception as e:
        logger.error(f"Error in gestion_consultations: {str(e)}")
        return jsonify({"message": f"Erreur : {str(e)}"}), 500

# Upload a document
@app.route("/documents", methods=["POST"])
@jwt_required()
def upload_document():
    try:
        current_user_email = get_jwt_identity()
        user = mongo.db.users.find_one({"email": current_user_email})
        if not user:
            doctor = mongo.db.medecins.find_one({"email": current_user_email})
            if not doctor:
                return jsonify({"message": "Utilisateur non trouvé"}), 404
            user_id = str(doctor["_id"])
            user_name = doctor["nom"]
            is_doctor = True
        else:
            user_id = str(user["_id"])
            user_name = user["name"]
            is_doctor = False

        if 'document' not in request.files:
            return jsonify({"message": "Aucun fichier fourni"}), 400

        file = request.files['document']
        conversation_id = request.form.get('conversationId')
        title = file.filename

        if not file:
            return jsonify({"message": "Fichier requis"}), 400

        if conversation_id:
            conversation = mongo.db.conversations.find_one({"_id": ObjectId(conversation_id)})
            if not conversation or (conversation["patientId"] != user_id and conversation["doctorId"] != user_id):
                return jsonify({"message": "Conversation invalide ou accès refusé"}), 403

        allowed_types = ['application/pdf', 'image/jpeg', 'image/png']
        if file.mimetype not in allowed_types:
            return jsonify({"message": "Type de fichier non autorisé. Utilisez PDF, JPG ou PNG"}), 400

        file_id = fs.put(file, filename=file.filename, content_type=file.mimetype)

        document = {
            "title": title,
            "patientId": user_id if not is_doctor else conversation["patientId"] if conversation_id else None,
            "patientName": user_name if not is_doctor else conversation["patientName"] if conversation_id else None,
            "doctorId": conversation["doctorId"] if conversation_id else user_id if is_doctor else None,
            "doctorName": conversation["doctorName"] if conversation_id else user_name if is_doctor else None,
            "fileId": str(file_id),
            "conversationId": conversation_id if conversation_id else None,
            "consulted": False,
            "annotations": [],
            "date": datetime.utcnow()
        }
        result = mongo.db.documents.insert_one(document)

        if conversation_id:
            recipient_id = conversation["doctorId"] if user_id == conversation["patientId"] else conversation["patientId"]
            recipient = mongo.db.medecins.find_one({"_id": ObjectId(recipient_id)}) if user_id == conversation["patientId"] else mongo.db.users.find_one({"_id": ObjectId(recipient_id)})
            if recipient:
                notification = {
                    "userId": recipient_id,
                    "titre": "Nouveau document",
                    "message": f"{user_name} a envoyé un nouveau document: {title} dans votre conversation.",
                    "date": datetime.utcnow(),
                    "read": False
                }
                mongo.db.notifications.insert_one(notification)

                # Emit WebSocket event for document
                socketio.emit('new_document', {
                    "conversationId": conversation_id,
                    "documentId": str(result.inserted_id),
                    "title": title,
                    "senderId": user_id,
                    "senderName": user_name,
                    "timestamp": document["date"].strftime("%Y-%m-%d %H:%M")
                }, room=conversation_id)

        return jsonify({
            "message": "Document envoyé avec succès",
            "documentId": str(result.inserted_id)
        }), 201

    except Exception as e:
        logger.error(f"Error in upload_document: {str(e)}")
        return jsonify({"message": f"Erreur serveur : {str(e)}"}), 500

# Get patient documents
@app.route("/documents", methods=["GET"])
@jwt_required()
def get_patient_documents():
    try:
        current_user_email = get_jwt_identity()
        user = mongo.db.users.find_one({"email": current_user_email})
        if not user:
            return jsonify({"message": "Utilisateur non trouvé"}), 404

        documents = mongo.db.documents.find({"patientId": str(user["_id"])})
        result = []
        for doc in documents:
            result.append({
                "id": str(doc["_id"]),
                "title": doc["title"],
                "patientId": doc["patientId"],
                "patientName": doc["patientName"],
                "doctorId": doc.get("doctorId"),
                "fileId": doc["fileId"],
                "consulted": doc["consulted"],
                "annotations": doc.get("annotations", []),
                "conversationId": doc.get("conversationId"),
                "date": doc.get("date", "").strftime("%Y-%m-%d %H:%M") if doc.get("date") else ""
            })

        return jsonify(result), 200

    except Exception as e:
        logger.error(f"Error in get_patient_documents: {str(e)}")
        return jsonify({"message": f"Erreur serveur : {str(e)}"}), 500

# Get documents for doctor dashboard
@app.route("/documents_patients", methods=["GET"])
@jwt_required()
def documents_patients():
    try:
        current_user_email = get_jwt_identity()
        doctor = mongo.db.medecins.find_one({"email": current_user_email})
        if not doctor:
            return jsonify({"message": "Médecin non trouvé"}), 404

        documents = mongo.db.documents.find({"doctorId": str(doctor["_id"])})
        result = []
        for doc in documents:
            patient = mongo.db.users.find_one({"_id": ObjectId(doc["patientId"])})
            result.append({
                "id": str(doc["_id"]),
                "title": doc["title"],
                "patientId": doc["patientId"],
                "patientName": patient["name"] if patient else "Inconnu",
                "fileId": doc["fileId"],
                "consulted": doc["consulted"],
                "annotations": doc.get("annotations", []),
                "conversationId": doc.get("conversationId"),
                "date": doc.get("date", "").strftime("%Y-%m-%d %H:%M") if doc.get("date") else ""
            })

        return jsonify(result), 200

    except Exception as e:
        logger.error(f"Error in documents_patients: {str(e)}")
        return jsonify({"message": f"Erreur serveur : {str(e)}"}), 500

# Update document consulted status
@app.route("/documents/<document_id>/consulted", methods=["PUT"])
@jwt_required()
def update_document_status(document_id):
    try:
        current_user_email = get_jwt_identity()
        doctor = mongo.db.medecins.find_one({"email": current_user_email})
        if not doctor:
            return jsonify({"message": "Médecin non trouvé"}), 404

        document = mongo.db.documents.find_one({"_id": ObjectId(document_id)})
        if not document:
            return jsonify({"message": "Document non trouvé"}), 404

        if document["doctorId"] != str(doctor["_id"]):
            return jsonify({"message": "Accès refusé"}), 403

        data = request.get_json()
        consulted = data.get("consulted")
        if consulted is None:
            return jsonify({"message": "Le champ 'consulted' est requis"}), 400

        mongo.db.documents.update_one(
            {"_id": ObjectId(document_id)},
            {"$set": {"consulted": consulted}}
        )

        # Notify patient if document is marked as consulted
        if consulted:
            patient = mongo.db.users.find_one({"_id": ObjectId(document["patientId"])})
            if patient:
                notification = {
                    "userId": str(document["patientId"]),
                    "titre": "Document consulté",
                    "message": f"Votre document '{document['title']}' a été consulté par {doctor['nom']}.",
                    "date": datetime.utcnow(),
                    "read": False
                }
                mongo.db.notifications.insert_one(notification)

        return jsonify({"message": "Statut du document mis à jour"}), 200

    except Exception as e:
        logger.error(f"Error in update_document_status: {str(e)}")
        return jsonify({"message": f"Erreur serveur : {str(e)}"}), 500

# Annotate a document
@app.route("/documents/<document_id>/annotate", methods=["POST"])
@jwt_required()
def annotate_document(document_id):
    try:
        current_user_email = get_jwt_identity()
        doctor = mongo.db.medecins.find_one({"email": current_user_email})
        if not doctor:
            return jsonify({"message": "Médecin non trouvé"}), 404

        document = mongo.db.documents.find_one({"_id": ObjectId(document_id)})
        if not document:
            return jsonify({"message": "Document non trouvé"}), 404

        if document["doctorId"] != str(doctor["_id"]):
            return jsonify({"message": "Accès refusé"}), 403

        data = request.get_json()
        annotation = data.get("annotation")
        if not annotation:
            return jsonify({"message": "Le champ 'annotation' est requis"}), 400

        annotation_data = {
            "text": annotation,
            "doctorId": str(doctor["_id"]),
            "doctorName": doctor["nom"],
            "date": datetime.utcnow()
        }

        mongo.db.documents.update_one(
            {"_id": ObjectId(document_id)},
            {"$push": {"annotations": annotation_data}}
        )

        # Notify patient of new annotation
        patient = mongo.db.users.find_one({"_id": ObjectId(document["patientId"])})
        if patient:
            notification = {
                "userId": str(document["patientId"]),
                "titre": "Document annoté",
                "message": f"Votre document '{document['title']}' a été annoté par {doctor['nom']}: {annotation}",
                "date": datetime.utcnow(),
                "read": False
            }
            mongo.db.notifications.insert_one(notification)

        return jsonify({"message": "Annotation ajoutée avec succès"}), 200

    except Exception as e:
        logger.error(f"Error in annotate_document: {str(e)}")
        return jsonify({"message": f"Erreur serveur : {str(e)}"}), 500

# Download a document
@app.route("/documents/<file_id>/download", methods=["GET"])
@jwt_required()
def download_document(file_id):
    try:
        current_user_email = get_jwt_identity()
        user = mongo.db.users.find_one({"email": current_user_email})
        doctor = mongo.db.medecins.find_one({"email": current_user_email})

        document = mongo.db.documents.find_one({"fileId": file_id})
        if not document:
            return jsonify({"message": "Document non trouvé"}), 404

        if (user and document["patientId"] != str(user["_id"])) and (doctor and document.get("doctorId") != str(doctor["_id"])):
            return jsonify({"message": "Accès refusé"}), 403

        file = fs.get(ObjectId(file_id))
        if not file:
            return jsonify({"message": "Fichier non trouvé"}), 404

        return send_file(
            BytesIO(file.read()),
            mimetype=file.content_type,
            as_attachment=True,
            download_name=file.filename
        )

    except Exception as e:
        logger.error(f"Error in download_document: {str(e)}")
        return jsonify({"message": f"Erreur serveur : {str(e)}"}), 500

# Create or get conversations
@app.route("/messages/conversations", methods=["GET", "POST"])
@jwt_required()
def manage_conversations():
    try:
        current_user_email = get_jwt_identity()
        user = mongo.db.users.find_one({"email": current_user_email})
        if not user:
            doctor = mongo.db.medecins.find_one({"email": current_user_email})
            if not doctor:
                return jsonify({"message": "Utilisateur non trouvé"}), 404
            user_id = str(doctor["_id"])
        else:
            user_id = str(user["_id"])

        if request.method == "GET":
            conversations = mongo.db.conversations.find({
                "$or": [{"patientId": user_id}, {"doctorId": user_id}]
            })
            result = []
            for conv in conversations:
                other_party = mongo.db.medecins.find_one({"_id": ObjectId(conv["doctorId"])}) if conv["patientId"] == user_id else mongo.db.users.find_one({"_id": ObjectId(conv["patientId"])})
                result.append({
                    "id": str(conv["_id"]),
                    "patientId": conv["patientId"],
                    "doctorId": conv["doctorId"],
                    "otherPartyName": other_party["nom" if "nom" in other_party else "name"] if other_party else "Inconnu",
                    "createdAt": conv.get("createdAt", "").strftime("%Y-%m-%d %H:%M") if conv.get("createdAt") else "",
                    "lastMessageAt": conv.get("lastMessageAt", "").strftime("%Y-%m-%d %H:%M") if conv.get("lastMessageAt") else ""
                })
            return jsonify(result), 200

        elif request.method == "POST":
            data = request.get_json()
            doctor_id = data.get("doctorId")
            if not doctor_id:
                return jsonify({"message": "doctorId requis"}), 400

            doctor = mongo.db.medecins.find_one({"_id": ObjectId(doctor_id)})
            if not doctor:
                return jsonify({"message": "Médecin non trouvé"}), 404

            existing_conv = mongo.db.conversations.find_one({
                "patientId": user_id,
                "doctorId": doctor_id
            })
            if existing_conv:
                return jsonify({
                    "message": "Conversation existante",
                    "id": str(existing_conv["_id"])
                }), 200

            conversation = {
                "patientId": user_id,
                "patientName": user["name"],
                "doctorId": doctor_id,
                "doctorName": doctor["nom"],
                "createdAt": datetime.utcnow(),
                "lastMessageAt": None
            }
            result = mongo.db.conversations.insert_one(conversation)
            return jsonify({
                "message": "Conversation créée",
                "id": str(result.inserted_id)
            }), 201

    except Exception as e:
        logger.error(f"Error in manage_conversations: {str(e)}")
        return jsonify({"message": f"Erreur serveur : {str(e)}"}), 500

# Manage messages in a conversation
@app.route("/messages/<conversation_id>", methods=["GET", "POST"])
@jwt_required()
def manage_messages(conversation_id):
    try:
        current_user_email = get_jwt_identity()
        user = mongo.db.users.find_one({"email": current_user_email})
        if not user:
            doctor = mongo.db.medecins.find_one({"email": current_user_email})
            if not doctor:
                return jsonify({"message": "Utilisateur non trouvé"}), 404
            user_id = str(doctor["_id"])
            user_name = doctor["nom"]
        else:
            user_id = str(user["_id"])
            user_name = user["name"]

        conversation = mongo.db.conversations.find_one({"_id": ObjectId(conversation_id)})
        if not conversation:
            return jsonify({"message": "Conversation non trouvée"}), 404

        if conversation["patientId"] != user_id and conversation["doctorId"] != user_id:
            return jsonify({"message": "Accès refusé"}), 403

        if request.method == "GET":
            messages = mongo.db.messages.find({"conversationId": conversation_id})
            result = []
            for msg in messages:
                sender = mongo.db.users.find_one({"_id": ObjectId(msg["senderId"])}) if msg["senderId"] == conversation["patientId"] else mongo.db.medecins.find_one({"_id": ObjectId(msg["senderId"])})
                result.append({
                    "id": str(msg["_id"]),
                    "conversationId": msg["conversationId"],
                    "senderId": msg["senderId"],
                    "senderName": sender["name" if "name" in sender else "nom"] if sender else "Inconnu",
                    "content": msg["content"],
                    "type": msg["type"],
                    "timestamp": msg.get("timestamp", "").strftime("%Y-%m-%d %H:%M") if msg.get("timestamp") else ""
                })
            return jsonify(result), 200

        elif request.method == "POST":
            data = request.get_json()
            content = data.get("content")
            msg_type = data.get("type", "text")
            if not content:
                return jsonify({"message": "Contenu requis"}), 400

            message = {
                "conversationId": conversation_id,
                "senderId": user_id,
                "content": content,
                "type": msg_type,
                "timestamp": datetime.utcnow()
            }
            result = mongo.db.messages.insert_one(message)

            mongo.db.conversations.update_one(
                {"_id": ObjectId(conversation_id)},
                {"$set": {"lastMessageAt": datetime.utcnow()}}
            )

            # Emit WebSocket event
            socketio.emit('new_message', {
                "id": str(result.inserted_id),
                "conversationId": conversation_id,
                "senderId": user_id,
                "senderName": user_name,
                "content": content,
                "type": msg_type,
                "timestamp": message["timestamp"].strftime("%Y-%m-%d %H:%M")
            }, room=conversation_id)

            recipient_id = conversation["doctorId"] if user_id == conversation["patientId"] else conversation["patientId"]
            recipient = mongo.db.medecins.find_one({"_id": ObjectId(recipient_id)}) if user_id == conversation["patientId"] else mongo.db.users.find_one({"_id": ObjectId(recipient_id)})
            if recipient:
                notification = {
                    "userId": recipient_id,
                    "titre": "Nouveau message",
                    "message": f"Nouveau message de {user_name} dans votre conversation.",
                    "date": datetime.utcnow(),
                    "read": False
                }
                mongo.db.notifications.insert_one(notification)

            return jsonify({
                "message": "Message envoyé",
                "id": str(result.inserted_id)
            }), 201

    except Exception as e:
        logger.error(f"Error in manage_messages: {str(e)}")
        return jsonify({"message": f"Erreur serveur : {str(e)}"}), 500

if __name__ == "__main__":
    try:
        socketio.run(app, debug=True, port=5000)
    finally:
        scheduler.shutdown()