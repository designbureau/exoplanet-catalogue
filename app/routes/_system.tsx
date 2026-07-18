import { Outlet, useLoaderData } from "react-router";
import { getXmlFilesList } from "~/utils/getXmlFilesList";
import { SiteHeader } from "~/components/SiteHeader";

export const loader = async () => {
  const xmlFiles = await getXmlFilesList();
  return { xmlFiles };
};

interface LoaderData {
  xmlFiles: string[];
}

export default function SystemsLayout() {
  const { xmlFiles } = useLoaderData<LoaderData>();

  return (
    <div className="relative w-full h-screen overflow-hidden">
      {/* Persistent header floats over the 3D scene; its search replaces the
          old left-hand sidebar menu. */}
      <SiteHeader xmlFiles={xmlFiles} variant="fixed" />

      <main className="w-full h-full">
        <Outlet />
      </main>
    </div>
  );
}
