import { useContext } from "react";
import { RefContext } from "./RefContext";

const Menu = ({ data }) => {
  if (!data) return;

  const { setActiveByName, refs, activeMenuItem } = useContext(RefContext);

  const handleClick = (name, type) => {
    const uniqueKey = `${type}-${name}`;
    setActiveByName(name, type);
    const elementRef = refs[uniqueKey];
    if (elementRef && elementRef.current) {
      console.log(elementRef.current);
    }
  };

  const generateMenuItems = (items, type) => {
    return items.map((item, index) => {
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
        <ul key={`${type}-${name}`} className="ml-3">
          <li
            className={`cursor-pointer ${isActive ? "text-red-500" : ""}`}
            data-name={`${type}-${name}`}
            onClick={() => handleClick(name, type)}
          >
            {name}
          </li>
          {children.length > 0 && <>{children}</>}
        </ul>
      );
    });
  };

  return (
    <nav className="fixed right-0 bottom-0 z-10 system-nav">
      <ul>
        {data.planet && generateMenuItems(data.planet, "planet")}
        {data.star && generateMenuItems(data.star, "star")}
        {data.binary && generateMenuItems(data.binary, "binary")}
      </ul>
    </nav>
  );
};

export default Menu;
