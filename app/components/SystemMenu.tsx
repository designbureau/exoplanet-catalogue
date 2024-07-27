import { useState } from "react";
import { Link, useNavigate } from "@remix-run/react";

const SystemMenu = ({ xmlFiles, setNavActive }: any) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(-1);
  const navigate = useNavigate();

  const filteredFiles = xmlFiles.filter((fileName: string) =>
    fileName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && activeIndex >= 0) {
      const fileName = filteredFiles[activeIndex];
      navigate(`/system/${encodeURIComponent(fileName.replace(".xml", ""))}`);
      setNavActive();
    } else if (e.key === "ArrowDown") {
      setActiveIndex((prevIndex) =>
        prevIndex < filteredFiles.length - 1 ? prevIndex + 1 : prevIndex
      );
    } else if (e.key === "ArrowUp") {
      setActiveIndex((prevIndex) => (prevIndex > 0 ? prevIndex - 1 : -1));
    }
  };

  return (
    <nav className="h-svh overflow-y-auto">
      <input
        type="text"
        placeholder="Search files..."
        value={searchQuery}
        onChange={(e) => {
          setSearchQuery(e.target.value);
          setActiveIndex(-1); // Reset active index on query change
        }}
        onKeyDown={handleKeyPress}
        className="w-full p-2 border outline-none border-[rgba(255,255,255,0.25)] focus:border-cyan-400 sticky top-0 bg-[rgba(255,255,255,0.1)]"
      />
      <ul>
        {filteredFiles.map((fileName: string, index: number) => (
          <li
            key={fileName}
            className={index === activeIndex ? "bg-cyan-400 text-black" : ""}
          >
            <Link
              to={`/system/${encodeURIComponent(fileName.replace(".xml", ""))}`}
              onClick={() => setNavActive()}
              className="focus:bg-cyan-400 focus:text-black outline-none block"
            >
              {fileName.replace(".xml", "")}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
};

export default SystemMenu;
