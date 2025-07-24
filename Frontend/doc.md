# Frontend Documentation

## Overview
The Frontend component is a Flutter-based mobile application named "healthmobi" that provides a healthcare/medication tracking interface. The application is built using Flutter SDK with Dart programming language.

## Technology Stack
- **Framework**: Flutter
- **Language**: Dart
- **Flutter SDK Version**: ^3.6.0
- **State Management**: flutter_riverpod (^2.6.1)

## Key Dependencies
- **UI/Design**:
  - google_fonts (^6.2.1)
  - resize (^1.0.0)
  - progress_border (^0.1.5)
  - speedometer_chart (^1.0.8)
  - shimmer (^3.0.0)
  - flutter_markdown (^0.7.6+2)

- **Networking/Communication**:
  - http (^1.3.0)
  - socket_io_client (^3.0.2)

- **Device Features**:
  - image_picker (^1.1.2)
  - camera (^0.11.1)

- **Authentication/Input**:
  - flutter_otp_text_field (^1.5.1+1)
  - intl_phone_number_input (^0.7.4)

- **Data Persistence**:
  - shared_preferences (^2.5.1)

## Project Structure
The application follows the standard Flutter project structure with:
- `lib/`: Contains the main Dart source code
- `assets/`: Contains images and other static resources
- `android/`: Android-specific configuration
- `pubspec.yaml`: Dependency and configuration file

## Building & Running
1. Ensure Flutter SDK (^3.6.0) is installed
2. Run `flutter pub get` to download dependencies
3. Connect a device or emulator
4. Run `flutter run` to start the application

## Key Features
- User authentication with OTP verification
- Medication tracking interface
- Real-time communication with backend using WebSockets
- Camera integration for image capture
- Health metrics visualization with charts

## Architecture
The application appears to use Riverpod for state management, suggesting a component-based architecture with separation of UI, business logic, and data layers.

## WebSocket Communication
The app uses socket_io_client to establish real-time communication with the backend server, likely for receiving medication reminders and sending compartment status.

## Notes for Developers
- The project uses Material Design
- Custom assets should be placed in the assets/images/ directory
- The codebase follows Flutter's recommended linting rules (flutter_lints package) 

---

# 🖥️ System Architecture (Frontend)

```mermaid
graph TD
    User["User (Patient/Doctor)"]
    App["Flutter App"]
    API["API Provider"]
    State["Riverpod Providers"]
    Backend["Backend Server"]
    Socket["WebSocket Client"]
    AI["AI Layer"]

    User -- "UI Interaction" --> App
    App -- "State Updates" --> State
    App -- "API Calls" --> API
    API -- "HTTP" --> Backend
    App -- "WebSocket Events" --> Socket
    Socket -- "Real-time" --> Backend
    App -- "AI Chat/Extraction" --> AI
```

**Explanation:**
- The app interacts with the backend via REST API and WebSocket, manages state with Riverpod, and integrates with the AI layer for chat and extraction.

---

# 🗺️ Main Screen Navigation Flow

```mermaid
flowchart TD
    Logo["Logo Screen"] --> OTP["OTP Screen"]
    OTP --> Dashboard["Dashboard Screen"]
    Dashboard --> Pillbox["Pillbox Screen"]
    Dashboard --> Medi["Medication Screen"]
    Dashboard --> Profile["Profile Screen"]
    Dashboard --> Rewards["Rewards Screen"]
    Dashboard --> Chat["Chat Screen"]
    Dashboard --> History["History Screen"]
    Dashboard --> AddRx["Add Prescription Screen"]
    Dashboard --> Book["Book Screen"]
    Dashboard --> Tab["Tab Screen"]
```

**Explanation:**
- The main navigation starts from the logo and OTP screens, then routes to the dashboard and its feature screens.

---

# 🔄 Provider/State Management Flow

```mermaid
graph TD
    UI["UI Widgets"]
    Provider["Riverpod Providers"]
    API["API/Data Layer"]
    State["App State"]

    UI -- "Read/Watch" --> Provider
    Provider -- "Fetch/Update" --> API
    API -- "HTTP/WebSocket" --> Backend
    Provider -- "Update" --> State
    State -- "Notify" --> UI
```

**Explanation:**
- UI widgets interact with Riverpod providers, which fetch/update data via API and manage app state.

---

# 📡 API & Notification Flow

```mermaid
sequenceDiagram
    participant App
    participant API
    participant Backend
    participant Socket
    participant User
    App->>API: REST API call (e.g., login, fetch courses)
    API->>Backend: HTTP request
    Backend-->>API: Response
    API-->>App: Data update
    Backend->>Socket: Emit notification (reminder)
    Socket-->>App: Receive real-time event
    App-->>User: Show notification
```

**Explanation:**
- The app uses REST API for data and WebSocket for real-time notifications, updating the UI accordingly.

---

# 🧭 Integration Points
- **Backend:** REST API and WebSocket for all data and notifications.
- **AI Layer:** API calls for chat and prescription extraction.
- **Riverpod:** State management for all UI and business logic.
- **Device Features:** Camera, image picker, and local storage for enhanced UX.

--- 
