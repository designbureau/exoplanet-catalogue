import { Outlet } from "@remix-run/react";
import SystemMenu from "~/components/SystemMenu";

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

  return (
    <div className="flex items-start">
      <aside className="max-w-[300px] w-full h-svh overflow-y-auto">
        <SystemMenu xmlFiles={xmlFiles} />
      </aside>
      <main className="w-full">
        <Outlet />
      </main>
    </div>
  );
}
