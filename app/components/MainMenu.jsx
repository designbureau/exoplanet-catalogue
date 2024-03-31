import { useState, useEffect } from "react";

const MainMenu = ({ setData }) => {
  const [isLoading, setLoading] = useState(false);
  const [navActive, setNavActive] = useState(false);

  const [name, setName] = useState("");
  const [foundSystems, setFoundSystems] = useState(null);

  useEffect(() => {
    setLoading(true);
    fetch("https://exoplanet-api.vercel.app/api/systems/all")
      .then((res) => res.json())
      .then((data) => {
        setData(data);
        setFoundSystems(data);
        setLoading(false);
      });
  }, []);

  const navHandler = () => {
    setNavActive(!navActive);
  };

  const clickHandler = (system) => {
    setLoading(true);
    navHandler();
    fetch(`https://exoplanet-api.vercel.app/api/systems/${system}`)
      .then((res) => {
        if (res.ok) {
          return res.json();
        }
        throw new Error("Something went wrong");
      })
      .then((data) => {
        refs.current = new Array();
        setData(data.result.system);
        setLoading(false);
      })
      .catch((error) => {
        setLoading(false);
      });
  };

  const filter = (e) => {
    const keyword = e.target.value;

    if (keyword !== "") {
      const results = data.systems.filter((system) => {
        return system.toLowerCase().includes(keyword.toLowerCase());
      });
      setFoundSystems(results);
    } else {
      setFoundSystems(data.systems);
    }

    setName(keyword);
  };

  return (
    <nav className={`navigation ${navActive ? "active" : ""}`}>
      <button
        className={`navigationToggle ${navActive ? "active" : ""}`}
        onClick={() => {
          navHandler();
        }}
      >
        {navActive ? "Close" : "Menu"}
      </button>
      <ul>
        <li className="hasSubMenu">
          <span>Systems</span>

          <input
            type="search"
            value={name}
            onChange={filter}
            className="input filter"
            placeholder="Filter"
          />

          <ul className="subMenu">
            {
              foundSystems &&
                foundSystems.map((system) => {
                  return (
                    <li key={system}>
                      <button
                        onClick={() => {
                          clickHandler(system);
                        }}
                      >
                        {system}
                      </button>
                    </li>
                  );
                })
              // : data &&
              //   data.systems.map((system) => {
              //     return (
              //       <li key={system}>
              //         <button
              //           onClick={() => {
              //             clickHandler(system);
              //           }}
              //         >
              //           {system}
              //         </button>
              //       </li>
              //     );
              //   })}
            }
          </ul>
        </li>
      </ul>
    </nav>
  );
};

export default MainMenu;
