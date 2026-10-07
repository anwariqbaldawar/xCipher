import { describe, it, expect } from 'vitest';
import { cleanMermaidCode, resolveMermaidCode } from '@/components/editorial/extensions/MermaidBlock';
import { sanitizeArticleHtml } from '@/lib/sanitize';

describe('MermaidBlock extension & cleaning', () => {
  it('cleans raw mermaid code without fences', () => {
    const raw = 'graph TD\n  A-->B;';
    expect(cleanMermaidCode(raw)).toBe('graph TD\n  A-->B;');
  });

  it('strips ```mermaid fences with various newlines and spaces', () => {
    const raw = '```mermaid\ngraph TD\n  A-->B;\n```';
    expect(cleanMermaidCode(raw)).toBe('graph TD\n  A-->B;');

    const rawWindows = '```mermaid\r\ngraph LR\r\n  X-->Y;\r\n```';
    expect(cleanMermaidCode(rawWindows)).toBe('graph LR\r\n  X-->Y;');

    const rawSpaces = '```mermaid   \ngraph TD\n  Start-->Stop;\n```';
    expect(cleanMermaidCode(rawSpaces)).toBe('graph TD\n  Start-->Stop;');

    const rawGenericFence = '```\ngraph TD\n  A-->B;\n```';
    expect(cleanMermaidCode(rawGenericFence)).toBe('graph TD\n  A-->B;');
  });

  it('handles empty or whitespace strings gracefully', () => {
    expect(cleanMermaidCode('')).toBe('');
    expect(cleanMermaidCode('   \n  ')).toBe('');
    expect(cleanMermaidCode(null as any)).toBe('');
    expect(cleanMermaidCode(undefined as any)).toBe('');
  });

  it('falls back from empty canonical code to the legacy graphDefinition', () => {
    const legacyCode = 'graph LR\n  A-->B;';
    expect(resolveMermaidCode('', legacyCode)).toBe(legacyCode);
    expect(resolveMermaidCode('   ', legacyCode)).toBe(legacyCode);
    expect(resolveMermaidCode('', null)).toBe('');
  });

  it('prefers canonical code when both Mermaid attributes are present', () => {
    const canonicalCode = 'graph TD\n  X-->Y;';
    const legacyCode = 'graph LR\n  A-->B;';
    expect(resolveMermaidCode(canonicalCode, legacyCode)).toBe(canonicalCode);
  });

  it('preserves both data-code and data-graph-definition in sanitizeArticleHtml', () => {
    const html = '<div data-type="mermaid-block" data-code="graph TD; A-->B" data-graph-definition="graph TD; A-->B" data-container-width="100%"></div>';
    const sanitized = sanitizeArticleHtml(html);
    expect(sanitized).toContain('data-code="graph TD; A--&gt;B"');
    expect(sanitized).toContain('data-graph-definition="graph TD; A--&gt;B"');
    expect(sanitized).toContain('data-type="mermaid-block"');
  });
});
