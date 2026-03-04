import { useState } from "react";
import { Button } from "./ui/button";
import { useTranslation } from "react-i18next";

type PaginationComponentProps<T> = {
  items: T[];
  itemsOnPageScalingFactor: number;
  totalItemCountText: string;
  itemCountOnPageText: string;
  isPageNumberingExact: boolean;
};


export function usePaginationComponent<T>() {
  const { t } = useTranslation();

  const [isLastPageBasedOnServerResponse, setIsLastPageBasedOnServerResponse] = useState<boolean>(false);
  const [pageOnFrontend, setPageOnFrontend] = useState<number>(1);
  const [trackedPageOnBackend, setTrackedPageOnBackend] = useState<number>(1);
  const [itemCountPerPage, _setItemCountPerPage] = useState<number>(100);
  const [totalItemCount, setTotalItemCount] = useState<number>(0);
  const totalPageCount = Math.ceil(totalItemCount / itemCountPerPage);

  const PaginationComponent = ({ items, itemCountOnPageText, itemsOnPageScalingFactor, totalItemCountText, isPageNumberingExact }: PaginationComponentProps<T>) =>
    <div className="flex items-center justify-between">
      <div className="flex justify-center items-center text-sm">
        {t(totalItemCountText)}: {totalItemCount}
      </div>
      <div className="flex justify-center items-center pt-4 space-x-4">
        <Button
          variant="outline"
          onClick={() => {
            setPageOnFrontend((prevPage) => prevPage - 1);
            setTrackedPageOnBackend((prevPage) => prevPage - 1);
          }}
          disabled={pageOnFrontend === 1 || totalItemCount === 0}
          className=""
        >
          Previous
        </Button>

        <span className="flex justify-center items-center text-sm">
          Page {pageOnFrontend} {isPageNumberingExact ? `of ${totalItemCount === 0 ? 1 : totalPageCount}` : ""}
        </span>

        <Button
          variant="outline"
          onClick={() => {
            setPageOnFrontend((prevPage) => prevPage + 1);
            setTrackedPageOnBackend((prevPage) => prevPage + 1);
          }}
          disabled={(isPageNumberingExact && pageOnFrontend === totalPageCount) || totalItemCount === 0 || isLastPageBasedOnServerResponse}
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
    pageOnFrontend,
    trackedPageOnBackend,
    setTrackedPageOnBackend,
    setIsLastPageBasedOnServerResponse,
    itemCountPerPage,
    setTotalItemCount,
  };
}
