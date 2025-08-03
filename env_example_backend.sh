# backend/.env.example

# Database
DATABASE_URL="postgresql://postgres:[password]@db.[project-ref].supabase.co:5432/postgres"

# Supabase
SUPABASE_URL="https://[project-ref].supabase.co"
SUPABASE_ANON_KEY="your-supabase-anon-key"
SUPABASE_SERVICE_ROLE_KEY="your-supabase-service-role-key"

# Email Service (SendGrid)
SENDGRID_API_KEY="your-sendgrid-api-key"
SENDGRID_FROM_EMAIL="noreply@yourapp.com"

# Server
PORT=3001
NODE_ENV="development"

# Security
JWT_SECRET="your-super-secret-jwt-key-change-this-in-production"

# Frontend URL (for CORS and email links)
FRONTEND_URL="http://localhost:3000"