import { Outlet } from "@remix-run/react";
import SystemMenu from "~/components/SystemMenu";
import { useState } from "react";
import { useLoaderData } from "@remix-run/react";
import { getXmlFilesList } from "~/utils/getXmlFilesList";
import { json } from "@remix-run/node";

export const loader = async () => {
  const xmlFiles = await getXmlFilesList();
  return json({ xmlFiles });
};

interface LoaderData {
  xmlFiles: string[];
}

export default function SystemsLayout() {
  const { xmlFiles } = useLoaderData<LoaderData>();

  const [navActive, setNavActive] = useState<boolean>(false);

  const navHandler = () => {
    setNavActive(!navActive);
  };

  return (
    <div className="flex items-start">
      <aside className={`navigation ${navActive ? "active" : ""}`}>
        <button
          className={`navigationToggle ${navActive ? "active" : ""}`}
          onClick={() => {
            navHandler();
          }}
        >
          {navActive ? "Close" : "Menu"}
        </button>
        <SystemMenu xmlFiles={xmlFiles} setNavActive={setNavActive} />
      </aside>
      <main className="w-full h-svh flex justify-center items-center">
        <Outlet />
      </main>
    </div>
  );
}
