import { LatexCompiler } from './latex-compiler.interface';
import { latextoCompiler } from './latexto-compiler';
import { localXeLatexCompiler } from './xelatex-compiler';

export function getLatexCompiler(): LatexCompiler {
  const compilerType = (process.env.LATEX_COMPILER || 'local').toLowerCase().trim();

  if (compilerType === 'latexto') {
    return latextoCompiler;
  }

  // Default to native local XeLaTeX compiler
  return localXeLatexCompiler;
}

export const latexCompiler: LatexCompiler = {
  compileReport(options) {
    return getLatexCompiler().compileReport(options);
  },
};

