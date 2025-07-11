# FamFlix - Educational Video Personalization Platform

## Overview

FamFlix is a full-stack web application that allows users to personalize educational videos by replacing the faces and voices of actors with their own family members. The platform focuses on creating engaging educational content for children by incorporating familiar faces and voices into popular educational videos like "Baby Shark."

## System Architecture

### Frontend Architecture
- **Framework**: React with TypeScript
- **Styling**: Tailwind CSS with shadcn/ui component library
- **State Management**: TanStack Query (React Query) for server state
- **Routing**: Wouter for client-side routing
- **Build Tool**: Vite with custom plugins for theme management
- **UI Components**: Radix UI primitives with custom theming

### Backend Architecture
- **Runtime**: Node.js with TypeScript
- **Framework**: Express.js for REST API
- **Database**: PostgreSQL with Drizzle ORM
- **Authentication**: Passport.js with local strategy and session-based auth
- **File Storage**: Local file system with multer for uploads
- **ML Processing**: Hybrid Python/Node.js architecture for face and voice processing

### Database Design
- **ORM**: Drizzle with PostgreSQL driver (@neondatabase/serverless)
- **Migrations**: Managed through drizzle-kit
- **Schema**: Comprehensive relational design supporting users, people profiles, face images, voice recordings, video templates, and processed videos

## Key Components

### Authentication System
- Session-based authentication using express-session
- PostgreSQL session store for persistence
- Password hashing with scrypt
- Role-based access control (user/admin)
- Protected routes on both client and server

### Media Processing Pipeline
- **Face Processing**: Deep learning models for face detection, extraction, and swapping
- **Voice Processing**: TTS and voice conversion using specialized models
- **Video Processing**: FFmpeg-based video manipulation and rendering
- **ML Models**: Support for multiple face swap models (DeepFakes/Faceswap) and voice models (Tacotron, YourTTS, SV2TTS)

### User Management
- Multi-profile system allowing users to create multiple "people" profiles
- Face and voice training data management
- Subscription management with Stripe integration
- Admin dashboard for user and content management

### Video Template System
- Predefined video templates with metadata
- Category and age-range filtering
- Premium/free tier content distinction
- Template-based processing workflow

## Data Flow

1. **User Registration/Login**: Users authenticate through the session-based system
2. **Profile Creation**: Users create "people" profiles representing family members
3. **Training Data Upload**: Users upload face images/videos and voice recordings for each person
4. **ML Processing**: Training data is processed to extract embeddings and features
5. **Template Selection**: Users browse and select video templates from the library
6. **Video Processing**: Selected faces and voices are swapped into the template video
7. **Result Delivery**: Processed videos are saved and made available for playback

## External Dependencies

### Core Dependencies
- **Database**: NeonDB (PostgreSQL) for production deployment
- **Payment Processing**: Stripe for subscription management
- **ML/AI**: 
  - Anthropic SDK for potential AI features
  - Python FastAPI service for ML model inference
  - FFmpeg for video processing
  - OpenCV for computer vision tasks
  - LibROSA for audio processing

### Development Tools
- **Deployment**: Replit with autoscale deployment target
- **Package Management**: npm with uv for Python dependencies
- **Build System**: Vite for frontend, esbuild for backend production builds

## Deployment Strategy

### Production Environment
- **Platform**: Replit with autoscale deployment
- **Frontend**: Static files served from `/dist/public`
- **Backend**: Node.js server running on port 5000
- **Database**: PostgreSQL 16 with connection pooling
- **File Storage**: Local filesystem with `/public/videos` for processed content

### Development Environment
- **Hot Reload**: Vite dev server with HMR
- **Database**: Local PostgreSQL or NeonDB connection
- **ML Services**: Local Python FastAPI server on port 8001
- **Asset Management**: Local file storage with development paths

### Environment Configuration
- **Database**: `DATABASE_URL` for PostgreSQL connection
- **Stripe**: `STRIPE_SECRET_KEY` and `VITE_STRIPE_PUBLIC_KEY`
- **ML Services**: Optional `HUGGINGFACE_API_KEY` for enhanced processing
- **Session**: Auto-generated session secrets for development

