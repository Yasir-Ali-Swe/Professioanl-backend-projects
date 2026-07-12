import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import { Skeleton } from "@/components/ui/skeleton";

const SkeletonTable = ({
  rows = 4,
  columns = 5,
  showToolbar = true,
  showPagination = true,
}) => {
  const widths = [
    "w-full",
    "w-11/12",
    "w-10/12",
    "w-9/12",
    "w-8/12",
    "w-7/12",
    "w-6/12",
  ];

  const getWidth = (row, col) =>
    widths[(row * columns + col) % widths.length];

  return (
    <div className="space-y-6 w-full">
      {/* Toolbar */}
      {showToolbar && (
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <Skeleton className="h-10 w-full sm:w-72 rounded-md bg-chart-1" />

          <div className="flex gap-2">
            <Skeleton className="h-10 w-28 rounded-md bg-chart-1" />
            <Skeleton className="size-10 rounded-md bg-chart-1" />
          </div>
        </div>
      )}

      {/* Table */}
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent border-0!">
            {Array.from({ length: columns }).map((_, col) => (
              <TableHead key={col}>
                <Skeleton
                  className={`h-4 ${widths[col % widths.length]} bg-chart-1`}
                />
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>

        <TableBody>
          {Array.from({ length: rows }).map((_, row) => (
            <TableRow
              key={row}
              className="hover:bg-transparent border-0!"
            >
              {Array.from({ length: columns }).map((_, col) => (
                <TableCell key={col}>
                  <Skeleton
                    className={`h-4 ${getWidth(row, col)} bg-chart-1`}
                  />
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {/* Pagination */}
      {showPagination && (
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <Skeleton className="h-4 w-40 bg-chart-1" />

          <div className="flex gap-2">
            <Skeleton className="size-8 rounded-md bg-chart-1" />
            <Skeleton className="size-8 rounded-md bg-chart-1" />
            <Skeleton className="h-8 w-10 rounded-md bg-chart-1" />
            <Skeleton className="size-8 rounded-md bg-chart-1" />
            <Skeleton className="size-8 rounded-md bg-chart-1" />
          </div>
        </div>
      )}
    </div>
  );
};

export default SkeletonTable;