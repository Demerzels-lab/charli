import { Navbar } from "@/components/Navbar";
import { Hero } from "@/components/Hero";
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
