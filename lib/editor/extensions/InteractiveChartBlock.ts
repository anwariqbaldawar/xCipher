import { Node, mergeAttributes } from '@tiptap/core';

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    interactiveChartBlock: {
      setInteractiveChart: () => ReturnType;
    };
  }
}

export const InteractiveChartBlock = Node.create({
  name: 'interactiveChartBlock',
  group: 'block',
  atom: true,

  addAttributes() {
    return {
      data: {
        default: '[]',
        parseHTML: (element) => element.getAttribute('data-chart-data'),
        renderHTML: (attributes) => ({
          'data-chart-data': attributes.data,
        }),
      },
      config: {
        default: '{}',
        parseHTML: (element) => element.getAttribute('data-chart-config'),
        renderHTML: (attributes) => ({
          'data-chart-config': attributes.config,
        }),
      },
    };
  },

  parseHTML() {
    return [{ tag: 'div[data-type="smart-interactive-chart"]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes({ 'data-type': 'smart-interactive-chart' }, HTMLAttributes)];
  },

  addCommands() {
    return {
      setInteractiveChart: () => ({ state, dispatch, tr }: any) => {
        const { $from } = state.selection;
        let tableNode: any = null;
        let tablePos = -1;

        const selNode = (state.selection as any).node;
        if (selNode && selNode.type.name === 'table') {
          tableNode = selNode;
          tablePos = state.selection.from;
        } else {
          for (let d = $from.depth; d > 0; d--) {
            if ($from.node(d).type.name === 'table') {
              tableNode = $from.node(d);
              tablePos = $from.before(d);
              break;
            }
          }
        }

        if (!tableNode || tablePos < 0) {
          return false;
        }

        const data: any[] = [];
        const config: Record<string, { prefix: string; suffix: string }> = {};
        
        const allRows: string[][] = [];
        tableNode.forEach((rowNode: any) => {
          if (rowNode.type.name !== 'tableRow') return;
          const cells: string[] = [];
          rowNode.forEach((cellNode: any) => {
            if (cellNode.type.name === 'tableCell' || cellNode.type.name === 'tableHeader') {
              cells.push(cellNode.textContent.trim());
            }
          });
          if (cells.length > 0) allRows.push(cells);
        });

        if (allRows.length < 2) return false;

        const headers = allRows[0];
        const dataRows = allRows.slice(1);

        // Filter out non-numeric columns (like date ranges "Oct 15, 2025 – Oct 13, 2026")
        const numericColIndices: number[] = [];
        for (let i = 1; i < headers.length; i++) {
          let isColNumeric = true;
          let count = 0;
          for (const row of dataRows) {
            const raw = (row[i] || '').trim();
            if (!raw) continue;
            if (/[a-zA-Z]/.test(raw)) {
              isColNumeric = false;
              break;
            }
            const clean = raw.replace(/[$,€£¥%\s]/g, '');
            if (clean !== '' && !isNaN(Number(clean))) {
              count++;
            } else {
              isColNumeric = false;
              break;
            }
          }
          if (isColNumeric && count > 0) {
            numericColIndices.push(i);
          }
        }

        if (numericColIndices.length === 0) return false;

        for (const i of numericColIndices) {
          config[headers[i]] = { prefix: '', suffix: '' };
        }

        for (const row of dataRows) {
          const rowData: any = { name: row[0] };
          for (const i of numericColIndices) {
            const header = headers[i];
            const cellValue = row[i] || '';
            const match = cellValue.match(/^([^\d.-]*)([\d,.]+)([^\d]*)$/);
            if (match && match[2]) {
              const prefix = match[1].trim();
              const numStr = match[2].replace(/,/g, '');
              const suffix = match[3].trim();
              const numericValue = parseFloat(numStr);
              rowData[header] = isNaN(numericValue) ? 0 : numericValue;
              if (prefix && !config[header].prefix) config[header].prefix = prefix;
              if (suffix && !config[header].suffix) config[header].suffix = suffix;
            } else {
              const clean = cellValue.replace(/[$,€£¥%\s]/g, '');
              const num = parseFloat(clean);
              rowData[header] = isNaN(num) ? 0 : num;
            }
          }
          data.push(rowData);
        }

        const chartType = state.schema.nodes.interactiveChartBlock;
        if (!chartType) return false;

        const newNode = chartType.create({
          data: JSON.stringify(data),
          config: JSON.stringify(config),
        });

        if (dispatch) {
          const transaction = tr.replaceWith(tablePos, tablePos + tableNode.nodeSize, newNode);
          dispatch(transaction.scrollIntoView());
        }

        return true;
      },
    };
  },
});
