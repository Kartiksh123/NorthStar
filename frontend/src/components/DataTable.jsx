export default function DataTable({ rows, columns }) {
  if (!rows?.length) return <div className="table-empty">No rows found in this preview.</div>;

  const columnNames = columns?.length
    ? columns.map((column) => typeof column === 'string' ? column : column.name)
    : Object.keys(rows[0]);

  return (
    <div className="data-table-wrap">
      <table className="data-table">
        <thead><tr>{columnNames.map((column) => <th key={column}>{column.replaceAll('_', ' ')}</th>)}</tr></thead>
        <tbody>
          {rows.map((row, rowIndex) => (
            <tr key={row.id ?? rowIndex}>
              {columnNames.map((column) => (
                <td key={column}>
                  {row[column] === null || row[column] === undefined
                    ? <span className="null-value">null</span>
                    : typeof row[column] === 'object'
                      ? JSON.stringify(row[column])
                      : String(row[column])}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
