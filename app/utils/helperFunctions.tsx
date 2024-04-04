import { useContext } from "react";
import { EnvContext } from "~/components/EnvContext";

export const getSemimajoraxis = ({ data }: any) => {
  const { Constants } = useContext(EnvContext);

  // Extract the first semimajoraxis value, if it exists, and parse it as a float
  const semimajoraxisValue =
    data.semimajoraxis?.[0]?.["_"] ??
    data.semimajoraxis?.[0] ??
    data.semimajoraxis;

  // Parse the extracted value as a float, providing a default value of 10 if the result is NaN
  let semimajoraxis = parseFloat(semimajoraxisValue);
  semimajoraxis = isNaN(semimajoraxis) ? Constants.distance.au : semimajoraxis;

  // semimajoraxis = semimajoraxis * Constants.distance.au;

  return semimajoraxis;
};
