#!/bin/bash
# Pixel Buddy Development Helper Script
# Usage: ./scripts/dev.sh [command]

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Helper functions
print_header() {
    echo -e "${BLUE}"
    echo "╔═══════════════════════════════════════╗"
    echo "║      🐾 Pixel Buddy Dev Tools         ║"
    echo "╚═══════════════════════════════════════╝"
    echo -e "${NC}"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_info() {
    echo -e "${YELLOW}ℹ️  $1${NC}"
}

# Commands
cmd_up() {
    print_header
    print_info "Starting Pixel Buddy development environment..."

    # Create .env if it doesn't exist
    if [ ! -f .env ]; then
        print_info "Creating .env from template..."
        cp .env.example .env
        print_success ".env created"
    fi

    # Start services
    docker-compose up -d

    print_success "Services started!"
    echo ""
    print_info "Services:"
    echo "  🗄️  PostgreSQL:  localhost:5432"
    echo "  🌐 Web App:     http://localhost:3000"
    echo "  🔍 Health:      http://localhost:3000/health"
    echo ""
    print_info "View logs with: ./scripts/dev.sh logs"
    print_info "Stop with:      ./scripts/dev.sh down"
}

cmd_down() {
    print_info "Stopping Pixel Buddy..."
    docker-compose down
    print_success "All services stopped"
}

cmd_restart() {
    print_info "Restarting Pixel Buddy..."
    docker-compose restart
    print_success "Services restarted"
}

cmd_logs() {
    SERVICE=${1:-app}
    print_info "Showing logs for: $SERVICE (Ctrl+C to exit)"
    docker-compose logs -f "$SERVICE"
}

cmd_db_migrate() {
    print_info "Running database migrations..."
    docker-compose exec app npm run db:migrate
    print_success "Migrations complete!"
}

cmd_db_seed() {
    print_info "Seeding database with sample data..."
    docker-compose exec app npm run db:seed
    print_success "Database seeded!"
}

cmd_db_reset() {
    print_info "⚠️  Resetting database (THIS WILL DELETE ALL DATA)..."
    read -p "Are you sure? (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        docker-compose down -v
        docker-compose up -d db
        sleep 5
        docker-compose up -d app
        sleep 3
        docker-compose exec app npm run db:migrate
        print_success "Database reset complete!"
    else
        print_info "Cancelled"
    fi
}

cmd_db_psql() {
    print_info "Opening PostgreSQL shell..."
    docker-compose exec db psql -U postgres -d pixel_buddy
}

cmd_shell() {
    print_info "Opening app shell..."
    docker-compose exec app /bin/sh
}

cmd_test() {
    print_info "Running tests..."
    docker-compose exec app npm test
}

cmd_build() {
    print_info "Rebuilding containers..."
    docker-compose build --no-cache
    print_success "Build complete!"
}

cmd_clean() {
    print_info "⚠️  Cleaning up Docker resources..."
    read -p "This will remove containers, volumes, and images. Continue? (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        docker-compose down -v --rmi all
        print_success "Cleanup complete!"
    else
        print_info "Cancelled"
    fi
}

cmd_status() {
    print_header
    docker-compose ps
}

cmd_ollama_setup() {
    print_info "Setting up Ollama for AI features..."
    echo ""
    print_info "1. Uncomment ollama service in docker-compose.yml"
    print_info "2. Run: ./scripts/dev.sh up"
    print_info "3. Pull model: docker-compose exec ollama ollama pull llama3.2:1b"
    echo ""
    print_info "Or install Ollama locally: https://ollama.ai"
}

cmd_help() {
    print_header
    echo "Usage: ./scripts/dev.sh [command]"
    echo ""
    echo "Commands:"
    echo "  up              - Start all services"
    echo "  down            - Stop all services"
    echo "  restart         - Restart all services"
    echo "  logs [service]  - View logs (default: app)"
    echo "  status          - Show service status"
    echo ""
    echo "Database:"
    echo "  db:migrate      - Run database migrations"
    echo "  db:seed         - Seed sample data"
    echo "  db:reset        - Reset database (DESTRUCTIVE)"
    echo "  db:psql         - Open PostgreSQL shell"
    echo ""
    echo "Development:"
    echo "  shell           - Open app container shell"
    echo "  test            - Run tests"
    echo "  build           - Rebuild containers"
    echo "  clean           - Remove all Docker resources"
    echo ""
    echo "AI Setup:"
    echo "  ollama:setup    - Instructions for Ollama setup"
    echo ""
    echo "Examples:"
    echo "  ./scripts/dev.sh up              # Start development"
    echo "  ./scripts/dev.sh logs app        # View app logs"
    echo "  ./scripts/dev.sh db:migrate      # Run migrations"
    echo "  ./scripts/dev.sh db:psql         # Open database shell"
}

# Main command router
case "${1:-help}" in
    up)          cmd_up ;;
    down)        cmd_down ;;
    restart)     cmd_restart ;;
    logs)        cmd_logs "${2:-app}" ;;
    status)      cmd_status ;;
    db:migrate)  cmd_db_migrate ;;
    db:seed)     cmd_db_seed ;;
    db:reset)    cmd_db_reset ;;
    db:psql)     cmd_db_psql ;;
    shell)       cmd_shell ;;
    test)        cmd_test ;;
    build)       cmd_build ;;
    clean)       cmd_clean ;;
    ollama:setup) cmd_ollama_setup ;;
    help|--help|-h) cmd_help ;;
    *)
        print_error "Unknown command: $1"
        echo ""
        cmd_help
        exit 1
        ;;
esac
