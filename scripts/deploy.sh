#!/bin/bash
# ============================================================================
# Adocavo Deployment Script
# ============================================================================
# Production-grade deployment with:
# - Pre-deployment validation and testing
# - Automated backups
# - Health checks
# - Rollback capabilities
# - Deployment logging
#
# Usage:
#   ./scripts/deploy.sh [environment] [options]
#
# Environments:
#   production (default) - Deploy to production
#   preview              - Deploy to preview environment
#   development          - Deploy to development environment
#
# Options:
#   --skip-tests         Skip pre-deployment tests
#   --skip-backup        Skip database backup
#   --no-monitor         Skip post-deployment monitoring
#   --verbose            Enable verbose output
#   --dry-run           Simulate deployment without actual changes
#
# Examples:
#   ./scripts/deploy.sh production
#   ./scripts/deploy.sh preview --skip-tests
#   ./scripts/deploy.sh production --verbose --no-monitor
# ============================================================================

set -e
set -o pipefail

# ============================================================================
# Configuration
# ============================================================================

# Color output
readonly RED='\033[0;31m'
readonly GREEN='\033[0;32m'
readonly YELLOW='\033[1;33m'
readonly BLUE='\033[0;34m'
readonly PURPLE='\033[0;35m'
readonly CYAN='\033[0;36m'
readonly NC='\033[0m' # No Color

# Script directory
readonly SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
readonly PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

# Deployment log directory
readonly LOG_DIR="$PROJECT_ROOT/logs/deployments"
mkdir -p "$LOG_DIR"

# Deployment state file
readonly STATE_FILE="$LOG_DIR/.deployment_state"

# Deployment metadata
DEPLOYMENT_ID=""
START_TIME=""
ENVIRONMENT="production"
SKIP_TESTS=false
SKIP_BACKUP=false
NO_MONITOR=false
VERBOSE=false
DRY_RUN=false

# Health check configuration
HEALTH_CHECK_RETRIES=15
HEALTH_CHECK_INTERVAL=15
HEALTH_CHECK_TIMEOUT=30

# ============================================================================
# Logging Functions
# ============================================================================

log() {
    local level=$1
    shift
    local message="$*"
    local timestamp=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

    echo -e "${timestamp} [${level}] ${message}" | tee -a "$LOG_DIR/deployment-${DEPLOYMENT_ID}.log"

    # Also write to state file for tracking
    if [ -f "$STATE_FILE" ]; then
        echo "{\"timestamp\":\"${timestamp}\",\"level\":\"${level}\",\"message\":\"${message}\"}" >> "$STATE_FILE"
    fi
}

log_info() {
    echo -e "${BLUE}[INFO]${NC} $*" | tee -a "$LOG_DIR/deployment-${DEPLOYMENT_ID}.log"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $*" | tee -a "$LOG_DIR/deployment-${DEPLOYMENT_ID}.log"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $*" | tee -a "$LOG_DIR/deployment-${DEPLOYMENT_ID}.log"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $*" | tee -a "$LOG_DIR/deployment-${DEPLOYMENT_ID}.log"
}

log_step() {
    echo ""
    echo -e "${PURPLE}=== $* ===${NC}"
    echo "============================================" | tee -a "$LOG_DIR/deployment-${DEPLOYMENT_ID}.log"
}

log_debug() {
    if [ "$VERBOSE" = true ]; then
        echo -e "${CYAN}[DEBUG]${NC} $*" | tee -a "$LOG_DIR/deployment-${DEPLOYMENT_ID}.log"
    fi
}

# ============================================================================
# Utility Functions
# ============================================================================

# Print usage information
usage() {
    cat << EOF
Usage: $0 [environment] [options]

Environments:
  production (default)  Deploy to production
  preview               Deploy to preview environment
  development           Deploy to development environment

Options:
  --skip-tests          Skip pre-deployment tests
  --skip-backup         Skip database backup
  --no-monitor          Skip post-deployment monitoring
  --verbose             Enable verbose output
  --dry-run             Simulate deployment without actual changes
  -h, --help            Show this help message

Examples:
  $0 production
  $0 preview --skip-tests
  $0 production --verbose --no-monitor

EOF
    exit 0
}

