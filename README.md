# Contact Center SignalHub

A real-time call intelligence platform that ingests live or batch call audio and transcripts, applies AI/NLP to detect intent, sentiment, escalation risk, churn signals, and policy violations, and delivers instant insights and summaries.

## 🚀 **Current Status: Phase 4 Complete**

**Phase 4: Frontend UI** ✅ **COMPLETED**
- Complete React/TypeScript frontend with professional UI
- Dashboard, Upload, and Results pages
- Responsive design with Tailwind CSS
- Navigation and state management
- Professional styling and user experience

## 📋 **Project Overview**

**Duration:** Jan 2022 – Dec 2022  
**Description:** Built a real-time call intelligence platform that ingests live or batch call audio and transcripts, applies AI/NLP to detect intent, sentiment, escalation risk, churn signals, and policy violations, and delivers instant insights and summaries.

## 🏗️ **Implementation Phases**

### **Phase 0: Foundation Setup** ✅ **COMPLETED**
- ✅ Basic Python environment
- ✅ FastAPI application
- ✅ PostgreSQL database setup
- ✅ Basic project structure
- ✅ Health check endpoints

### **Phase 1: Audio Ingestion** ✅ **COMPLETED**
- Audio file upload API
- File storage and management
- Basic audio validation
- Audio processing and analysis
- Whisper integration for transcription
- Database integration for storing results

### **Phase 1.3: Audio Processing Pipeline** ✅ **COMPLETED**
- **Week 1**: Pipeline Orchestrator & API Integration
- **Week 2**: Individual Step Implementation & Error Handling
- **Week 3**: Debugging & Monitoring System
- **Week 4**: Testing & Production Readiness

### **Phase 2: Speech-to-Text** ✅ **COMPLETED** (Integrated in Phase 1.3)
- OpenAI Whisper integration
- Audio to text conversion
- Transcript storage

### **Phase 3: NLP Analysis** ✅ **COMPLETED**
- Intent detection with NLTK and VADER
- Sentiment analysis
- Risk assessment
- Text preprocessing and analysis
- Integration with existing pipeline

### **Phase 4: Frontend UI** ✅ **COMPLETED**
- **Week 1**: Basic UI Structure
  - Header, Sidebar, Layout components
  - Dashboard page with stats and activity
  - Upload page with drag & drop functionality
  - Results page with search and filtering
- Professional React/TypeScript interface
- Tailwind CSS styling and responsive design
- Navigation and state management
- Complete user experience

### **Phase 5: Real-time Processing** 📋 **PLANNED**
- Kafka integration
- Stream processing
- Real-time alerts

## 🛠️ **Tech Stack**

### **Backend Technologies**
- **Backend**: FastAPI (Python)
- **Database**: PostgreSQL
- **ORM**: SQLAlchemy
- **Configuration**: Pydantic Settings
- **Testing**: Pytest
- **Audio Processing**: OpenAI Whisper, FFmpeg
- **AI/ML**: NLTK, VADER Sentiment Analysis

### **Frontend Technologies**
- **Frontend**: React 18 with TypeScript
- **Build Tool**: Vite
- **Styling**: Tailwind CSS
- **State Management**: React Hooks
- **Testing**: Jest + React Testing Library

### **Future Technologies**
- **AI/ML**: PyTorch, Hugging Face Transformers
- **Streaming**: Apache Kafka
- **Search**: Elasticsearch
- **Cache**: Redis
- **Integrations**: Slack, Jira, Zendesk APIs

## 🚀 **Quick Start**

### **Prerequisites**
- Python 3.9+
- Node.js 20.19+ or 22.12+
- PostgreSQL
- Git

### **Backend Installation**

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd signalhub
   ```

2. **Create virtual environment**
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

3. **Install dependencies**
   ```bash
   pip install -r requirements.txt
   ```

4. **Set up environment variables**
   ```bash
   cp env.example .env
   # Edit .env with your database credentials
   ```

5. **Set up PostgreSQL**
   ```bash
   # Create database and user
   createdb signalhub
   createuser signalhub
   # Set password for signalhub user
   psql -d signalhub -c "ALTER USER signalhub WITH PASSWORD 'signalhub123';"
   ```

6. **Run the backend**
   ```bash
   # Port configured in config.js - change there to update everywhere
   source venv/bin/activate && cd backend && python start.py
   ```

### **Frontend Installation**

1. **Navigate to frontend directory**
   ```bash
   cd frontend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Start development server**
   ```bash
   npm run dev
   ```

4. **Access the application**
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:8001

### **Verify Installation**

1. **Check backend API health**
   ```bash
   curl http://localhost:8001/health
   ```

2. **View API documentation**
   - Open: http://localhost:8001/docs

3. **Test frontend**
   - Open: http://localhost:3000
  - Navigate between Dashboard, Upload, and Results pages

## 🖥️ **Desktop Development (Electron) — Debug First**

We are adding desktop apps (macOS + Windows) using Electron with a debug‑first, minimal approach. See detailed phases in `docs/desktop-plan.md`.

Quick dev run (unsigned, local):
- Backend (terminal A):
  - `bash scripts/clear-ports.sh`
  - `bash scripts/start-backend.sh` (or `source venv/bin/activate && python backend/start.py`)
- Desktop shell + Frontend (terminal B):
  - `cd desktop && npm install`
  - `npm run dev`

