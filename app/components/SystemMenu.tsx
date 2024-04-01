import { Link } from "@remix-run/react";

const SystemMenu = ({ xmlFiles }: any) => {
  return (
    <ul>
      {xmlFiles.map((fileName: string) => (
        <li key={fileName}>
          <Link
            to={`/system/${encodeURIComponent(fileName.replace(".xml", ""))}`}
          >
            {fileName.replace(".xml", "")}
          </Link>
        </li>
      ))}
    </ul>
  );
};

export default SystemMenu;
