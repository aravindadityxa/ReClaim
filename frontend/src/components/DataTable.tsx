import React, { useMemo, ReactNode } from 'react'

export interface ColumnConfig<T> {
  key: string
  label: string
  render?: (value: any, row: T, index: number) => ReactNode
  width?: string
  align?: 'left' | 'center' | 'right'
  sortable?: boolean
}

interface DataTableProps<T> {
  columns: ColumnConfig<T>[]
  data: T[]
  rowKey: (row: T, index: number) => string
  onRowClick?: (row: T, index: number) => void
  loading?: boolean
  empty?: boolean
  striped?: boolean
  hoverable?: boolean
  compact?: boolean
}

export default function DataTable<T>({
  columns,
  data,
  rowKey,
  onRowClick,
  loading = false,
  empty = false,
  striped = true,
  hoverable = true,
  compact = false,
}: DataTableProps<T>) {
  const tableStyle = useMemo(
    () => ({
      width: '100%',
      borderCollapse: 'collapse' as const,
      borderSpacing: '0',
    }),
    []
  )

  const theadStyle = useMemo(
    () => ({
      backgroundColor: 'rgba(255, 255, 255, 0.02)',
      borderBottom: '1px solid var(--color-border)',
    }),
    []
  )

  const thStyle = useMemo(
    () => ({
      padding: compact ? 'var(--spacing-3) var(--spacing-4)' : 'var(--spacing-4) var(--spacing-6)',
      textAlign: 'left' as const,
      fontSize: 'var(--font-size-xs)',
      fontWeight: 'var(--font-weight-semibold)',
      color: 'var(--color-text-muted)',
      textTransform: 'uppercase' as const,
      letterSpacing: 'var(--letter-spacing-wide)',
      borderBottom: '1px solid var(--color-border-subtle)',
    }),
    [compact]
  )

  const getTrStyle = (index: number) => {
    const baseStyle: React.CSSProperties = {
      borderBottom: '1px solid var(--color-border-subtle)',
      transition: 'all var(--transition-fast)',
    }

    if (striped && index % 2 === 1) {
      baseStyle.backgroundColor = 'rgba(255, 255, 255, 0.02)'
    }

    if (hoverable && onRowClick) {
      baseStyle.cursor = 'pointer'
    }

    return baseStyle
  }

  const getTdStyle = (align: 'left' | 'center' | 'right' = 'left') => ({
    padding: compact ? 'var(--spacing-3) var(--spacing-4)' : 'var(--spacing-4) var(--spacing-6)',
    textAlign: align as any,
    color: 'var(--color-text-primary)',
    fontSize: 'var(--font-size-base)',
  })

  if (empty) {
    return (
      <div
        style={{
          padding: 'var(--spacing-12)',
          textAlign: 'center',
          color: 'var(--color-text-secondary)',
        }}
      >
        No data available
      </div>
    )
  }

  if (loading) {
    return (
      <div
        style={{
          padding: 'var(--spacing-12)',
          textAlign: 'center',
          color: 'var(--color-text-secondary)',
        }}
      >
        Loading...
      </div>
    )
  }

  return (
    <div
      style={{
        overflowX: 'auto',
        borderRadius: 'var(--radius-lg)',
        border: '1px solid var(--color-border)',
      }}
    >
      <table style={tableStyle}>
        <thead style={theadStyle}>
          <tr>
            {columns.map((col) => (
              <th
                key={col.key}
                style={{
                  ...thStyle,
                  width: col.width,
                  textAlign: col.align as any,
                }}
              >
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row, rowIndex) => (
            <tr
              key={rowKey(row, rowIndex)}
              style={getTrStyle(rowIndex)}
              onClick={() => onRowClick?.(row, rowIndex)}
              onMouseEnter={(e) => {
                if (hoverable && onRowClick) {
                  ;(e.currentTarget as HTMLTableRowElement).style.backgroundColor =
                    'rgba(255, 255, 255, 0.04)'
                }
              }}
              onMouseLeave={(e) => {
                if (hoverable && onRowClick) {
                  const trElement = e.currentTarget as HTMLTableRowElement
                  if (striped && rowIndex % 2 === 1) {
                    trElement.style.backgroundColor = 'rgba(255, 255, 255, 0.02)'
                  } else {
                    trElement.style.backgroundColor = 'transparent'
                  }
                }
              }}
            >
              {columns.map((col) => {
                const cellValue = (row as any)[col.key]
                const renderedValue = col.render
                  ? col.render(cellValue, row, rowIndex)
                  : cellValue

                return (
                  <td
                    key={`${rowKey(row, rowIndex)}-${col.key}`}
                    style={{
                      ...getTdStyle(col.align),
                    }}
                  >
                    {renderedValue}
                  </td>
                )
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
