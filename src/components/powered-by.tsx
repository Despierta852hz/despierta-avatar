import React from "react";
import cx from "@/utils/cx";

const PoweredBy = () => {
  return (
    <div
      className={cx(
        "flex justify-center items-center py-4",
      )}
    >
      <a
        href="https://upstash.com/"
        target="_blank"
        rel="noopener noreferrer"
        className="text-sm text-gray-500 hover:text-gray-700"
      >
        Powered by Upstash
      </a>
    </div>
  );
};

export default PoweredBy;