# Parse command line arguments
parse_arguments() {
    ENVIRONMENT=${1:-production}
    shift

    while [[ $# -gt 0 ]]; do
        case $1 in
            --skip-tests)
                SKIP_TESTS=true
                shift
                ;;
            --skip-backup)
                SKIP_BACKUP=true
                shift
                ;;
            --no-monitor)
                NO_MONITOR=true
                shift
                ;;
            --verbose)
                VERBOSE=true
                shift
                ;;
            --dry-run)
                DRY_RUN=true
                shift
                ;;
            -h|--help)
                usage
                ;;
            production|preview|development)
                ENVIRONMENT=$1
                shift
                ;;
            *)
                log_error "Unknown option: $1"
                usage
                ;;
        esac
    done

    # Validate environment
    if [[ ! "$ENVIRONMENT" =~ ^(production|preview|development)$ ]]; then
        log_error "Invalid environment: $ENVIRONMENT"
        usage
    fi
}

# Initialize deployment
initialize_deployment() {
    START_TIME=$(date +%s)
    DEPLOYMENT_ID="${ENVIRONMENT}-$(date +%Y%m%d-%H%M%S)"

    # Create deployment-specific log file
    touch "$LOG_DIR/deployment-${DEPLOYMENT_ID}.log"

    # Initialize state file
    echo "[]" > "$STATE_FILE"

    log_step "Deployment Initialization"
    log_info "Deployment ID: $DEPLOYMENT_ID"
    log_info "Environment: $ENVIRONMENT"
    log_info "Project Root: $PROJECT_ROOT"
    log_info "Start Time: $(date -u -d @$START_TIME +"%Y-%m-%dT%H:%M:%SZ" 2>/dev/null || date -u -r $START_TIME +"%Y-%m-%dT%H:%M:%SZ")"

    if [ "$DRY_RUN" = true ]; then
        log_warning "DRY RUN MODE - No actual changes will be made"
    fi

    # Print configuration
    log_debug "Configuration:"
    log_debug "  SKIP_TESTS=$SKIP_TESTS"
    log_debug "  SKIP_BACKUP=$SKIP_BACKUP"
    log_debug "  NO_MONITOR=$NO_MONITOR"
    log_debug "  VERBOSE=$VERBOSE"
    log_debug "  DRY_RUN=$DRY_RUN"
}

# Execute command with logging
run_command() {
    local cmd="$*"
    log_debug "Executing: $cmd"

    if [ "$DRY_RUN" = true ]; then
        log_info "[DRY RUN] Would execute: $cmd"
        return 0
    fi

    if [ "$VERBOSE" = true ]; then
        eval "$cmd" 2>&1 | tee -a "$LOG_DIR/deployment-${DEPLOYMENT_ID}.log"
        return ${PIPESTATUS[0]}
    else
        eval "$cmd" >> "$LOG_DIR/deployment-${DEPLOYMENT_ID}.log" 2>&1
        return $?
    fi
}

# Get environment-specific configuration
get_config() {
    case "$ENVIRONMENT" in
        production)
            echo "WORKER_NAME=adocavo-net"
            echo "DB_NAME=adocavo-db"
            echo "BASE_URL=https://adocavo.net"
            echo "HEALTH_URL=https://adocavo.net/api/health"
            ;;
        preview)
            echo "WORKER_NAME=adocavo-preview"
            echo "DB_NAME=adocavo-db-preview"
            echo "BASE_URL=https://preview.adocavo.net"
            echo "HEALTH_URL=https://preview.adocavo.net/api/health"
            ;;
        development)
            echo "WORKER_NAME=adocavo-dev"
            echo "DB_NAME=adocavo-db-dev"
            echo "BASE_URL=https://dev.adocavo.net"
            echo "HEALTH_URL=https://dev.adocavo.net/api/health"
            ;;
    esac
}

# ============================================================================
# Pre-deployment Checks
# ============================================================================

