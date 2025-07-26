# FamFlix - Educational Video Personalization Platform

FamFlix is an advanced AI-powered platform that creates personalized educational videos by replacing faces and voices in template videos with family members. Transform educational content like "Baby Shark" into engaging experiences featuring your loved ones.

## 🚀 Features

- **AI Face Swapping**: Replace actors' faces with family photos using advanced deep learning models
- **Voice Synthesis**: Convert voices using ElevenLabs voice cloning technology
- **Speech Alignment**: Intelligent voice synchronization with original video timing
- **Multi-Profile Management**: Create and manage multiple family member profiles
- **Template Library**: Curated collection of educational video templates
- **Real-time Processing**: Background ML processing with status tracking
- **Premium Content**: Subscription-based access to premium templates

## 🛠 Technology Stack

### Frontend
- **React + TypeScript** - Component-based UI
- **Tailwind CSS + shadcn/ui** - Modern styling system
- **TanStack Query** - Server state management
- **Wouter** - Lightweight routing
- **Vite** - Fast development and building

### Backend
- **Node.js + Express** - RESTful API server
- **PostgreSQL + Drizzle ORM** - Database with type-safe queries
- **Passport.js** - Authentication system
- **Stripe** - Payment processing
- **FastAPI (Python)** - ML model inference service

### AI/ML Stack
- **Face Processing**: DeepFakes/Faceswap models with OpenCV
- **Voice Processing**: ElevenLabs voice cloning API
- **Video Processing**: FFmpeg for media manipulation

## 📋 Prerequisites

- Node.js 18+ and npm
- Python 3.10+ with pip
- PostgreSQL 16+
- FFmpeg
- Git

## 🔧 Installation

1. **Clone the repository**
```bash
git clone https://github.com/yourusername/famflix.git
cd famflix
```

2. **Install Node.js dependencies**
```bash
npm install
```

3. **Install Python dependencies (optional - only needed for face processing)**
```bash
pip install fastapi uvicorn librosa numpy opencv-python-headless soundfile pydantic python-multipart
```

4. **Set up environment variables**
```bash
cp .env.example .env
```

Configure these required variables:
```env
DATABASE_URL=postgresql://user:password@localhost:5432/famflix
STRIPE_SECRET_KEY=sk_test_...
VITE_STRIPE_PUBLIC_KEY=pk_test_...
```

5. **Set up the database**
```bash
npm run db:push
```

6. **Start the development server**
```bash
# Start the main application
npm run dev
```

The application will be available at `http://localhost:5000`

## 🏗 Project Structure

```
famflix/
├── client/                 # React frontend
│   ├── src/
│   │   ├── components/     # Reusable UI components
│   │   ├── pages/          # Application pages
│   │   └── lib/            # Utilities and hooks
├── server/                 # Node.js backend
│   ├── routes.ts           # API endpoints
│   ├── auth.ts             # Authentication logic
│   └── storage.ts          # Database operations
├── shared/                 # Shared types and schemas
│   └── schema.ts           # Database schema
└── public/                 # Static assets
```

## 🔐 Environment Setup

### Required API Keys

1. **Stripe Keys** (for payments):
   - Get from [Stripe Dashboard](https://dashboard.stripe.com/apikeys)
   - Add `STRIPE_SECRET_KEY` and `VITE_STRIPE_PUBLIC_KEY`

2. **Database URL**:
   - Local PostgreSQL: `postgresql://user:password@localhost:5432/famflix`
   - Or use NeonDB for cloud hosting

3. **ElevenLabs API Key** (for voice cloning):
   - Get from [ElevenLabs Dashboard](https://elevenlabs.io/)
   - Add `ELEVENLABS_API_KEY` to your environment variables

### Optional Keys

- `HUGGINGFACE_API_KEY` - For enhanced ML model performance
- `OPENAI_API_KEY` - For potential AI features

## 🚀 Deployment

### Deployment Options
1. **Vercel**: Deploy with Vercel for serverless functions
2. **Railway**: Deploy with Railway for full-stack applications
3. **Render**: Deploy with Render for web services
4. **DigitalOcean App Platform**: Deploy with DigitalOcean for scalable applications
3. Click "Deploy" to create a production deployment

### Manual Deployment
1. Build the application:
```bash
npm run build
```

2. Set up production database and environment variables

3. Start the production server:
```bash
npm start
```

## 📖 API Documentation

### Authentication
- `POST /api/auth/login` - User login
- `POST /api/auth/register` - User registration
- `POST /api/auth/logout` - User logout

### User Management
- `GET /api/users/:id` - Get user profile
- `POST /api/users` - Create user
- `GET /api/users/:userId/people` - Get user's people profiles

### Media Processing
- `POST /api/faceImages` - Upload face images
- `POST /api/voiceRecordings` - Upload voice recordings
- `POST /api/processedVideos` - Process video with face/voice swap

### Templates
- `GET /api/videoTemplates` - List all templates
- `GET /api/videoTemplates/featured` - Get featured templates
- `GET /api/videoTemplates/category/:category` - Filter by category

## 🧪 Testing

Run the test suite:
```bash
npm test
```



## 🔧 Configuration

### Voice Configuration
Voice processing is handled entirely by ElevenLabs:
- **Voice Cloning**: Uses ElevenLabs voice cloning API for high-quality voice synthesis
- **Voice Settings**: Configurable stability and similarity boost parameters
- **Audio Quality**: High-quality MP3 output with configurable settings
- `noiseReduction`: Apply noise filtering

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

- **Documentation**: Check the codebase for detailed technical information
- **Issues**: Create a GitHub issue for bugs or feature requests
- **Discord**: Join our community for real-time support

## 🙏 Acknowledgments

- OpenAI for AI/ML guidance
- Vercel/Railway/Render for hosting and deployment platform
- The open-source community for amazing tools and libraries

---

**Built with ❤️ for families who want to make learning more personal and engaging.**# FamFlixProject
