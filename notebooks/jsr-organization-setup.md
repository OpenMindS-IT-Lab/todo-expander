# JSR Organization/Team Setup

## Current Status

JSR (JavaScript Registry) is still in development and organization/team features are not yet fully documented or available.

## Research Findings

### Scope Availability

- **@openminds-it-lab**: Available (returns "scope not found")
- **Current Package**: Published under personal scope `@saladin/todo-expander`

### JSR Organization Features

As of January 2025, JSR appears to primarily support personal scopes. Organization/team features may be:

- In development
- Not yet publicly documented
- Available through private beta

### Migration Strategy

When JSR organization features become available:

1. **Create Organization Scope**
   ```bash
   # Future command (when available)
   # deno publish --scope=@openminds-it-lab
   ```

2. **Package Migration Options**
   - **Alias Package**: Create `@openminds-it-lab/todo-expander` that re-exports from `@saladin/todo-expander`
   - **Full Migration**: Transfer ownership and update all references
   - **Mirror Package**: Maintain both scopes with synchronized publishing

3. **Recommended Approach**
   - Keep `@saladin/todo-expander` as primary until JSR org features are stable
   - Monitor JSR development and documentation updates
   - Plan migration when official organization support is announced

### Monitoring JSR Development

Check these resources periodically:

- [JSR Documentation](https://jsr.io/docs)
- [JSR GitHub Repository](https://github.com/jsr-io/jsr)
- JSR Discord/Community channels for announcements

## Current Package Links

- **JSR**: [`@saladin/todo-expander`](https://jsr.io/@saladin/todo-expander)
- **NPM Main**: [`todo-expander`](https://www.npmjs.com/package/todo-expander)
- **NPM Scoped**: `@openminds-it-lab/todo-expander` (in progress)
- **GitHub**: [OpenMindS-IT-Lab/todo-expander](https://github.com/OpenMindS-IT-Lab/todo-expander)
