import { Composition } from "remotion";
import { PerkyjobsPitch } from "./PerkyjobsPitch";

export const RemotionRoot: React.FC = () => {
  return (
    <Composition
      id="PerkyjobsPitch"
      component={PerkyjobsPitch}
      durationInFrames={1200}
      fps={30}
      width={1920}
      height={1080}
    />
  );
};
