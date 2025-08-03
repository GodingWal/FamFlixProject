# FamFlix Project

A comprehensive family video creation platform with AI-powered features.

## 🚀 Quick Start

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Start production server
npm start
```

## 🔧 Development

### Prerequisites
- Node.js 20+
- npm or yarn
- PostgreSQL (optional for development)
- Redis (optional for development)

### Environment Setup
Copy `.env.example` to `.env` and configure your environment variables:

```bash
cp .env.example .env
```

### Available Scripts
- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run check` - Run TypeScript type checking
- `npm run update-deps` - Update all dependencies (may include breaking changes)
- `npm run update-deps-conservative` - Update dependencies safely (patch/minor only)
- `npm run db:push` - Push database schema changes

## 🔄 CI/CD Pipeline

This project includes a comprehensive GitHub Actions CI/CD pipeline that runs on every push and pull request.

### Automated Features
- **Dependency Updates**: Weekly automated dependency checks and PR creation
- **Type Checking**: TypeScript validation on every commit
- **Build Testing**: Ensures the application builds successfully
- **Security Audits**: Vulnerability scanning with npm audit and Snyk
- **Database Migration Checks**: Validates Drizzle migrations
- **Integration Tests**: Runs tests against PostgreSQL and Redis
- **Performance Testing**: Basic performance and functionality checks
- **Deployment Previews**: Automated feedback on pull requests

### Manual Actions
You can manually trigger dependency updates:
1. Go to the "Actions" tab in GitHub
2. Select "CI/CD Pipeline"
3. Click "Run workflow"
4. Check "Update dependencies" and run

### Local Development
Use the provided scripts for local dependency management:

```bash
# Conservative update (recommended)
npm run update-deps-conservative

# Full update (may include breaking changes)
npm run update-deps
```

## 📁 Project Structure

```
├── client/                 # React frontend
│   ├── src/
│   │   ├── components/     # React components
│   │   ├── hooks/         # Custom React hooks
│   │   ├── pages/         # Page components
│   │   └── utils/         # Utility functions
├── server/                 # Express.js backend
│   ├── middleware/        # Express middleware
│   ├── routes/            # API routes
│   └── utils/             # Server utilities
├── shared/                 # Shared code between client/server
│   └── schema.ts          # Database schema definitions
├── scripts/               # Development and deployment scripts
├── docs/                  # Documentation
└── .github/workflows/     # GitHub Actions workflows
```

## 🛠️ Technology Stack

### Frontend
- React 18 with TypeScript
- Vite for build tooling
- Tailwind CSS for styling
- Radix UI for components
- React Hook Form for forms
- TanStack Query for data fetching

### Backend
- Express.js with TypeScript
- Drizzle ORM for database management
- PostgreSQL for database
- Redis for caching
- Socket.IO for real-time features
- JWT for authentication

### DevOps
- GitHub Actions for CI/CD
- Docker support (optional)
- PM2 for process management

## 🔒 Security

- JWT-based authentication
- Rate limiting
- Input validation with Zod
- Security headers with Helmet
- CORS configuration
- SQL injection protection with Drizzle ORM

## 📊 Monitoring

- Health check endpoints
- Performance monitoring
- Error tracking
- Request logging

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run tests and type checking
5. Submit a pull request

### Development Guidelines
- Follow TypeScript best practices
- Write meaningful commit messages
- Test your changes locally before pushing
- Update documentation as needed

## 📝 License

This project is licensed under the MIT License.

## 🆘 Support

For support and questions:
- Check the documentation in `/docs`
- Review the CI/CD pipeline logs
- Open an issue on GitHub
