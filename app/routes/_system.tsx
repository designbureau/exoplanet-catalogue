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

  return (
    <div className="relative w-full h-screen overflow-hidden">
      {/* Menu toggle */}
      <button
        className="fixed top-2 left-2 z-50 px-3 py-1.5 text-xs rounded-md bg-black/60 backdrop-blur-sm text-muted-foreground hover:text-cyan-400 transition-colors"
        onClick={() => setNavActive(!navActive)}
      >
        {navActive ? "Close" : "Menu"}
      </button>

      {/* Sidebar */}
      {navActive && (
        <aside className="fixed top-10 left-2 z-40 w-64 max-h-[85vh] rounded-md bg-black/70 backdrop-blur-sm border border-white/10 overflow-hidden">
          <SystemMenu xmlFiles={xmlFiles} setNavActive={() => setNavActive(false)} />
        </aside>
      )}

      <main className="w-full h-full">
        <Outlet />
      </main>
    </div>
  );
}
