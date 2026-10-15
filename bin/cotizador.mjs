#!/usr/bin/env node
// Entrada del CLI: registra tsx para cargar el TypeScript de src/ sin compilar.
import { register } from 'tsx/esm/api';

register();
await import('../cli/main.ts');
