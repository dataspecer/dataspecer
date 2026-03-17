import { cpSync } from 'node:fs';

cpSync('src/templates', 'lib/templates', { recursive: true });
cpSync('static', 'lib/static', { recursive: true });
