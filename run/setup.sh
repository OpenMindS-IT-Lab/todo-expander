#!/usr/bin/env bash

# todo-expander: Codex Container Setup Script
# Runs after creating new containers, after the repo is cloned
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

# Install Deno in container environment
install_deno() {
    log_header "Installing Deno"
    
    if command_exists deno; then
        local deno_version
        deno_version=$(deno --version | head -n1 | cut -d' ' -f2)
        log_info "Deno already installed: $deno_version"
        
        # Check if version is adequate (1.30.0+)
        if [[ "$deno_version" =~ ^1\.([3-9][0-9]|[4-9][0-9]) ]] || [[ "$deno_version" =~ ^[2-9]\. ]]; then
            log_success "Deno version is sufficient"
            return 0
        else
            log_warn "Deno version $deno_version is too old, upgrading..."
        fi
    fi
    
    log_info "Installing Deno..."
    
    # Container-friendly installation using curl
    if command_exists curl; then
        curl -fsSL https://deno.land/x/install/install.sh | sh -s v1.45.5
    else
        log_error "curl not available for Deno installation"
        return 1
    fi
    
    # Add Deno to PATH for current session
    export PATH="$HOME/.deno/bin:$PATH"
    
    # Add to shell profile for future sessions
    if [ -f "$HOME/.bashrc" ]; then
        echo 'export PATH="$HOME/.deno/bin:$PATH"' >> "$HOME/.bashrc"
    fi
    if [ -f "$HOME/.zshrc" ]; then
        echo 'export PATH="$HOME/.deno/bin:$PATH"' >> "$HOME/.zshrc"
    fi
    
    # Verify installation
    if command_exists deno; then
        local new_version
        new_version=$(deno --version | head -n1 | cut -d' ' -f2)
        log_success "Deno installed successfully: $new_version"
    else
        log_error "Deno installation failed"
        return 1
    fi
}

# Set up project environment
setup_project() {
    log_header "Setting up Project Environment"
    
    # Ensure we're in the project root
    if [ ! -f "deno.json" ]; then
        log_error "Not in todo-expander project root (deno.json not found)"
        return 1
    fi
    
    log_info "Project root: $(pwd)"
    
    # Create necessary directories
    local dirs=("dist" "logs" "cache" ".git/hooks")
    for dir in "${dirs[@]}"; do
        if [ ! -d "$dir" ]; then
            mkdir -p "$dir"
            log_info "Created directory: $dir"
        fi
    done
    
    # Set up .env.example if it doesn't exist
    if [ ! -f ".env.example" ]; then
        log_info "Creating .env.example..."
        cat > .env.example << 'EOF'
# OpenAI API Configuration
OPENAI_API_KEY=sk-your-api-key-here
OPENAI_MODEL=gpt-4o-mini

# Optional: Tool Configuration
# TODO_EXPAND_STYLE=succinct
# TODO_EXPAND_SECTIONS=Context,Goal,Steps,Constraints,Acceptance
# TODO_EXPAND_DRY=0
EOF
        log_success ".env.example created"
    fi
    
    # Enhance .gitignore for container environment
    if [ -f ".gitignore" ]; then
        # Add container-specific ignores if not present
        if ! grep -q "# Container artifacts" .gitignore; then
            cat >> .gitignore << 'EOF'

# Container artifacts
.maintenance.log
*.log
cache/
logs/
tmp/

# Codex environment
.codex/
EOF
            log_info "Updated .gitignore for container environment"
        fi
    fi
}

