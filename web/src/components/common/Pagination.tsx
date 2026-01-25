import { Button } from "@/ui/button";
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from "lucide-react";

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  itemsPerPage?: number;
  totalItems?: number;
  showFirstLast?: boolean;
  maxVisiblePages?: number;
}

export function Pagination({
  currentPage,
  totalPages,
  onPageChange,
  itemsPerPage,
  totalItems,
  showFirstLast = true,
  maxVisiblePages = 5,
}: PaginationProps) {
  if (totalPages <= 1) return null;

  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    const halfVisible = Math.floor(maxVisiblePages / 2);

    let startPage = Math.max(1, currentPage - halfVisible);
    let endPage = Math.min(totalPages, currentPage + halfVisible);

    // Adjust if we're near the start or end
    if (currentPage <= halfVisible) {
      endPage = Math.min(totalPages, maxVisiblePages);
    }
    if (currentPage + halfVisible >= totalPages) {
      startPage = Math.max(1, totalPages - maxVisiblePages + 1);
    }

    // Add first page and ellipsis if needed
    if (startPage > 1) {
      pages.push(1);
      if (startPage > 2) {
        pages.push("...");
      }
    }

    // Add visible page numbers
    for (let i = startPage; i <= endPage; i++) {
      pages.push(i);
    }

    // Add ellipsis and last page if needed
    if (endPage < totalPages) {
      if (endPage < totalPages - 1) {
        pages.push("...");
      }
      pages.push(totalPages);
    }

    return pages;
  };

  const pageNumbers = getPageNumbers();

  const handlePageClick = (page: number) => {
    if (page >= 1 && page <= totalPages && page !== currentPage) {
      onPageChange(page);
    }
  };

  const startItem = totalItems
    ? (currentPage - 1) * (itemsPerPage || 0) + 1
    : null;
  const endItem = totalItems
    ? Math.min(currentPage * (itemsPerPage || 0), totalItems)
    : null;

  return (
    <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-between">
      {/* Results info */}
      {totalItems && itemsPerPage && (
        <div className="text-sm text-gray-400">
          Showing <span className="font-medium text-white">{startItem}</span> to{" "}
          <span className="font-medium text-white">{endItem}</span> of{" "}
          <span className="font-medium text-white">{totalItems}</span> results
        </div>
      )}

      {/* Pagination controls */}
      <div className="flex items-center gap-1">
        {/* First page button */}
        {showFirstLast && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handlePageClick(1)}
            disabled={currentPage === 1}
            className="h-9 w-9 p-0 text-gray-400 hover:text-white disabled:opacity-50"
            aria-label="Go to first page"
          >
            <ChevronsLeft className="size-4" />
          </Button>
        )}

        {/* Previous page button */}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => handlePageClick(currentPage - 1)}
          disabled={currentPage === 1}
          className="h-9 w-9 p-0 text-gray-400 hover:text-white disabled:opacity-50"
          aria-label="Go to previous page"
        >
          <ChevronLeft className="size-4" />
        </Button>

        {/* Page numbers */}
        <div className="flex items-center gap-1">
          {pageNumbers.map((page, index) => {
            if (page === "...") {
              return (
                <span
                  key={`ellipsis-${index}`}
                  className="flex h-9 w-9 items-center justify-center text-gray-400"
                >
                  ...
                </span>
              );
            }

            const pageNum = page as number;
            const isActive = pageNum === currentPage;

            return (
              <Button
                key={pageNum}
                variant={isActive ? "default" : "ghost"}
                size="sm"
                onClick={() => handlePageClick(pageNum)}
                className={`h-9 w-9 p-0 ${
                  isActive
                    ? "bg-blue-600 text-white hover:bg-blue-700"
                    : "text-gray-400 hover:text-white"
                }`}
                aria-label={`Go to page ${pageNum}`}
                aria-current={isActive ? "page" : undefined}
              >
                {pageNum}
              </Button>
            );
          })}
        </div>

        {/* Next page button */}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => handlePageClick(currentPage + 1)}
          disabled={currentPage === totalPages}
          className="h-9 w-9 p-0 text-gray-400 hover:text-white disabled:opacity-50"
          aria-label="Go to next page"
        >
          <ChevronRight className="size-4" />
        </Button>

        {/* Last page button */}
        {showFirstLast && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handlePageClick(totalPages)}
            disabled={currentPage === totalPages}
            className="h-9 w-9 p-0 text-gray-400 hover:text-white disabled:opacity-50"
            aria-label="Go to last page"
          >
            <ChevronsRight className="size-4" />
          </Button>
        )}
      </div>
    </div>
  );
}
