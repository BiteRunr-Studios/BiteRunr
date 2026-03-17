import { useState } from "react";
import SplashIntro from "./components/SplashIntro";
import Hero from "./components/Hero";
import HowItWorks from "./components/HowItWorks";
import Features from "./components/Features";
import Payments from "./components/Payments";
import Footer from "./components/Footer";

type AppProps = {
  waitlistEnabled: boolean;
};

function App({ waitlistEnabled }: AppProps) {
  const [splashDone, setSplashDone] = useState(false);

  return (
    <div className="h-screen overflow-y-auto bg-black text-white">
      {!splashDone && <SplashIntro onComplete={() => setSplashDone(true)} />}
      <Hero waitlistEnabled={waitlistEnabled} />
      <HowItWorks />
      <Features />
      <Payments />
      <Footer waitlistEnabled={waitlistEnabled} />
    </div>
  );
}

export default App;