# Validate project files and dependencies
validate_project() {
    log_header "Validating Project"
    
    # Check essential files
    local essential_files=("deno.json" "bin/todo-expand.ts" "src/config.ts" "src/process.ts" "src/todos.ts")
    local missing_files=()
    
    for file in "${essential_files[@]}"; do
        if [ -f "$file" ]; then
            log_success "Found: $file"
        else
            log_error "Missing: $file"
            missing_files+=("$file")
        fi
    done
    
    if [ ${#missing_files[@]} -gt 0 ]; then
        log_error "Missing essential files: ${missing_files[*]}"
        return 1
    fi
    
    # Validate deno.json syntax
    if command_exists deno; then
        log_info "Validating deno.json..."
        if deno task --quiet 2>/dev/null | grep -q "Available tasks"; then
            log_success "deno.json is valid"
            
            # Show available tasks
            log_info "Available Deno tasks:"
            deno task --quiet 2>/dev/null | grep -E "^  " | head -10
        else
            log_warn "deno.json may have syntax issues"
        fi
    fi
}

# Test basic CLI functionality
test_cli() {
    log_header "Testing CLI Functionality"
    
    if ! command_exists deno; then
        log_error "Deno not available for testing"
        return 1
    fi
    
    # Test help command
    log_info "Testing help command..."
    if timeout 10 deno run -A bin/todo-expand.ts --help >/dev/null 2>&1; then
        log_success "CLI help command works"
    else
        log_error "CLI help command failed"
        return 1
    fi
    
    # Test configuration display
    log_info "Testing configuration..."
    if timeout 10 deno run -A bin/todo-expand.ts --print-config >/dev/null 2>&1; then
        log_success "Configuration loading works"
    else
        log_warn "Configuration loading failed (may need API key setup)"
    fi
    
    log_success "Basic CLI functionality verified"
}

# Build the CLI binary
build_cli() {
    log_header "Building CLI Binary"
    
    if ! command_exists deno; then
        log_error "Deno required for building"
        return 1
    fi
    
    log_info "Building todo-expand binary..."
    
    # Use deno task if available, otherwise direct command
    if deno task --quiet 2>/dev/null | grep -q "build:cli"; then
        deno task build:cli
    else
        deno compile -A --output dist/todo-expand bin/todo-expand.ts
    fi
    
    if [ -f "dist/todo-expand" ]; then
        local binary_size
        binary_size=$(du -h "dist/todo-expand" | cut -f1)
        log_success "CLI built successfully (size: $binary_size)"
        log_info "Binary location: ./dist/todo-expand"
    else
        log_error "CLI build failed - binary not found"
        return 1
    fi
}

# Set up git hooks for the project
setup_git_hooks() {
    log_header "Setting up Git Hooks"
    
    # Only set up if we're in a git repository
    if ! git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
        log_info "Not in a git repository, skipping git hooks"
        return 0
    fi
    
    local hooks_dir=".githooks"
    mkdir -p "$hooks_dir"
    
    # Create pre-commit hook for formatting
    if [ ! -f "$hooks_dir/pre-commit" ]; then
        log_info "Creating pre-commit hook..."
        cat > "$hooks_dir/pre-commit" << 'EOF'
#!/usr/bin/env bash
# Pre-commit hook for todo-expander

set -euo pipefail

# Skip if formatting is disabled
if [ -f .no-format-hook ]; then 
    echo "Formatting disabled by .no-format-hook"
    exit 0
fi

# Check if deno is available
if ! command -v deno >/dev/null 2>&1; then
    echo "Deno not found, skipping formatting"
    exit 0
fi

# Get staged files that can be formatted
staged_files=$(git diff --cached --name-only --diff-filter=ACM | grep -E '\.(ts|tsx|js|jsx|json|md)$' || true)

if [ -n "$staged_files" ]; then
    echo "Formatting staged files with deno fmt..."
    
    # Format the files
    echo "$staged_files" | xargs deno fmt 2>/dev/null || {
        echo "Warning: Some files could not be formatted"
    }
    
    # Re-add formatted files to staging area
    echo "$staged_files" | xargs git add
    
    echo "✅ Files formatted and re-staged"
fi

exit 0
EOF
        chmod +x "$hooks_dir/pre-commit"
        log_success "Pre-commit hook created"
    fi
    
    # Configure git to use our hooks directory
    git config core.hooksPath .githooks
    log_success "Git hooks configured"
}

# Create helpful aliases and shortcuts
create_shortcuts() {
    log_header "Creating Shortcuts"
    
    # Create a simple wrapper script for easier CLI access
    if [ ! -f "todo-expand" ]; then
        cat > todo-expand << 'EOF'
#!/usr/bin/env bash
# Wrapper script for todo-expand CLI

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

if [ -f "$SCRIPT_DIR/dist/todo-expand" ]; then
    # Use compiled binary if available
    exec "$SCRIPT_DIR/dist/todo-expand" "$@"
else
    # Fall back to deno run
    exec deno run -A "$SCRIPT_DIR/bin/todo-expand.ts" "$@"
fi
EOF
        chmod +x todo-expand
        log_success "Created todo-expand wrapper script"
    fi
    
    log_info "Quick usage examples:"
    echo "  ./todo-expand --help"
    echo "  ./todo-expand --staged --dry-run"
    echo "  deno task todo:staged"
}

# Final setup summary
print_setup_summary() {
    log_header "Setup Complete!"
    
    log_success "✅ todo-expander is ready for Codex!"
    
    echo ""
    echo "🚀 Quick Start:"
    echo "1. Set your OpenAI API key:"
    echo "   export OPENAI_API_KEY='your-api-key-here'"
    echo ""
    echo "2. Test the setup:"
    echo "   ./todo-expand --help"
    echo "   deno task todo:staged --dry-run"
    echo ""
    echo "3. Available commands:"
    echo "   deno task todo:staged    # Process staged files"
    echo "   deno task todo:file      # Process specific files"
    echo "   deno task build:cli      # Rebuild binary"
    echo "   deno task fmt            # Format code"
    echo "   deno task lint           # Lint code"
    echo ""
    echo "📝 For help: ./todo-expand --help"
    echo "📋 Project documentation: README.md and WARP.md"
    
    if [ -f "dist/todo-expand" ]; then
        echo ""
        echo "📦 Binary built successfully: ./dist/todo-expand"
    fi
}

# Main setup function
main() {
    log_header "TODO Expander - Codex Container Setup"
    log_info "Initializing container for todo-expander project..."
    
    # Run setup steps
    install_deno || { log_error "Deno installation failed"; exit 1; }
    setup_project || { log_error "Project setup failed"; exit 1; }
    validate_project || { log_error "Project validation failed"; exit 1; }
    test_cli || { log_error "CLI testing failed"; exit 1; }
    build_cli || { log_error "CLI build failed"; exit 1; }
    setup_git_hooks || { log_warn "Git hooks setup had issues"; }
    create_shortcuts || { log_warn "Shortcuts creation had issues"; }
    
    print_setup_summary
    
    log_success "Container setup completed successfully! 🎉"
}

# Run main function
main "$@"