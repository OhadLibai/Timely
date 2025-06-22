// backend/src/alias.ts
// Runtime path alias resolution for Node.js
import moduleAlias from 'module-alias';
import path from 'path';

// Register path aliases for runtime
moduleAlias.addAliases({
  '@': path.join(__dirname),
  '@/controllers': path.join(__dirname, 'controllers'),
  '@/models': path.join(__dirname, 'models'),
  '@/routes': path.join(__dirname, 'routes'),
  '@/services': path.join(__dirname, 'services'),
  '@/middleware': path.join(__dirname, 'middleware'),
  '@/utils': path.join(__dirname, 'utils'),
  '@/types': path.join(__dirname, 'types'),
  '@/config': path.join(__dirname, 'config'),
  '@/database': path.join(__dirname, 'database'),
  '@/validators': path.join(__dirname, 'validators')
});

export default moduleAlias;