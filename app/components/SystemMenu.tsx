import { Link } from "@remix-run/react";

const SystemMenu = ({ xmlFiles, setNavActive }: any) => {
  return (
    <nav className="h-svh overflow-y-auto">
      <ul>
        {xmlFiles.map((fileName: string) => (
          <li key={fileName}>
            <Link
              to={`/system/${encodeURIComponent(fileName.replace(".xml", ""))}`}
              onClick={() => setNavActive()}
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
