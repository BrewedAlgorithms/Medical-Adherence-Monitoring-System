# 🩺 HealthMobi - Complete Project Requirements

## 📋 System Requirements

### Prerequisites
- **Node.js** (v16 or higher)
- **MySQL** (v8.0 or higher)
- **Flutter** (v3.6.0 or higher)
- **Python** (v3.8 or higher)
- **Git** (for version control)

## 🔧 Backend Requirements (Node.js)

### Dependencies (package.json)
The Backend uses Node.js with the following dependencies defined in `Backend/package.json`:

**Core Dependencies:**
- express: ^4.21.2
- mysql2: ^3.12.0
- mysql: ^2.18.1
- dotenv: ^16.5.0
- morgan: ^1.10.0
- multer: ^1.4.5-lts.1
- body-parser: ^1.20.2
- moment-timezone: ^0.5.47
- node-cron: ^3.0.3
- twilio: ^5.5.0
- ws: ^8.18.1
- socket.io-client: ^4.8.1
- cloudinary: ^2.6.0

**Security & Performance:**
- cors: ^2.8.5
- helmet: ^7.1.0
- compression: ^1.7.4
- rate-limiter-flexible: ^4.0.1
- bcryptjs: ^2.4.3
- jsonwebtoken: ^9.0.2
- nodemailer: ^6.9.7

## 🤖 AI Assistant Service Requirements (Python)

### Core AI Dependencies
```
flask==2.3.3
flask-cors==4.0.0
python-dotenv==1.0.0
google-generativeai==0.3.2
langchain==0.0.267
langchain-google-genai==0.0.5
openai==1.3.0
transformers==4.35.0
torch==2.1.0
```

### Database & Security
```
mysql-connector-python==8.1.0
pymysql==1.1.0
cryptography==41.0.4
PyJWT==2.8.0
```

### Data Processing
```
numpy==1.24.3
pandas==2.0.3
scikit-learn==1.3.0
nltk==3.8.1
spacy==3.7.2
textblob==0.17.1
```

### Web Server
```
python-multipart==0.0.6
gunicorn==21.2.0
requests==2.31.0
```

## 📄 Prescription Extraction Service Requirements (Python)

### Image Processing
```
opencv-python==4.8.1.78
pytesseract==0.3.10
Pillow==10.0.1
easyocr==1.7.0
pdf2image==1.16.3
```

### AI & ML
```
transformers==4.35.0
torch==2.1.0
google-generativeai==0.3.2
langchain==0.0.267
langchain-google-genai==0.0.5
```

### Core Dependencies
```
flask==2.3.3
flask-cors==4.0.0
python-dotenv==1.0.0
numpy==1.24.3
pandas==2.0.3
scikit-learn==1.3.0
mysql-connector-python==8.1.0
pymysql==1.1.0
cryptography==41.0.4
PyJWT==2.8.0
requests==2.31.0
python-multipart==0.0.6
gunicorn==21.2.0
```

## 📱 Frontend Requirements (Flutter)

### Core Flutter Dependencies
```yaml
dependencies:
  flutter:
    sdk: flutter
  cupertino_icons: ^1.0.8
  shared_preferences: ^2.5.1
  google_fonts: ^6.2.1
  flutter_riverpod: ^2.6.1
  http: ^1.3.0
  socket_io_client: ^3.0.2
```

### UI & UX
```yaml
  resize: ^1.0.0
  progress_border: ^0.1.5
  speedometer_chart: ^1.0.8
  shimmer: ^3.0.0
  flutter_markdown: ^0.7.6+2
```

### Authentication & Input
```yaml
  flutter_otp_text_field: ^1.5.1+1
  intl_phone_number_input: ^0.7.4
```

### Media & Camera
```yaml
  image_picker: ^1.1.2
  camera: ^0.11.1
```

### Localization
```yaml
  intl: ^0.20.2
```

### Development
```yaml
dev_dependencies:
  flutter_test:
    sdk: flutter
  flutter_lints: ^5.0.0
```

## 🗄️ Database Requirements

### MySQL Configuration
- **Version**: 8.0 or higher
- **Character Set**: UTF-8
- **Collation**: utf8mb4_unicode_ci
- **Storage Engine**: InnoDB

### Required Databases
- **HealthMobi**: Main application database

### Key Tables
- Users (patients and doctors)
- AuthTokens (authentication)
- Courses (medication courses)
- MedicineCourses (individual medicines)
- MedicineIntakes (intake records)
- MediQuotes (daily quotes)
- PrescriptionImages (prescription images)
- PrescriptionVoiceNotes (voice notes)
- UserNotes (personal notes)

## 🔌 External Service Requirements

### Twilio (Optional)
- **Account SID**: For SMS/WhatsApp notifications
- **Auth Token**: For API authentication
- **WhatsApp Number**: For messaging

### Cloudinary (Optional)
- **Cloud Name**: For image storage
- **API Key**: For uploads
- **API Secret**: For authentication

### Google AI (Required for AI Services)
- **API Key**: For Google Generative AI
- **Project ID**: For Google Cloud services

## 📁 Requirements Files

### Backend
- **File**: `Backend/package.json`
- **Installation**: `npm install`

### AI Assistant Service
- **File**: `AI Layer/AI Assistent Service/requirements.txt`
- **Installation**: `pip install -r requirements.txt`

### Prescription Extraction Service
- **File**: `AI Layer/Prescription Extraction Service/requirements.txt`
- **Installation**: `pip install -r requirements.txt`

### Frontend
- **File**: `Frontend/pubspec.yaml`
- **Installation**: `flutter pub get`

## 🚀 Installation Commands

### Backend Setup
```bash
cd Backend
npm install
```

### AI Services Setup
```bash
cd "AI Layer/AI Assistent Service"
pip install -r requirements.txt

cd "../Prescription Extraction Service"
pip install -r requirements.txt
```

### Frontend Setup
```bash
cd Frontend
flutter pub get
```

## 📋 Environment Variables

### Backend (.env)
```env
# Database
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=HealthMobi

# Twilio (Optional)
TWILIO_ACCOUNT_SID=AC...
TWILIO_AUTH_TOKEN=...
TWILIO_WHATSAPP_FROM=+14155238886

# Server
PORT=3001
NODE_ENV=development
```

### AI Services (.env)
```env
# Google AI
GOOGLE_API_KEY=your_google_api_key

# Database
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=HealthMobi

# OpenAI (Optional)
OPENAI_API_KEY=your_openai_api_key
```

## 🔧 Development Tools

### Recommended IDEs
- **VS Code** with extensions:
  - Flutter
  - Dart
  - Python
  - Node.js
  - MySQL

### Version Control
- **Git** for source control
- **GitHub/GitLab** for repository hosting

### Testing Tools
- **Jest** for Node.js testing
- **Pytest** for Python testing
- **Flutter Test** for Flutter testing

---

**Note**: All version numbers are compatible with the current project structure and README specifications. 