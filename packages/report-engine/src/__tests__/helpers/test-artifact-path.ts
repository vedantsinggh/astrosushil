import fs from 'fs';
import os from 'os';
import path from 'path';

const repositoryRoot = path.resolve(__dirname, '../../../../../');

/** Create a unique temporary destination and reject paths inside the repository. */
export function createTestArtifactPath(fileName: string): string {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'astro-sushil-test-'));
  const artifactPath = path.resolve(directory, fileName);
  const relativeToTemp = path.relative(os.tmpdir(), artifactPath);
  const relativeToRepository = path.relative(repositoryRoot, artifactPath);

  if (relativeToTemp.startsWith('..') || path.isAbsolute(relativeToTemp)) {
    throw new Error('Test artifacts must be written inside the system temporary directory');
  }
  if (!relativeToRepository.startsWith('..') && !path.isAbsolute(relativeToRepository)) {
    throw new Error('Test artifacts must not be written inside the repository');
  }

  return artifactPath;
}
