export default {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'type-enum': [
      2,
      'always',
      [
        'feat', // New feature
        'fix', // Bug fix
        'docs', // Documentation
        'style', // Formatting, no code change
        'refactor', // Code restructuring
        'perf', // Performance improvement
        'test', // Adding tests
        'build', // Build system changes
        'ci', // CI configuration
        'chore', // Maintenance
        'revert', // Revert commit
      ],
    ],
    'scope-enum': [
      2,
      'always',
      [
        'core', // glow-core crate
        'server', // glow-server crate
        'desktop', // glow-desktop crate
        'wasm', // glow-wasm crate
        'web', // SvelteKit app
        'ui', // UI components
        'deps', // Dependencies
        'config', // Configuration
      ],
    ],
    'subject-case': [2, 'always', 'lower-case'],
    'header-max-length': [2, 'always', 72],
  },
};
