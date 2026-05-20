import Icon from "Common/UI/Components/Icon/Icon";
import IconProp from "Common/Types/Icon/IconProp";
import React, { ReactElement, useEffect, useState } from "react";

const DarkModeToggle: () => JSX.Element = (): ReactElement => {
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    return document.documentElement.classList.contains("dark");
  });

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add("dark");
      localStorage.setItem("theme", "dark");
    } else {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("theme", "light");
    }
  }, [isDarkMode]);

  return (
    <div className="relative ml-1 flex-shrink-0">
      <button
        type="button"
        className="flex items-center justify-center h-9 w-9 rounded-lg bg-gray-50 border border-gray-200 hover:bg-gray-100 hover:border-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-1 transition-all duration-150"
        onClick={() => {
          setIsDarkMode(!isDarkMode);
        }}
      >
        {isDarkMode ? (
          <Icon className="h-5 w-5 text-yellow-500" icon={IconProp.Sun} />
        ) : (
          <Icon className="h-5 w-5 text-gray-500" icon={IconProp.Moon} />
        )}
      </button>
    </div>
  );
};

export default DarkModeToggle;