## Changelog

## Recent Changes

### Voice Alignment System Implementation (June 15, 2025)
- **Fixed critical voice synchronization issue** where voices weren't matching actor speech timing
- **Implemented speech alignment system** that analyzes original video timing and syncs voice recordings
- **Added voice alignment preview** with compatibility scoring before processing
- **Enhanced error handling** for tempo calculations and FFmpeg processing
- **Created fallback mechanisms** to prevent processing failures
- **Replaced audio track replacement** with proper speech-to-speech alignment

### Interactive Voice Testing System Implementation (June 16, 2025)
- **Built comprehensive voice comparison platform** allowing users to record themselves reading scripts and compare with AI-generated voice
- **Implemented real-time voice recording** with Web Audio API integration and microphone access
- **Created dual-tab interface** with "Generate Voice" and "Voice Comparison" modes for complete testing workflow
- **Added intelligent similarity scoring** based on duration matching and content analysis
- **Enhanced script library** with 5 educational content types (stories, counting, animals, encouragement, colors)
- **Integrated progress tracking** with visual recording indicators and real-time duration display

### Voice Clone System with Automatic Training (June 22, 2025)
- **Automatic voice cloning during upload** - voice recordings are sent to ElevenLabs for cloning in background
- **Persistent voice storage** - cloned voice IDs stored in database under each person's profile
- **Background processing system** with status tracking (pending, processing, completed, failed)
- **Preview system using stored clones** - voice preview uses actual trained voice clones instead of temporary ones
- **Enhanced database schema** with voice clone status, ElevenLabs voice IDs, and error tracking
- **Proper API error handling** for voice clone readiness and processing status
- **Story generation with authentic voices** - children's stories read by user's actual cloned voice
- **Fixed FormData implementation** - proper multipart form-data with form-data package for ElevenLabs API
- **Voice training interface fixes** - added required audioUrl field and proper completion callbacks
- **Audio format conversion** - implemented FFmpeg conversion from WebM/OGG to WAV for ElevenLabs compatibility
- **Working voice cloning pipeline** - complete integration from browser recording to ElevenLabs voice clone storage
- **Live voice clone deployment** - successfully created real ElevenLabs voice clone (ID: NqNShvjvQwGrUBZgssTh) and integrated with database
- **Voice generation system operational** - voice preview feature now uses authentic cloned voices for story generation

### Comprehensive Voice Training with Recording Combination (June 24, 2025)
- **Automatic recording combination** - all voice recordings are combined into single enhanced training file
- **Enhanced voice cloning endpoint** - `/api/voice/combine-recordings` processes all user recordings together
- **Improved training completion flow** - voice training automatically triggers combination and clone creation
- **Better audio processing** - FFmpeg filters for optimal voice clone quality (noise reduction, normalization)
- **Real-time progress feedback** - user sees combination progress with enhanced UI indicators
- **Comprehensive voice data** - uses all recording types (introduction, counting, questions, storytelling, expressions) for better clone accuracy

### Advanced Audio Cleaning System (June 24, 2025)
- **Automatic background noise removal** - all voice recordings are cleaned before processing
- **Multi-stage audio processing** - noise reduction, click removal, silence trimming, and normalization
- **Enhanced audio filters** - advanced FFmpeg filters for optimal voice quality (afftdn, acompressor, anlmdn)
- **Improved voice clone accuracy** - cleaned audio produces significantly better voice clones
- **Seamless integration** - audio cleaning happens automatically during upload without user intervention
- **Fallback protection** - original audio preserved if cleaning fails

### Animated Stories Feature (June 24, 2025)
- **Complete stories section** - new navigation area dedicated to animated voice-only stories
- **Story categories** - bedtime, adventure, educational, and fairytale stories for different moods
- **Age-appropriate content** - stories filtered by age ranges (2-4, 4-6, 6-8, 8+ years)
- **Personalized narration** - stories read using family member's cloned voices
- **Animated visuals** - synchronized animations that play alongside the audio narration
- **Story management** - user sessions, play tracking, and progress saving
- **Rich story library** - pre-loaded with 6 engaging children's stories
- **Interactive player** - full audio controls, progress tracking, and visual animations