# Check prerequisites
check_prerequisites() {
    log_step "Checking Prerequisites"

    # Check Node.js
    if ! command -v node &> /dev/null; then
        log_error "Node.js is not installed"
        exit 1
    fi
    NODE_VERSION=$(node --version)
    log_success "Node.js: $NODE_VERSION"

    # Check npm
    if ! command -v npm &> /dev/null; then
        log_error "npm is not installed"
        exit 1
    fi
    NPM_VERSION=$(npm --version)
    log_success "npm: $NPM_VERSION"

    # Check Wrangler
    if ! npx wrangler --version &> /dev/null; then
        log_error "Wrangler CLI is not available"
        exit 1
    fi
    WRANGLER_VERSION=$(npx wrangler --version 2>&1 | head -1 || echo "unknown")
    log_success "Wrangler: $WRANGLER_VERSION"

    # Check git status (only for production)
    if [ "$ENVIRONMENT" = "production" ]; then
        if ! git rev-parse --git-dir > /dev/null 2>&1; then
            log_warning "Not in a git repository"
        else
            CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD)
            log_info "Current branch: $CURRENT_BRANCH"

            if [ "$CURRENT_BRANCH" != "main" ] && [ "$DRY_RUN" != true ]; then
                log_warning "Not on main branch (current: $CURRENT_BRANCH)"
                read -p "Continue anyway? (yes/no): " CONFIRM
                if [ "$CONFIRM" != "yes" ]; then
                    log_info "Deployment cancelled"
                    exit 0
                fi
            fi

            # Check for uncommitted changes
            if [ -n "$(git status --porcelain)" ]; then
                log_warning "Uncommitted changes detected"
                git status --short
                if [ "$DRY_RUN" != true ]; then
                    read -p "Continue anyway? (yes/no): " CONFIRM
                    if [ "$CONFIRM" != "yes" ]; then
                        log_info "Deployment cancelled"
                        exit 0
                    fi
                fi
            fi
        fi
    fi

    # Verify environment variables
    if [ ! -f "$PROJECT_ROOT/.env.local" ] && [ ! -f "$PROJECT_ROOT/.env" ]; then
        log_warning "No .env file found"
    fi

    log_success "Prerequisites check passed"
}

# Validate environment configuration
validate_environment() {
    log_step "Validating Environment Configuration"

    # Run the validate-env script
    if [ -f "$SCRIPT_DIR/validate-env.sh" ]; then
        chmod +x "$SCRIPT_DIR/validate-env.sh"
        if ! run_command "cd \"$PROJECT_ROOT\" && bash \"$SCRIPT_DIR/validate-env.sh\" $ENVIRONMENT"; then
            log_error "Environment validation failed"
            exit 1
        fi
    else
        log_warning "validate-env.sh not found, skipping"
    fi

    log_success "Environment validation passed"
}

# ============================================================================
# Pre-deployment Tests
# ============================================================================

# Run pre-deployment tests
run_tests() {
    if [ "$SKIP_TESTS" = true ]; then
        log_warning "Skipping tests (--skip-tests flag)"
        return 0
    fi

    log_step "Running Pre-deployment Tests"

    # Type check
    log_info "Running TypeScript type check..."
    if ! run_command "cd \"$PROJECT_ROOT\" && npm run typecheck"; then
        log_error "TypeScript type check failed"
        exit 1
    fi
    log_success "TypeScript type check passed"

    # Lint
    log_info "Running linter..."
    if ! run_command "cd \"$PROJECT_ROOT\" && npm run lint"; then
        log_error "Linting failed"
        exit 1
    fi
    log_success "Linting passed"

    # Unit tests
    log_info "Running unit tests..."
    if ! run_command "cd \"$PROJECT_ROOT\" && npm run test:unit"; then
        log_error "Unit tests failed"
        exit 1
    fi
    log_success "Unit tests passed"

    log_success "All pre-deployment tests passed"
}

# ============================================================================
# Build Process
# ============================================================================

# Clean build artifacts
clean_build() {
    log_step "Cleaning Build Artifacts"

    log_info "Removing .next directory..."
    rm -rf "$PROJECT_ROOT/.next"

    log_info "Removing .open-next directory..."
    rm -rf "$PROJECT_ROOT/.open-next"

    log_success "Build artifacts cleaned"
}

# Build the application
build_application() {
    log_step "Building Application"

    log_info "Running Next.js build..."
    if ! run_command "cd \"$PROJECT_ROOT\" && npm run build"; then
        log_error "Build failed"
        exit 1
    fi
    log_success "Next.js build completed"

    log_info "Running OpenNext build..."
    if ! run_command "cd \"$PROJECT_ROOT\" && npm run build:open-next"; then
        log_error "OpenNext build failed"
        exit 1
    fi
    log_success "OpenNext build completed"

    # Check build size
    BUILD_SIZE=$(du -sh "$PROJECT_ROOT/.open-next" | cut -f1)
    log_info "Build size: $BUILD_SIZE"

    BUILD_SIZE_BYTES=$(du -s "$PROJECT_ROOT/.open-next" | cut -f1)
    MAX_SIZE=$((50 * 1024 * 1024)) # 50MB

    if [ "$BUILD_SIZE_BYTES" -gt "$MAX_SIZE" ]; then
        log_error "Build size exceeds 50MB limit"
        exit 1
    fi

    log_success "Application built successfully"
}

