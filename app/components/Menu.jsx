import { useContext } from "react";
import { RefContext } from "./RefContext";

const Menu = ({ data }) => {
  if (!data) return;

  const { setActiveByName, refs } = useContext(RefContext);

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
      const name = item.name ? item.name[0] : "Unnamed";

      let children = [];
      if (item.binary) {
        children = [...children, ...generateMenuItems(item.binary, "binary")];
      } else if (item.star) {
        children = [...children, ...generateMenuItems(item.star, "star")];
      } else if (item.planet) {
        children = [...children, ...generateMenuItems(item.planet, "planet")];
      }

      return (
        <ul key={index} className="ml-3">
          <li
            className="cursor-pointer"
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
        {data.binary && generateMenuItems(data.binary, "binary")}
        {data.star && generateMenuItems(data.star, "star")}
        {data.planet && generateMenuItems(data.planet, "planet")}
      </ul>
    </nav>
  );
};

export default Menu;
