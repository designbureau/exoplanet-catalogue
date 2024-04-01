import { Link } from "@remix-run/react";
import { useLoaderData } from "@remix-run/react";
import { getXmlFilesList } from "~/utils/getXmlFilesList";
import { json } from "@remix-run/node";

export const loader = async () => {
  const xmlFiles = await getXmlFilesList(); // Fetch the list of XML files
  return json({ xmlFiles });
};

const SystemMenu = () => {
  const { xmlFiles } = useLoaderData<any>(); // Access the loader data

  return (
    <ul>
      {xmlFiles.map((fileName: string) => (
        <li key={fileName}>
          <Link to={`/system/${fileName.replace(".xml", "")}`}>
            {fileName.replace(".xml", "")}
          </Link>
        </li>
      ))}
    </ul>
  );
};

export default SystemMenu;
