import { useContext } from "react";
import { RefContext } from "./RefContext";

const Menu = ({ data }) => {
  if (!data) return;

  // console.log({ data });

  const { refs } = useContext(RefContext);

  const handleClick = (name) => {
    console.log(`${name} ref`, refs[name]);
  };

  const generateMenuItems = (items, isBinary) => {
    // console.log({ items });

    return items.map((item, index) => {
      const name = item.name ? item.name[0] : "Unnamed";
      let children = [];
      if (item.binary) {
        children = [...item.binary, ...children];
      }
      if (item.star) {
        children = [...item.star, ...children];
      }
      if (item.planet) {
        children = [...item.planet, ...children];
      }
      // if (item.satellite) {
      //   children = [...item.satellite, ...children];
      // }
      return (
        <ul key={index} className="ml-3">
          <li className="cursor-pointer" onClick={() => handleClick(name)}>
            {name}
          </li>
          {children.length > 0 && generateMenuItems(children, true)}
        </ul>
      );
    });
  };

  return (
    <nav className="fixed right-0 bottom-0 z-10 system-nav">
      <ul>
        {data.star
          ? generateMenuItems(data.star)
          : generateMenuItems(data.binary, true)}
      </ul>
    </nav>
  );

  // return (
  //   <nav>
  //     <ul>{generateMenuItems(data.binary)}</ul>
  //   </nav>
  // );
};

export default Menu;