# ============================================================================
# Database Operations
# ============================================================================

# Backup database
backup_database() {
    if [ "$SKIP_BACKUP" = true ]; then
        log_warning "Skipping database backup (--skip-backup flag)"
        return 0
    fi

    log_step "Backing Up Database"

    eval "$(get_config)"
    DB_NAME=$(echo "$CONFIG" | grep DB_NAME | cut -d'=' -f2)

    TIMESTAMP=$(date +%Y%m%d_%H%M%S)
    BACKUP_FILE="$LOG_DIR/backup-${DB_NAME}-${TIMESTAMP}.sql"

    log_info "Creating backup: $BACKUP_FILE"

    if [ "$DRY_RUN" = true ]; then
        log_info "[DRY RUN] Would backup database: $DB_NAME"
    else
        # Try to export database
        if npx wrangler d1 export "$DB_NAME" --remote --output="$BACKUP_FILE" 2>&1 | tee -a "$LOG_DIR/deployment-${DEPLOYMENT_ID}.log"; then
            log_success "Database backup created: $BACKUP_FILE"
        else
            log_warning "Database backup failed, continuing anyway"
        fi
    fi
}

# Run database migrations
run_migrations() {
    log_step "Running Database Migrations"

    eval "$(get_config)"
    DB_NAME=$(echo "$CONFIG" | grep DB_NAME | cut -d'=' -f2)

    log_info "Database: $DB_NAME"

    if [ "$DRY_RUN" = true ]; then
        log_info "[DRY RUN] Would run migrations for: $DB_NAME"
        return 0
    fi

    log_info "Applying migrations..."
    if ! run_command "npx wrangler d1 migrations apply \"$DB_NAME\" --remote"; then
        log_error "Migration failed"
        return 1
    fi

    log_success "Migrations applied successfully"
}

# Verify migrations
verify_migrations() {
    log_step "Verifying Migrations"

    eval "$(get_config)"
    DB_NAME=$(echo "$CONFIG" | grep DB_NAME | cut -d'=' -f2)

    if [ "$DRY_RUN" = true ]; then
        log_info "[DRY RUN] Would verify migrations for: $DB_NAME"
        return 0
    fi

    log_info "Checking migration table..."
    RESULT=$(npx wrangler d1 execute "$DB_NAME" --remote --command "SELECT COUNT(*) as count FROM __drizzle_migrations;" --json 2>/dev/null || echo "")

    if [ -n "$RESULT" ]; then
        MIGRATION_COUNT=$(echo "$RESULT" | jq -r '.[0].results[0].count // 0' 2>/dev/null || echo "unknown")
        log_success "Migrations verified: $MIGRATION_COUNT migrations applied"
    else
        log_warning "Could not verify migrations"
    fi
}

# ============================================================================
# Deployment
# ============================================================================

# Deploy to Cloudflare
deploy_to_cloudflare() {
    log_step "Deploying to Cloudflare Workers"

    if [ "$DRY_RUN" = true ]; then
        log_info "[DRY RUN] Would deploy to Cloudflare Workers"
        return 0
    fi

    # Check if we need to use environment-specific deployment
    if [ "$ENVIRONMENT" != "production" ]; then
        log_info "Deploying to $ENVIRONMENT environment..."
        if ! run_command "cd \"$PROJECT_ROOT\" && npm run deploy:preview"; then
            log_error "Deployment failed"
            return 1
        fi
    else
        log_info "Deploying to production..."
        if ! run_command "cd \"$PROJECT_ROOT\" && npm run deploy"; then
            log_error "Deployment failed"
            return 1
        fi
    fi

    log_success "Deployment completed successfully"
}

# ============================================================================
# Health Checks
# ============================================================================

# Wait for deployment to propagate
wait_for_propagation() {
    log_step "Waiting for Deployment Propagation"

    local wait_time=45
    if [ "$ENVIRONMENT" = "preview" ]; then
        wait_time=30
    fi

    log_info "Waiting ${wait_time}s for Cloudflare edge propagation..."
    sleep $wait_time
    log_success "Propagation wait complete"
}

