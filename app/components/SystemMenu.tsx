import { useState } from "react";
import { Link, useNavigate } from "react-router";

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
    <div className="flex flex-col h-full">
      <div className="p-2">
        <input
          type="text"
          placeholder="Search systems..."
          value={searchQuery}
          onChange={(e) => {
            setSearchQuery(e.target.value);
            setActiveIndex(-1);
          }}
          onKeyDown={handleKeyPress}
          className="w-full px-2.5 py-1.5 text-xs rounded bg-white/5 border border-white/10 outline-none focus:border-cyan-400 text-white placeholder:text-muted-foreground"
          autoFocus
        />
      </div>
      <ul className="overflow-y-auto flex-1 px-1 pb-2" style={{ scrollbarWidth: 'thin' }}>
        {filteredFiles.map((fileName: string, index: number) => (
          <li key={fileName}>
            <Link
              to={`/system/${encodeURIComponent(fileName.replace(".xml", ""))}`}
              onClick={() => setNavActive()}
              className={`block px-2 py-0.5 text-xs rounded transition-colors outline-none ${
                index === activeIndex
                  ? "bg-cyan-400/20 text-cyan-400"
                  : "text-muted-foreground hover:text-white hover:bg-white/5"
              }`}
            >
              {fileName.replace(".xml", "")}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default SystemMenu;
