/**
 * @file Paths for the website target.
 * @see ../.agent/contract.md
 */
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const SITE_NAME = 'Contract Graph';
export const LIVE_URL = 'https://contractgraph.dev/';
export const DEV_PORT = 4173;
export function getPublicRoot(root = repositoryRoot) {
  return path.join(root, 'public');
}
