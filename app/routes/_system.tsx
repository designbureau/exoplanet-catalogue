import { Outlet, useLoaderData } from "react-router";
import SystemMenu from "~/components/SystemMenu";
import { useState } from "react";
import { getXmlFilesList } from "~/utils/getXmlFilesList";

export const loader = async () => {
  const xmlFiles = await getXmlFilesList();
  return { xmlFiles };
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
          className={`navigationToggle outline-none ${
            navActive ? "active" : ""
          }`}
          onClick={() => {
            navHandler();
          }}
        >
          {navActive ? "Close" : "Menu"}
        </button>
        <SystemMenu xmlFiles={xmlFiles} setNavActive={setNavActive} />
      </aside>
      <main className="w-full">
        <Outlet />
      </main>
    </div>
  );
}