What to expect:
- Electron launches and loads `http://localhost:3000` (Vite dev server).
- Results page works against backend on `http://127.0.0.1:8001`.
- Toggle “Created” column header to switch newest/oldest; watch console logs for order checks.
- In DevTools Console, `window.api.ping()` returns `"pong"`.

Notes:
- Do not run `scripts/start-all.sh` together with `desktop npm run dev` (both start the frontend dev server). Use backend‑only start.
- For packaging (DMG/NSIS), build the renderer with a relative base to avoid blank screens:
  - `cd frontend && npm run build:electron` (uses `--base=./`)
  - then `cd ../desktop && npm run dist`
  - API base URL switching for packaged apps is handled automatically.


## 📁 **Project Structure**

```
signalhub/
├── backend/
│   ├── app/
│   │   ├── __init__.py
│   │   ├── main.py          # FastAPI application
│   │   ├── config.py        # Configuration settings
│   │   ├── database.py      # Database connection
│   │   ├── models.py        # Database models
│   │   ├── audio_processor.py    # Audio processing
│   │   ├── whisper_processor.py  # Speech-to-text
│   │   ├── nlp_processor.py      # NLP analysis
│   │   └── pipeline_orchestrator.py # Pipeline management
│   ├── test_main.py         # Basic tests
│   └── requirements.txt     # Python dependencies
├── frontend/
│   ├── src/
│   │   ├── components/      # React components
│   │   │   ├── Header/      # Header components
│   │   │   ├── Sidebar/     # Sidebar components
│   │   │   ├── Layout/      # Layout components
│   │   │   └── Shared/      # Shared components
│   │   ├── pages/           # Page components
│   │   │   ├── Dashboard.tsx
│   │   │   ├── Upload.tsx
│   │   │   └── Results.tsx
│   │   ├── App.tsx          # Main app component
│   │   └── main.tsx         # Entry point
│   ├── package.json         # Node.js dependencies
│   └── tailwind.config.js   # Tailwind configuration
├── audio_uploads/           # Audio file storage
├── logs/                    # Application logs
├── env.example              # Environment variables template
├── .gitignore              # Git ignore rules
└── README.md               # This file
```

## 🔧 **API Endpoints**

### **Health & Status**
- `GET /` - Welcome message
- `GET /health` - Health check
- `GET /api/v1/status` - API status

### **Audio Processing Pipeline**
- `POST /api/v1/pipeline/upload` - Complete audio processing pipeline
- `GET /api/v1/pipeline/{call_id}/status` - Get pipeline status
- `GET /api/v1/pipeline/{call_id}/debug` - Get debug information

### **NLP Analysis**
- `POST /api/v1/nlp/analyze/{call_id}` - Analyze specific call
- `GET /api/v1/nlp/intent/{call_id}` - Get intent for call
- `GET /api/v1/nlp/sentiment/{call_id}` - Get sentiment for call
- `GET /api/v1/nlp/risk/{call_id}` - Get risk assessment

### **Monitoring & Performance**
- `GET /api/v1/monitor/active` - Get active pipelines
- `GET /api/v1/monitor/history` - Get pipeline history
- `GET /api/v1/monitor/performance` - Get performance metrics
- `GET /api/v1/monitor/alerts` - Get recent alerts

### **Legacy Endpoints**
- `GET /api/v1/calls` - List all calls
- `GET /api/v1/calls/{call_id}` - Get specific call

## 🧪 **Testing**

### **Backend Tests**
```bash
# Run all tests
pytest backend/test_main.py

# Run with verbose output
pytest backend/test_main.py -v
```

### **Frontend Tests**
```bash
cd frontend
npm test
```

### **Test Coverage**
```bash
# Install coverage
pip install pytest-cov

# Run with coverage
pytest backend/test_main.py --cov=backend
```

## 🔍 **Debugging**

### **Common Issues**

1. **Database Connection Error**
   ```bash
   # Check PostgreSQL is running
   brew services list | grep postgresql
   
   # Check database exists
   psql -l | grep signalhub
   ```

2. **Port Already in Use**
   ```bash
   # Check what's using port 8001
   lsof -i :8001
   
   # Kill process
   kill -9 <PID>
   ```

3. **Frontend Issues**
   ```bash
   # Clear Vite cache
   cd frontend && rm -rf node_modules/.vite
   
   # Restart development server
   npm run dev
   ```

4. **Import Errors**
   ```bash
   # Make sure you're in the right directory
   pwd
   
   # Check virtual environment is activated
   which python
   ```

## 📊 **Database Schema**

### **Tables Created**
- **users** - User management
- **calls** - Call metadata
- **transcripts** - Call transcripts
- **analyses** - AI analysis results
- **nlp_analysis** - NLP analysis results

## 🎯 **Next Steps**

### **Phase 5: Real-time Processing** 🔄 **NEXT**
1. Kafka integration
2. Stream processing
3. Real-time alerts
4. Live audio streaming

### **Future Enhancements**
1. **Advanced Analytics** - Business intelligence dashboard
2. **Multi-language Support** - International call processing
3. **Speaker Diarization** - Identify different speakers
4. **Custom Models** - Fine-tuned AI models
5. **Mobile App** - iOS/Android applications

## 🤝 **Contributing**

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

## 📄 **License**

This project is licensed under the MIT License.

---

**Phase 4 Complete!** 🎉 The SignalHub platform now has a complete frontend UI with professional styling, responsive design, and full user experience. Ready for real-time processing implementation!
