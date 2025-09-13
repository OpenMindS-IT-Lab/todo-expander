#!/usr/bin/env bash

# todo-expander: Codex Container Maintenance Script
# Runs in containers resumed from cache, after checking out the branch
# Network access is always enabled for this step

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
WHITE='\033[1;37m'
NC='\033[0m' # No Color

# Logging functions
log() {
    echo -e "${WHITE}[$(date +'%H:%M:%S')] $1${NC}"
}

log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

log_header() {
    echo -e "\n${PURPLE}=== $1 ===${NC}\n"
}

# Check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Check and update Deno if needed
check_deno() {
    log_header "Checking Deno Installation"
    
    if command_exists deno; then
        local deno_version
        deno_version=$(deno --version | head -n1 | cut -d' ' -f2)
        log_info "Deno found: $deno_version"
        
        # Check if version is adequate (1.30.0+)
        if [[ "$deno_version" =~ ^1\.([3-9][0-9]|[4-9][0-9]) ]] || [[ "$deno_version" =~ ^[2-9]\. ]]; then
            log_success "Deno version is sufficient"
        else
            log_warn "Deno version $deno_version may be too old (need 1.30.0+)"
            log_info "Consider updating with: ./run/setup.sh"
        fi
        
        # Ensure Deno is in PATH
        if ! echo "$PATH" | grep -q ".deno/bin"; then
            log_info "Adding Deno to PATH for this session"
            export PATH="$HOME/.deno/bin:$PATH"
        fi
    else
        log_error "Deno not found! Run ./run/setup.sh to install"
        return 1
    fi
}

