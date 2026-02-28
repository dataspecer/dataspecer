import { useState } from "react";
import { Button } from "./ui/button";
import { useTranslation } from "react-i18next";

type PaginationComponentProps<T> = {
  items: T[];
  itemsOnPageScalingFactor: number;
  totalItemCountText: string;
  itemCountOnPageText: string;
};


export function usePaginationComponent<T>() {
  const { t } = useTranslation();

  const [page, setPage] = useState<number>(1);
  const [itemCountPerPage, _setItemCountPerPage] = useState<number>(100);
  const [totalItemCount, setTotalItemCount] = useState<number>(0);
  const totalPageCount = Math.ceil(totalItemCount / itemCountPerPage);

  const PaginationComponent = ({ items, itemCountOnPageText, itemsOnPageScalingFactor, totalItemCountText }: PaginationComponentProps<T>) =>
  <div className="flex items-center justify-between">
    <div className="flex justify-center items-center text-sm">
      {t(totalItemCountText)}: {totalItemCount}
    </div>
    <div className="flex justify-center items-center pt-4 space-x-4">
      <Button
        variant="outline"
        onClick={() => setPage((prevPage) => prevPage - 1)}
        disabled={page === 1}
        className=""
      >
        Previous
      </Button>

      <span className="flex justify-center items-center text-sm">
        Page {page} of {totalPageCount}
      </span>

      <Button
        variant="outline"
        onClick={() => setPage((prevPage) => prevPage + 1)}
        disabled={page === totalPageCount}
        className=""
      >
        Next
      </Button>
    </div>
    <div className="flex justify-center items-center text-sm">
      {/* Per page: {itemCountPerPage * itemsOnPageScalingFactor} */}
      {t(itemCountOnPageText)}: {itemsOnPageScalingFactor * (items?.length ?? 0)}
    </div>
  </div>;

  return {
    PaginationComponent,
    page,
    itemCountPerPage,
    setTotalItemCount,
  };
}
