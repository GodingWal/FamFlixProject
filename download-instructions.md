# FamFlix Source Code Download Instructions

## What's Included
The `famflix-source.tar.gz` file contains:
- All source code (client/, server/, shared/)
- Configuration files (package.json, tsconfig.json, etc.)
- Documentation (README.md, replit.md)
- Essential config files

## What's Excluded (to reduce size)
- node_modules/ (reinstall with `npm install`)
- Generated videos and audio files
- Temporary processing files
- Git history

## To Recreate the Project Elsewhere

1. Extract the archive:
   ```bash
   tar -xzf famflix-source.tar.gz
   cd famflix/
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up environment variables:
   - Copy `.env.example` to `.env`
   - Add your API keys (OPENAI_API_KEY, ELEVENLABS_API_KEY)
   - Set up DATABASE_URL for PostgreSQL

4. Start development:
   ```bash
   npm run dev
   ```

## Alternative: Manual File Copy
If the archive doesn't work, you can copy these key directories:
- `/client/src/` - Frontend React code
- `/server/` - Backend Express code  
- `/shared/` - Shared TypeScript schemas
- Root config files (package.json, tsconfig.json, etc.)

## File Sizes
- Source code: ~2-5 MB
- Full project with node_modules: ~500+ MB
- With media files: 1+ GB