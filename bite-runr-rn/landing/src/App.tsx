import { useState } from "react";
import SplashIntro from "./components/SplashIntro";
import Hero from "./components/Hero";
import HowItWorks from "./components/HowItWorks";
import Features from "./components/Features";
import SocialProof from "./components/SocialProof";
import Payments from "./components/Payments";
import Footer from "./components/Footer";

function App() {
  const [splashDone, setSplashDone] = useState(false);

  return (
    <div className="h-screen overflow-y-auto snap-y snap-mandatory bg-black text-white">
      {!splashDone && <SplashIntro onComplete={() => setSplashDone(true)} />}
      <Hero />
      <HowItWorks />
      <Features />
      <SocialProof />
      <Payments />
      <Footer />
    </div>
  );
}

export default App;