### Enhanced Admin Interface for Content Management (June 25, 2025)
- **Admin Stories Management** - comprehensive interface for creating, editing, and managing animated stories
- **Video Upload System** - improved UI for uploading video templates with file management and metadata
- **Category Management** - support for all story categories including voice-only content
- **Content Statistics** - dashboard showing category breakdowns and content metrics
- **Bulk Operations** - ability to show/hide stories and manage content visibility
- **File Upload Interface** - drag-and-drop support for videos and thumbnails with progress tracking

### Performance & Scalability Improvements (June 25, 2025)
- **Database Optimization** - added comprehensive indexes on frequently queried fields for better performance
- **Caching System** - implemented in-memory caching for users, templates, stories, and frequently accessed data
- **Request Performance** - added compression, request timing, and performance monitoring middleware
- **Security Enhancements** - implemented rate limiting, request size limits, and security headers with Helmet
- **Error Tracking** - enhanced error handling with detailed logging and error tracking
- **Memory Monitoring** - added memory usage monitoring and performance metrics collection
- **Analytics Endpoints** - admin analytics for cache statistics and system performance monitoring

### User Experience Enhancements (June 25, 2025)
- **Loading States** - implemented skeleton loaders for all major components (stories, people, video templates)
- **Error Boundaries** - comprehensive error handling with graceful fallbacks and retry mechanisms
- **Offline Support** - added offline detection banner and connection status monitoring
- **Performance Monitoring** - client-side performance tracking with render time and memory usage metrics
- **Progress Indicators** - enhanced progress bars with animations and percentage displays
- **Responsive Design** - improved skeleton loading states that match actual content layout
- **Error Recovery** - user-friendly error messages with retry and navigation options

### Navigation System Overhaul (July 2, 2025)
- **Complete navigation redesign** with mobile-first responsive approach
- **Mobile bottom navigation** showing 5 core features with "More" menu for AI tools
- **Desktop horizontal scrolling** navigation accommodating all platform features
- **iOS safe area support** with proper spacing for notched devices
- **Fixed scrolling issues** allowing access to all features including AI Creator and Voice Coach
- **Enhanced accessibility** with proper touch targets and visual feedback

### Authentication Flow Enhancement (January 11, 2025)
- **Fixed authentication redirect behavior** - logged-in users automatically go to homepage instead of landing page
- **Added proper navigation component** with user menu, logout functionality, and admin badge display
- **Improved user experience flow** - landing page only shows for non-authenticated users
- **Enhanced navigation structure** with clear visual indicators for current page and user status
- **Streamlined authentication process** eliminating redirect loops and improving page load experience

### Beautiful Homepage UI Design (January 11, 2025)
- **Created dedicated homepage** - separate from admin dashboard, serves as main user hub
- **Modern gradient design** - beautiful welcome section with call-to-action buttons
- **Dashboard statistics** - family members, videos created, stories available, voice quality metrics
- **Quick action cards** - easy access to create family members, record voices, create videos, listen to stories
- **Featured templates section** - showcases popular video templates with categories and age ranges
- **Recent activity feed** - displays user's recent actions and progress
- **Progress tracking** - visual progress bars for family setup completion
- **Admin dashboard access** - admin users can still access system dashboard when needed

### Production Deployment Configuration (July 2, 2025)
- **Fixed public URL deployment** with proper port mapping (5000 → 80)
- **Enhanced server logging** showing environment status and public URLs
- **Production static file serving** with proper caching headers
- **Development/production environment detection** for optimal performance
- **Deployment ready** configuration for fam-flix.com public URL

Changelog:
- June 15, 2025. Initial setup
- June 15, 2025. Voice alignment system implemented and tested
- June 16, 2025. Interactive Voice Testing system with recording and comparison capabilities
- June 18, 2025. Advanced voice processing pipeline and admin upload system with auto-diarization
- June 18, 2025. Complete ML system reset - clean slate for fresh implementation
- June 18, 2025. System successfully cleaned and running without ML dependencies
- July 2, 2025. Navigation system overhaul with mobile-first design and deployment fixes

## User Preferences

Preferred communication style: Simple, everyday language.