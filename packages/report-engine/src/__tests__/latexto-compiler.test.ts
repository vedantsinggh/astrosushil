import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { LatextoCompiler } from '../pdf/latexto-compiler';
import { getLatexCompiler } from '../pdf/latex-compiler.factory';

describe('LatextoCompiler Unit & Factory Suite', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
    vi.restoreAllMocks();
  });

  it('1. Factory should return LocalXeLatexCompiler by default', () => {
    delete process.env.LATEX_COMPILER;
    const compiler = getLatexCompiler();
    expect(compiler.constructor.name).toBe('LocalXeLatexCompiler');
  });

  it('2. Factory should return LatextoCompiler when LATEX_COMPILER=latexto', () => {
    process.env.LATEX_COMPILER = 'latexto';
    const compiler = getLatexCompiler();
    expect(compiler.constructor.name).toBe('LatextoCompiler');
  });

  it('3. LatextoCompiler should throw LATEX_COMPILATION_FAILED if main.tex entrypoint is missing', async () => {
    const compiler = new LatextoCompiler('/tmp/non-existent-template-dir-12345');
    await expect(
      compiler.compileReport({
        reportId: 'test-missing-main',
        reportDataTex: '% test',
      })
    ).rejects.toThrow(/LATEX_ENGINE_UNAVAILABLE|LATEX_COMPILATION_FAILED/);
  });
});