# Health check endpoint
health_check() {
    log_step "Health Check"

    eval "$(get_config)"
    HEALTH_URL=$(echo "$CONFIG" | grep HEALTH_URL | cut -d'=' -f2)

    log_info "Checking health at: $HEALTH_URL"
    log_info "Max attempts: $HEALTH_CHECK_RETRIES"
    log_info "Retry interval: ${HEALTH_CHECK_INTERVAL}s"

    local attempt=0
    local last_status=""

    while [ $attempt -lt $HEALTH_CHECK_RETRIES ]; do
        attempt=$((attempt + 1))

        # Measure response time
        local start=$(date +%s%3N)
        local response=$(curl -s -o /dev/null -w "%{http_code}" "$HEALTH_URL" 2>/dev/null || echo "000")
        local end=$(date +%s%3N)
        local latency=$((end - start))

        if [ "$response" = "200" ]; then
            # Get full health response
            local health_data=$(curl -s "$HEALTH_URL" 2>/dev/null || echo "{}")

            log_success "Health check passed (attempt $attempt/${HEALTH_CHECK_RETRIES})"
            log_info "Response time: ${latency}ms"

            # Parse and display health data
            if command -v jq &> /dev/null; then
                echo "$health_data" | jq . 2>/dev/null || echo "$health_data"
            else
                echo "$health_data"
            fi

            return 0
        fi

        last_status=$response
        log_warning "Attempt $attempt/${HEALTH_CHECK_RETRIES}: HTTP $response (${latency}ms)"

        if [ $attempt -lt $HEALTH_CHECK_RETRIES ]; then
            sleep $HEALTH_CHECK_INTERVAL
        fi
    done

    log_error "Health check failed after $HEALTH_CHECK_RETRIES attempts"
    log_error "Last status: HTTP $last_status"
    return 1
}

# Smoke tests
smoke_tests() {
    log_step "Running Smoke Tests"

    eval "$(get_config)"
    BASE_URL=$(echo "$CONFIG" | grep BASE_URL | cut -d'=' -f2)

    local endpoints=(
        "$BASE_URL"
        "$BASE_URL/api/health"
        "$BASE_URL/api/hooks"
    )

    for endpoint in "${endpoints[@]}"; do
        log_info "Testing: $endpoint"
        local status=$(curl -s -o /dev/null -w "%{http_code}" "$endpoint" 2>/dev/null || echo "000")

        if [ "$status" != "000" ] && [ "$status" -lt 500 ]; then
            log_success "  OK: HTTP $status"
        else
            log_error "  FAILED: HTTP $status"
            return 1
        fi
    done

    log_success "All smoke tests passed"
}

# ============================================================================
# Post-deployment
# ============================================================================

# Monitor deployment
monitor_deployment() {
    if [ "$NO_MONITOR" = true ]; then
        log_warning "Skipping post-deployment monitoring (--no-monitor flag)"
        return 0
    fi

    log_step "Post-deployment Monitoring"

    # Run the monitoring script
    if [ -f "$SCRIPT_DIR/monitor-deployment.sh" ]; then
        chmod +x "$SCRIPT_DIR/monitor-deployment.sh"
        run_command "cd \"$PROJECT_ROOT\" && bash \"$SCRIPT_DIR/monitor-deployment.sh\" $ENVIRONMENT 2"
    else
        log_warning "monitor-deployment.sh not found, skipping monitoring"
    fi
}

# Send notification
send_notification() {
    local status=$1
    local message=$2

    # Run the notification script
    if [ -f "$SCRIPT_DIR/notify-deployment.sh" ]; then
        chmod +x "$SCRIPT_DIR/notify-deployment.sh"
        run_command "cd \"$PROJECT_ROOT\" && bash \"$SCRIPT_DIR/notify-deployment.sh\" $status $ENVIRONMENT\"\$${WEBHOOK_URL:-}\""
    fi
}

