import { useContext } from "react";
import { RefContext } from "./RefContext";

const Menu = ({ data }) => {
  if (!data) return null;

  const { setActiveByName, activeMenuItem } = useContext(RefContext);

  const handleClick = (name, type) => {
    setActiveByName(name, type);
  };

  const generateMenuItems = (items, type) => {
    return items.map((item) => {
      const name = item.name ? item.name[0] : "";

      let children = [];
      if (item.binary) {
        children = [...children, ...generateMenuItems(item.binary, "binary")];
      }
      if (item.star) {
        children = [...children, ...generateMenuItems(item.star, "star")];
      }
      if (item.planet) {
        children = [...children, ...generateMenuItems(item.planet, "planet")];
      }

      const uniqueKey = `${type}-${name}`;
      const isActive = uniqueKey === activeMenuItem;

      return (
        <li key={uniqueKey}>
          <button
            className={`block w-full text-right px-1 py-0.5 text-[11px] rounded transition-colors ${
              isActive
                ? "text-cyan-400"
                : "text-muted-foreground hover:text-white"
            }`}
            data-name={`${type}-${name}`}
            onClick={() => handleClick(name, type)}
          >
            {name}
          </button>
          {children.length > 0 && <ul className="ml-2">{children}</ul>}
        </li>
      );
    });
  };

  return (
    <nav className="fixed right-2 bottom-2 z-10 rounded-md bg-black/60 backdrop-blur-sm px-2 py-1.5 max-h-[40vh] overflow-y-auto" style={{ scrollbarWidth: 'thin' }}>
      <ul>
        {data.star && generateMenuItems(data.star, "star")}
        {data.binary && generateMenuItems(data.binary, "binary")}
        {data.planet && generateMenuItems(data.planet, "planet")}
      </ul>
    </nav>
  );
};

export default Menu;
