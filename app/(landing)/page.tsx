import { Navbar } from "@/components/Navbar";
import { Hero } from "@/components/Hero";
import { ScannerTicker } from "@/components/animations/ScannerTicker";
import { OsintIntro } from "@/components/OsintIntro";
import { Manifesto } from "@/components/Manifesto";
import { Problems } from "@/components/Problems";
import { Capabilities } from "@/components/Capabilities";
import { Method } from "@/components/Method";
import { Closing } from "@/components/Closing";
import { Footer } from "@/components/Footer";

export default function Home() {
  return (
    <>
      <Navbar />
      <main className="relative z-base">
        <Hero />
        <ScannerTicker />
        <OsintIntro />
        <Manifesto />
        <Problems />
        <Capabilities />
        <Method />
        <Closing />
      </main>
      <Footer />
    </>
  );
}
