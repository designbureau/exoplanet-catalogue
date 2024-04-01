import { json } from "@remix-run/node";
import { loadXMLAsJSON } from "~/utils/loadXMLAsJSON";
import { useLoaderData } from "@remix-run/react";
import { fileURLToPath } from "url";
import path from "path";
import { useEffect, useContext, useState } from "react";
import { RefContext, RefProvider } from "~/components/RefContext";
import Binary from "~/components/Binary";
import Menu from "~/components/Menu";

export const loader = async ({ params }: any) => {
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
  const { filename } = params;

  const filePath = path.join(
    __dirname,
    "..",
    "data",
    "open_exoplanet_catalogue",
    "systems",
    `${filename}.xml`
  );

  const jsonData = await loadXMLAsJSON(filePath);

  return json(jsonData);
};

const Root = () => {
  const data = useLoaderData<any>();

  return (
    <RefProvider>
      <App data={data.system} />
    </RefProvider>
  );
};

const App = ({ data }: any) => {
  const { resetRefs } = useContext(RefContext);

  useEffect(() => {
    resetRefs();
  }, [data, resetRefs]);

  return (
    <RefProvider>
      <Menu data={data} />
      <Binary data={data} />
      {/* <pre>{JSON.stringify(data, null, 2)}</pre> */}
    </RefProvider>
  );
};

export default Root;
