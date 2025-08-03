#!/bin/bash
# setup.sh - ThePrintFarm Setup Script

echo "🖨️  ThePrintFarm Setup Script"
echo "=============================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ Node.js is not installed. Please install Node.js 18+ and try again.${NC}"
    exit 1
fi

# Check Node.js version
NODE_VERSION=$(node -v | cut -d'v' -f2)
REQUIRED_VERSION="18.0.0"

if [ "$(printf '%s\n' "$REQUIRED_VERSION" "$NODE_VERSION" | sort -V | head -n1)" != "$REQUIRED_VERSION" ]; then
    echo -e "${RED}❌ Node.js version 18+ is required. Current version: $NODE_VERSION${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Node.js version $NODE_VERSION detected${NC}"

# Create project structure
echo -e "${BLUE}📁 Creating project structure...${NC}"
mkdir -p theprintfarm/{backend/{src/{routes,middleware,services},prisma},frontend/src}

# Backend setup
echo -e "${BLUE}⚙️  Setting up backend...${NC}"
cd theprintfarm/backend

# Check if package.json exists
if [ ! -f "package.json" ]; then
    echo -e "${YELLOW}📦 Installing backend dependencies...${NC}"
    npm init -y
    npm install @prisma/client @supabase/supabase-js @sendgrid/mail express cors helmet morgan joi bcryptjs jsonwebtoken uuid cheerio axios dotenv
    npm install -D nodemon prisma
fi

# Copy environment file
if [ ! -f ".env" ]; then
    echo -e "${YELLOW}📄 Creating backend .env file...${NC}"
    cp ../.env.example .env || echo "Please create .env file manually using .env.example"
fi

# Generate Prisma client
echo -e "${BLUE}🗄️  Setting up database...${NC}"
npx prisma generate

# Frontend setup
echo -e "${BLUE}⚛️  Setting up frontend...${NC}"
cd ../frontend

# Check if package.json exists
if [ ! -f "package.json" ]; then
    echo -e "${YELLOW}📦 Installing frontend dependencies...${NC}"
    npm create vite@latest . -- --template react
    npm install @supabase/supabase-js react-router-dom react-query axios lucide-react react-hook-form react-hot-toast clsx date-fns react-intersection-observer @headlessui/react
    npm install -D @types/react @types/react-dom @vitejs/plugin-react autoprefixer postcss tailwindcss
fi

# Initialize Tailwind
if [ ! -f "tailwind.config.js" ]; then
    echo -e "${YELLOW}🎨 Setting up Tailwind CSS...${NC}"
    npx tailwindcss init -p
fi

# Copy environment file
if [ ! -f ".env" ]; then
    echo -e "${YELLOW}📄 Creating frontend .env file...${NC}"
    cp ../.env.example .env || echo "Please create .env file manually using .env.example"
fi

# Return to root
cd ..

echo -e "${GREEN}✅ Setup complete!${NC}"
echo ""
echo -e "${BLUE}📋 Next steps:${NC}"
echo "1. Set up your Supabase project and update the .env files"
echo "2. Set up SendGrid for email notifications"
echo "3. Update database connection in backend/.env"
echo "4. Run the database setup:"
echo "   cd backend && npx prisma db push && npx prisma db seed"
echo "5. Start the development servers:"
echo "   Backend: cd backend && npm run dev"
echo "   Frontend: cd frontend && npm run dev"
echo ""
echo -e "${YELLOW}🔧 Don't forget to:${NC}"
echo "- Replace the example environment variables with your actual values"
echo "- Set up your Supabase authentication settings"
echo "- Configure your SendGrid account for email notifications"
echo "- Update CORS settings for production deployment"
echo ""
echo -e "${GREEN}🎉 Happy printing!${NC}"