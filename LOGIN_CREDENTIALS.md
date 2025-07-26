# FamFlix Development Login Credentials

## 🔐 Default Admin Account

When running in development mode without a database, the following default admin account is available:

### Login Details:
- **Username**: `admin`
- **Password**: `password`
- **Email**: `admin@famflix.com`
- **Role**: `admin`
- **Subscription**: `premium`

### Login Endpoints:

1. **Session-based Login** (for web interface):
   ```
   POST /api/login
   Content-Type: application/json
   
   {
     "username": "admin",
     "password": "password"
   }
   ```

2. **JWT-based Login** (for API access):
   ```
   POST /api/login-jwt
   Content-Type: application/json
   
   {
     "username": "admin",
     "password": "password"
   }
   ```

### Authentication Headers:

For API requests that require authentication, use the JWT token:
```
Authorization: Bearer <your-jwt-token>
```

### Testing Authentication:

```bash
# Test login
curl -X POST http://localhost:5000/api/login-jwt \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"password"}'

# Test authenticated endpoint
curl -X GET http://localhost:5000/api/me \
  -H "Authorization: Bearer <your-jwt-token>"
```

## 🚀 Quick Start

1. Start the server: `npm run dev`
2. Open: http://localhost:5000
3. Login with the admin credentials above
4. Enjoy exploring FamFlix! 🎉

## 📝 Notes

- This default account only exists in development mode without a database
- For production, you'll need to set up a proper database and create real user accounts
- The password is hashed using bcrypt with salt rounds of 10 