# Validate project structure
validate_project_structure() {
    log_header "Validating Project Structure"
    
    # Ensure we're in the project root
    if [ ! -f "deno.json" ]; then
        log_error "Not in todo-expander project root (deno.json not found)"
        return 1
    fi
    
    log_info "Project root: $(pwd)"
    
    # Check essential files
    local essential_files=("deno.json" "bin/todo-expand.ts" "src/config.ts" "src/process.ts" "src/todos.ts" "README.md")
    local missing_files=()
    local found_files=()
    
    for file in "${essential_files[@]}"; do
        if [ -f "$file" ]; then
            found_files+=("$file")
        else
            missing_files+=("$file")
        fi
    done
    
    log_success "Found ${#found_files[@]}/${#essential_files[@]} essential files"
    
    if [ ${#missing_files[@]} -gt 0 ]; then
        log_error "Missing files: ${missing_files[*]}"
        return 1
    fi
    
    # Ensure necessary directories exist
    local dirs=("dist" "logs" "cache")
    for dir in "${dirs[@]}"; do
        if [ ! -d "$dir" ]; then
            mkdir -p "$dir"
            log_info "Created missing directory: $dir"
        fi
    done
}

# Check git repository state
check_git_status() {
    log_header "Checking Git Repository"
    
    if ! git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
        log_warn "Not in a git repository"
        return 0
    fi
    
    log_info "Git repository detected"
    
    # Show current branch and status
    local current_branch
    current_branch=$(git branch --show-current 2>/dev/null || echo 'unknown')
    log_info "Current branch: $current_branch"
    
    # Check if there are any uncommitted changes
    if git diff --quiet && git diff --cached --quiet; then
        log_success "Working directory is clean"
    else
        log_info "Working directory has changes (normal for development)"
    fi
    
    # Ensure git hooks are configured if they exist
    if [ -d ".githooks" ] && [ -f ".githooks/pre-commit" ]; then
        local hooks_path
        hooks_path=$(git config core.hooksPath || echo "")
        if [ "$hooks_path" = ".githooks" ]; then
            log_success "Git hooks are properly configured"
        else
            log_info "Reconfiguring git hooks..."
            git config core.hooksPath .githooks
            log_success "Git hooks reconfigured"
        fi
    fi
}

# Validate and potentially rebuild CLI
check_cli_binary() {
    log_header "Checking CLI Binary"
    
    if [ -f "dist/todo-expand" ]; then
        local binary_age
        local source_age
        
        # Check if binary exists and get its age
        binary_age=$(stat -c %Y "dist/todo-expand" 2>/dev/null || stat -f %m "dist/todo-expand" 2>/dev/null || echo "0")
        
        # Check age of main source file
        if [ -f "bin/todo-expand.ts" ]; then
            source_age=$(stat -c %Y "bin/todo-expand.ts" 2>/dev/null || stat -f %m "bin/todo-expand.ts" 2>/dev/null || echo "0")
        else
            source_age="999999999999"  # Force rebuild if source missing
        fi
        
        local binary_size
        binary_size=$(du -h "dist/todo-expand" | cut -f1)
        log_info "Binary found (size: $binary_size)"
        
        # Check if binary is older than source (simple check)
        if [ "$binary_age" -lt "$source_age" ]; then
            log_info "Binary appears older than source, rebuilding..."
            rebuild_cli
        else
            log_success "Binary appears up-to-date"
            
            # Quick functionality test
            if ./dist/todo-expand --help >/dev/null 2>&1; then
                log_success "Binary functionality verified"
            else
                log_warn "Binary test failed, rebuilding..."
                rebuild_cli
            fi
        fi
    else
        log_info "No binary found, building..."
        rebuild_cli
    fi
}

# Rebuild the CLI binary
rebuild_cli() {
    if ! command_exists deno; then
        log_error "Deno required for building CLI"
        return 1
    fi
    
    log_info "Building CLI binary..."
    
    # Use deno task if available, otherwise direct command
    if deno task --quiet 2>/dev/null | grep -q "build:cli"; then
        deno task build:cli
    else
        deno compile -A --output dist/todo-expand bin/todo-expand.ts
    fi
    
    if [ -f "dist/todo-expand" ]; then
        local binary_size
        binary_size=$(du -h "dist/todo-expand" | cut -f1)
        log_success "CLI rebuilt successfully (size: $binary_size)"
    else
        log_error "CLI build failed"
        return 1
    fi
}

# Test basic functionality
test_functionality() {
    log_header "Testing Functionality"
    
    if ! command_exists deno; then
        log_error "Deno not available for testing"
        return 1
    fi
    
    # Test deno.json validity
    log_info "Testing deno.json..."
    if deno task --quiet 2>/dev/null | grep -q "Available tasks"; then
        log_success "deno.json is valid"
        
        # Show available tasks (limited)
        local task_count
        task_count=$(deno task --quiet 2>/dev/null | grep -E "^  " | wc -l)
        log_info "Available tasks: $task_count"
    else
        log_warn "deno.json validation failed"
    fi
    
    # Test CLI help (quick test)
    log_info "Testing CLI help..."
    if timeout 5 deno run -A bin/todo-expand.ts --help >/dev/null 2>&1; then
        log_success "CLI help works"
    else
        log_warn "CLI help test failed"
    fi
    
    # Test configuration loading
    log_info "Testing configuration..."
    if timeout 5 deno run -A bin/todo-expand.ts --print-config >/dev/null 2>&1; then
        log_success "Configuration loading works"
    else
        log_info "Configuration test failed (may need API key)"
    fi
}

# Check environment and dependencies
check_environment() {
    log_header "Checking Environment"
    
    # Check for OpenAI API key
    if [ -n "${OPENAI_API_KEY:-}" ]; then
        log_success "OPENAI_API_KEY is set"
        
        # Basic API key format validation
        if [[ "$OPENAI_API_KEY" =~ ^sk-[a-zA-Z0-9]{32,}$ ]]; then
            log_success "API key format appears valid"
        else
            log_warn "API key format may be invalid (expected: sk-...)"
        fi
    else
        log_info "OPENAI_API_KEY not set (normal for container setup)"
        log_info "Set it when ready to use: export OPENAI_API_KEY='your-key'"
    fi
    
    # Check other relevant environment variables
    local env_vars=("OPENAI_MODEL" "TODO_EXPAND_STYLE" "TODO_EXPAND_DRY")
    for var in "${env_vars[@]}"; do
        if [ -n "${!var:-}" ]; then
            log_info "$var is set: ${!var}"
        fi
    done
    
    # Check if .env files exist
    if [ -f ".env" ]; then
        log_info ".env file found (will be loaded automatically)"
    fi
    if [ -f ".env.local" ]; then
        log_info ".env.local file found (will be loaded automatically)"
    fi
    if [ -f ".env.example" ]; then
        log_info ".env.example available as template"
    fi
}

# Clean up temporary files and optimize
cleanup_and_optimize() {
    log_header "Cleanup and Optimization"
    
    # Clean old logs if they exist
    if [ -d "logs" ]; then
        local log_count
        log_count=$(find logs -name "*.log" -type f 2>/dev/null | wc -l)
        if [ "$log_count" -gt 0 ]; then
            find logs -name "*.log" -type f -mtime +7 -delete 2>/dev/null || true
            log_info "Cleaned old log files"
        fi
    fi
    
    # Check cache size and warn if large
    local cache_file=".git/.todoexpand-cache.json"
    if [ -f "$cache_file" ]; then
        local cache_size
        cache_size=$(du -k "$cache_file" | cut -f1)
        if [ "$cache_size" -gt 1024 ]; then  # > 1MB
            log_info "Cache file is ${cache_size}KB (clear with: rm $cache_file)"
        else
            log_info "Cache size: ${cache_size}KB"
        fi
    fi
    
    # Ensure proper permissions
    if [ -f "bin/todo-expand.ts" ]; then
        chmod +x bin/todo-expand.ts
    fi
    if [ -f "todo-expand" ]; then
        chmod +x todo-expand
    fi
    if [ -f "dist/todo-expand" ]; then
        chmod +x dist/todo-expand
    fi
    
    log_success "Cleanup completed"
}

# Show current status and quick help
show_status_summary() {
    log_header "Maintenance Complete!"
    
    log_success "✅ todo-expander container is ready!"
    
    echo ""
    echo "📊 Current Status:"
    
    if command_exists deno; then
        echo "   Deno: $(deno --version | head -n1 | cut -d' ' -f2)"
    fi
    
    if [ -f "dist/todo-expand" ]; then
        local binary_size
        binary_size=$(du -h "dist/todo-expand" | cut -f1)
        echo "   CLI Binary: ✅ ($binary_size)"
    else
        echo "   CLI Binary: ❌ (run: deno task build:cli)"
    fi
    
    if git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
        echo "   Git Repository: ✅ ($(git branch --show-current 2>/dev/null || echo 'unknown'))"
    else
        echo "   Git Repository: ❌"
    fi
    
    if [ -n "${OPENAI_API_KEY:-}" ]; then
        echo "   OpenAI API Key: ✅"
    else
        echo "   OpenAI API Key: ⏳ (set when ready to use)"
    fi
    
    echo ""
    echo "🚀 Quick Commands:"
    echo "   deno task todo:staged --dry-run    # Preview TODO expansion"
    echo "   deno task todo:staged              # Process staged files"
    echo "   ./todo-expand --help               # Show CLI help"
    echo "   deno task fmt                      # Format code"
    echo "   deno task lint                     # Lint code"
    
    echo ""
    echo "📝 Documentation: README.md, WARP.md"
    echo "🔧 To set API key: export OPENAI_API_KEY='your-key-here'"
}

# Main maintenance function
main() {
    log_header "TODO Expander - Container Maintenance"
    log_info "Validating and updating cached container..."
    
    # Run maintenance steps
    check_deno || { log_error "Deno check failed"; exit 1; }
    validate_project_structure || { log_error "Project validation failed"; exit 1; }
    check_git_status
    check_cli_binary || { log_warn "CLI binary issues detected"; }
    test_functionality || { log_warn "Functionality tests had issues"; }
    check_environment
    cleanup_and_optimize
    
    show_status_summary
    
    log_success "Container maintenance completed! 🔧"
}

# Run main function
main "$@"