/**
 * Markdown 表格解析工具
 * 将 markdown 表格文本解析为 Ant Design Table 可用的数据格式
 */

export interface ParsedTable {
  columns: { title: string; dataIndex: string; key: string }[]
  dataSource: Record<string, string>[]
}

/**
 * 解析 markdown 表格文本
 * 支持格式：
 * | 列1 | 列2 | 列3 |
 * |-----|-----|-----|
 * | 值1 | 值2 | 值3 |
 *
 * 返回 null 表示没有找到有效的表格
 */
export function parseMarkdownTable(markdownText: string): ParsedTable | null {
  if (!markdownText || !markdownText.trim()) return null

  const lines = markdownText.trim().split('\n')

  // 找到表格行（以 | 开头和结尾的行）
  const tableLines: string[] = []
  const nonTableBefore: string[] = []
  const nonTableAfter: string[] = []
  let inTable = false
  let tableEnded = false

  for (const line of lines) {
    const trimmed = line.trim()
    if (!inTable && trimmed.startsWith('|') && trimmed.endsWith('|')) {
      inTable = true
      tableLines.push(trimmed)
    } else if (inTable && trimmed.startsWith('|') && trimmed.endsWith('|')) {
      tableLines.push(trimmed)
    } else if (inTable && !trimmed.startsWith('|')) {
      tableEnded = true
      inTable = false
      nonTableAfter.push(line)
    } else if (!inTable && !tableEnded) {
      nonTableBefore.push(line)
    } else {
      nonTableAfter.push(line)
    }
  }

  if (tableLines.length < 2) return null // 至少需要表头行和分隔行

  // 解析列标题（第一行）
  const headerCells = parseTableRow(tableLines[0])
  if (headerCells.length === 0) return null

  // 跳过分隔行（第二行，包含 --- 的行）
  let dataStartIndex = 1
  if (tableLines.length > 1 && isSeparatorRow(tableLines[1])) {
    dataStartIndex = 2
  }

  // 生成列配置
  const columns = headerCells.map((cell, index) => ({
    title: cell.trim(),
    dataIndex: `col_${index}`,
    key: `col_${index}`,
  }))

  // 解析数据行
  const dataSource: Record<string, string>[] = []
  for (let i = dataStartIndex; i < tableLines.length; i++) {
    const cells = parseTableRow(tableLines[i])
    if (cells.length === 0) continue

    const row: Record<string, string> = {}
    cells.forEach((cell, colIndex) => {
      row[`col_${colIndex}`] = cell.trim()
    })
    // 确保每行都有所有列（不足的补空字符串）
    for (let j = cells.length; j < headerCells.length; j++) {
      row[`col_${j}`] = ''
    }
    dataSource.push(row)
  }

  return { columns, dataSource }
}

/**
 * 解析 markdown 文本，支持混合内容（表格 + 文本）
 * 返回结构化数据用于渲染
 */
export function parseMarkdownWithTable(markdownText: string): {
  beforeText: string
  table: ParsedTable | null
  afterText: string
} {
  if (!markdownText || !markdownText.trim()) {
    return { beforeText: '', table: null, afterText: '' }
  }

  const lines = markdownText.trim().split('\n')
  const tableLines: string[] = []
  const beforeLines: string[] = []
  const afterLines: string[] = []
  let inTable = false
  let tableEnded = false

  for (const line of lines) {
    const trimmed = line.trim()
    if (!inTable && trimmed.startsWith('|') && trimmed.endsWith('|')) {
      inTable = true
      tableLines.push(trimmed)
    } else if (inTable && trimmed.startsWith('|') && trimmed.endsWith('|')) {
      tableLines.push(trimmed)
    } else if (inTable && !trimmed.startsWith('|')) {
      tableEnded = true
      inTable = false
      afterLines.push(line)
    } else if (!inTable && !tableEnded) {
      beforeLines.push(line)
    } else {
      afterLines.push(line)
    }
  }

  // 解析表格
  let table: ParsedTable | null = null
  if (tableLines.length >= 2) {
    const headerCells = parseTableRow(tableLines[0])
    if (headerCells.length > 0) {
      let dataStartIndex = 1
      if (tableLines.length > 1 && isSeparatorRow(tableLines[1])) {
        dataStartIndex = 2
      }

      const columns = headerCells.map((cell, index) => ({
        title: cell.trim(),
        dataIndex: `col_${index}`,
        key: `col_${index}`,
      }))

      const dataSource: Record<string, string>[] = []
      for (let i = dataStartIndex; i < tableLines.length; i++) {
        const cells = parseTableRow(tableLines[i])
        if (cells.length === 0) continue
        const row: Record<string, string> = {}
        cells.forEach((cell, colIndex) => {
          row[`col_${colIndex}`] = cell.trim()
        })
        for (let j = cells.length; j < headerCells.length; j++) {
          row[`col_${j}`] = ''
        }
        dataSource.push(row)
      }

      table = { columns, dataSource }
    }
  }

  return {
    beforeText: beforeLines.filter(l => l.trim()).join('\n'),
    table,
    afterText: afterLines.filter(l => l.trim()).join('\n'),
  }
}

/**
 * 解析单行表格单元格
 * 处理格式：| 单元格1 | 单元格2 | 单元格3 |
 */
function parseTableRow(line: string): string[] {
  // 去掉首尾的 |
  let content = line.trim()
  if (content.startsWith('|')) content = content.substring(1)
  if (content.endsWith('|')) content = content.substring(0, content.length - 1)

  // 按 | 分割
  return content.split('|')
}

/**
 * 判断是否是分隔行（包含 --- 的行）
 */
function isSeparatorRow(line: string): boolean {
  const trimmed = line.trim()
  if (!trimmed.startsWith('|') || !trimmed.endsWith('|')) return false

  const cells = parseTableRow(trimmed)
  return cells.some(cell => /^:?-{3,}:?$/.test(cell.trim()))
}