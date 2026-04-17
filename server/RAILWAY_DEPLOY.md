# Railway Deployment for Backend

## Quick Deploy Steps:

1. **Connect to Railway:**
   ```bash
   cd server
   railway login
   railway link
   ```

2. **Set Environment Variables:**
   ```bash
   railway variables set NODE_ENV=production
   railway variables set PORT=8080
   railway variables set MONGODB_URI=your_mongodb_connection_string
   railway variables set JWT_SECRET=your_jwt_secret
   # Add other env vars from your .env file
   ```

3. **Deploy:**
   ```bash
   railway up
   ```

4. **Get the URL:**
   ```bash
   railway domain
   ```

## Update Frontend Config:

Once deployed, update your `client/.env.production`:

```env
VITE_API_URL=https://your-railway-app.railway.app
```