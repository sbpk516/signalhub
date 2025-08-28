# Contact Center SignalHub

A real-time call intelligence platform that ingests live or batch call audio and transcripts, applies AI/NLP to detect intent, sentiment, escalation risk, churn signals, and policy violations, and delivers instant insights and summaries.

## 🚀 **Current Status: Phase 1.3 Complete**

**Phase 1.3: Audio Processing Pipeline** ✅ **COMPLETED**
- Complete end-to-end audio processing pipeline
- Real-time monitoring and debugging system
- Performance optimization and benchmarking
- Production-ready deployment guide

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

### **Phase 3: NLP Analysis** 📋 **PLANNED**
- Intent detection
- Sentiment analysis
- Risk assessment

### **Phase 4: Real-time Processing** 📋 **PLANNED**
- Kafka integration
- Stream processing
- Real-time alerts

## 🛠️ **Tech Stack**

### **Core Technologies**
- **Backend**: FastAPI (Python)
- **Database**: PostgreSQL
- **ORM**: SQLAlchemy
- **Configuration**: Pydantic Settings
- **Testing**: Pytest

### **Future Technologies**
- **Audio Processing**: OpenAI Whisper, FFmpeg
- **AI/ML**: PyTorch, Hugging Face Transformers
- **Streaming**: Apache Kafka
- **Search**: Elasticsearch
- **Cache**: Redis
- **Integrations**: Slack, Jira, Zendesk APIs

## 🚀 **Quick Start**

### **Prerequisites**
- Python 3.9+
- PostgreSQL
- Git

### **Installation**

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

6. **Run the application**
   ```bash
   python -m uvicorn backend.app.main:app --reload --port 8001
   ```

### **Verify Installation**

1. **Check API health**
   ```bash
   curl http://localhost:8001/health
   ```

2. **View API documentation**
   - Open: http://localhost:8001/docs

3. **Test endpoints**
   ```bash
   curl http://localhost:8001/
   curl http://localhost:8001/api/v1/status
   curl http://localhost:8001/api/v1/calls
   ```

## 📁 **Project Structure**

```
signalhub/
├── backend/
│   ├── app/
│   │   ├── __init__.py
│   │   ├── main.py          # FastAPI application
│   │   ├── config.py        # Configuration settings
│   │   ├── database.py      # Database connection
│   │   └── models.py        # Database models
│   ├── test_main.py         # Basic tests
│   └── requirements.txt     # Python dependencies
├── audio_uploads/           # Audio file storage
├── logs/                    # Application logs
├── env.example              # Environment variables template
├── .gitignore              # Git ignore rules
├── setup.py                # Setup script
├── test_setup.py           # Test script
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

### **Monitoring & Performance**
- `GET /api/v1/monitor/active` - Get active pipelines
- `GET /api/v1/monitor/history` - Get pipeline history
- `GET /api/v1/monitor/performance` - Get performance metrics
- `GET /api/v1/monitor/alerts` - Get recent alerts

### **Legacy Endpoints**
- `GET /api/v1/calls` - List all calls
- `GET /api/v1/calls/{call_id}` - Get specific call

## 🧪 **Testing**

### **Run Tests**
```bash
# Run all tests
pytest backend/test_main.py

# Run with verbose output
pytest backend/test_main.py -v
```

### **Test Coverage**
```bash
# Install coverage
pip install pytest-cov

# Run with coverage
pytest backend/test_main.py --cov=backend
```

### **Comprehensive Setup Test**
```bash
# Run the setup verification script
python test_setup.py
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

3. **Import Errors**
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

## 🎯 **Next Steps**

### **Phase 3: NLP Analysis** 🔄 **NEXT**
1. Install PyTorch and Transformers
2. Implement intent detection
3. Add sentiment analysis
4. Create risk assessment

### **Phase 4: Real-time Processing**
1. Kafka integration
2. Stream processing
3. Real-time alerts

### **Phase 3: NLP Analysis**
1. Install PyTorch and Transformers
2. Implement intent detection
3. Add sentiment analysis
4. Create risk assessment

## 🤝 **Contributing**

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

## 📄 **License**

This project is licensed under the MIT License.

---

**Phase 1.3 Complete!** 🎉 The audio processing pipeline is production-ready with comprehensive monitoring, testing, and deployment automation.
# Repository renamed and tested - Wed Aug 27 22:58:52 EDT 2025
