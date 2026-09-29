import React from "react";
import LoadingState from "@/pages/errorPage/LoadingState";

/**
 * Legacy Loader wrapper pointing to modern LoadingState component
 */
const Loader = ({ text, message, fullScreen = true, ...props }) => {
  return (
    <LoadingState
      message={text || message || "Loading information..."}
      fullPage={fullScreen}
      {...props}
    />
  );
};

export default Loader;