# Generate deployment report
generate_report() {
    local status=$1
    local exit_code=$2

    END_TIME=$(date +%s)
    DURATION=$((END_TIME - START_TIME))

    local report_file="$LOG_DIR/report-${DEPLOYMENT_ID}.txt"

    cat > "$report_file" << EOF
==============================================================================
Adocavo Deployment Report
==============================================================================

Deployment ID:    $DEPLOYMENT_ID
Environment:      $ENVIRONMENT
Status:           $status
Start Time:       $(date -u -d @$START_TIME +"%Y-%m-%dT%H:%M:%SZ" 2>/dev/null || date -u -r $START_TIME +"%Y-%m-%dT%H:%M:%SZ")
End Time:         $(date -u -d @$END_TIME +"%Y-%m-%dT%H:%M:%SZ" 2>/dev/null || date -u -r $END_TIME +"%Y-%m-%dT%H:%M:%SZ")
Duration:         ${DURATION}s

Configuration:
  Skip Tests:      $SKIP_TESTS
  Skip Backup:     $SKIP_BACKUP
  No Monitor:      $NO_MONITOR
  Verbose:         $VERBOSE
  Dry Run:         $DRY_RUN

Git Information:
EOF

    if command -v git &> /dev/null; then
        {
            echo "  Branch:          $(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo 'unknown')"
            echo "  Commit:          $(git rev-parse --short HEAD 2>/dev/null || echo 'unknown')"
            echo "  Commit Message:  $(git log -1 --pretty=format:%s 2>/dev/null || echo 'unknown')"
            echo "  Author:          $(git log -1 --pretty=format:%an 2>/dev/null || echo 'unknown')"
        } >> "$report_file"
    fi

    cat >> "$report_file" << EOF

Environment URLs:
EOF

    eval "$(get_config)"
    echo "  Base URL:        $(echo "$CONFIG" | grep BASE_URL | cut -d'=' -f2)" >> "$report_file"
    echo "  Health URL:      $(echo "$CONFIG" | grep HEALTH_URL | cut -d'=' -f2)" >> "$report_file"

    cat >> "$report_file" << EOF

Next Steps:
  1. Verify site functionality manually
  2. Check analytics for errors
  3. Monitor logs: npx wrangler tail --name=$(echo "$CONFIG" | grep WORKER_NAME | cut -d'=' -f2)
  4. Update team/stakeholders if needed

Rollback Command:
  ./scripts/rollback.sh $ENVIRONMENT

Log Files:
  Deployment:  $LOG_DIR/deployment-${DEPLOYMENT_ID}.log
  Report:      $report_file

==============================================================================
Generated: $(date -u +"%Y-%m-%dT%H:%M:%SZ")
==============================================================================
EOF

    cat "$report_file"
}

# ============================================================================
# Rollback on Failure
# ============================================================================

rollback_on_failure() {
    log_error "Deployment failed, initiating rollback..."

    if [ "$DRY_RUN" = true ]; then
        log_info "[DRY RUN] Would rollback deployment"
        return 0
    fi

    # Run the rollback script
    if [ -f "$SCRIPT_DIR/rollback.sh" ]; then
        chmod +x "$SCRIPT_DIR/rollback.sh"
        run_command "cd \"$PROJECT_ROOT\" && bash \"$SCRIPT_DIR/rollback.sh\" $ENVIRONMENT"
    else
        log_error "rollback.sh not found, manual rollback required"
    fi

    log_warning "Rollback completed. Please verify system status."
}

# ============================================================================
# Main Deployment Flow
# ============================================================================

main() {
    parse_arguments "$@"
    initialize_deployment

    log_info "Starting deployment process..."

    # Pre-deployment checks
    check_prerequisites
    validate_environment
    run_tests

    # Build
    clean_build
    build_application

    # Database operations
    backup_database
    if ! run_migrations; then
        generate_report "FAILED" 1
        if [ "$ENVIRONMENT" = "production" ]; then
            rollback_on_failure
        fi
        send_notification "failure" "Deployment failed during migration"
        exit 1
    fi
    verify_migrations

    # Deploy
    if ! deploy_to_cloudflare; then
        generate_report "FAILED" 1
        if [ "$ENVIRONMENT" = "production" ]; then
            rollback_on_failure
        fi
        send_notification "failure" "Deployment failed during deploy"
        exit 1
    fi

    # Post-deployment verification
    wait_for_propagation
    if ! health_check; then
        generate_report "FAILED" 1
        if [ "$ENVIRONMENT" = "production" ]; then
            rollback_on_failure
        fi
        send_notification "failure" "Deployment failed health check"
        exit 1
    fi

    if ! smoke_tests; then
        log_warning "Smoke tests failed, but deployment succeeded"
    fi

    # Post-deployment monitoring
    monitor_deployment

    # Success
    generate_report "SUCCESS" 0
    send_notification "success" "Deployment completed successfully"

    log_success "Deployment completed successfully!"
    log_info "Total duration: $(($(date +%s) - START_TIME))s"
}

# Error handler
trap 'log_error "Command failed at line $LINENO"; exit 1' ERR

# Run main function
main "$@"
