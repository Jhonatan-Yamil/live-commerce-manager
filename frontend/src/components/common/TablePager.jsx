import { TablePagination } from "@mui/material";

export default function TablePager({ count, page, rowsPerPage, onPageChange, onRowsPerPageChange }) {
  return (
    <TablePagination
      component="div"
      count={count}
      page={page}
      onPageChange={(_, newPage) => onPageChange(newPage)}
      rowsPerPage={rowsPerPage}
      onRowsPerPageChange={(e) => onRowsPerPageChange(parseInt(e.target.value))}
      rowsPerPageOptions={[5, 10, 25]}
      labelRowsPerPage="Filas por página:"
      labelDisplayedRows={({ from, to, count }) => `${from}-${to} de ${count}`}
    />
  );
}